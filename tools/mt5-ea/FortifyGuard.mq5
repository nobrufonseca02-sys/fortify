//+------------------------------------------------------------------+
//|                                                  FortifyGuard.mq5 |
//|                         Fortify Guard: as regras da sua mesa,      |
//|                         ao vivo na tela do MetaTrader 5.           |
//|                                                                    |
//| O EA NAO opera sozinho. Ele mostra quanto falta para cada regra   |
//| da mesa vinculada a conta no Fortify, avisa em popup quando o     |
//| limite se aproxima e oferece um botao para fechar as posicoes,    |
//| que so age depois da confirmacao do trader.                       |
//|                                                                    |
//| A cada consulta o EA envia ao Fortify o saldo, a equity e o P&L    |
//| fechado por dia (na hora da mesa) deste terminal. O Fortify roda  |
//| regras e devolve um valor de referencia por regra (equity minima  |
//| do dia, piso do drawdown, saldo da meta, teto de lucro de hoje).  |
//| Entre consultas o EA compara a equity de agora com esse valor.    |
//+------------------------------------------------------------------+
#property copyright "Fortify"
#property link      "https://fortify-delta.vercel.app"
#property version   "1.80"
#property description "Fortify Terminal: Inteligencia Preditiva & Gestao de Risco. Regras da mesa ao vivo, leitura institucional (SMC) e execucao com risco calculado."

#include <Trade\Trade.mqh>
#resource "fortify_alert.wav"

enum GuardTheme
  {
   GUARD_THEME_AUTO  = 0, // Automático (pela cor do gráfico)
   GUARD_THEME_DARK  = 1, // Escuro
   GUARD_THEME_LIGHT = 2  // Claro
  };

enum GuardCorner
  {
   GUARD_RIGHT = 0, // Direita
   GUARD_LEFT  = 1  // Esquerda
  };

input string      InpToken      = "";                                  // Chave do EA (gerada no Fortify)
input string      InpGatewayUrl = "https://137-131-175-251.sslip.io";  // Endereço do Fortify
input GuardCorner InpCorner     = GUARD_RIGHT;                         // Lado do painel
input bool        InpPush       = false;                               // Avisar também no celular (MetaQuotes ID)
input bool        InpPreview    = false;                               // Modo demonstração (dados de exemplo, sem chave)
input GuardTheme  InpTheme      = GUARD_THEME_AUTO;                    // Tema do painel
input int         InpSimStopPoints = 200;                              // Simulador de lote: stop padrão (pontos)
input bool        InpSound      = true;                                // Som do Fortify no nível crítico
input bool        InpPreviewStress = false;                            // Demonstração: mostrar um dia perto do limite
input double      InpMkRisk     = 0;                                   // Mercado: quanto arriscar (0 = 1% do saldo)
input double      InpMkStopAtr  = 1.0;                                 // Mercado: stop em ATR do H1
input double      InpMkRR       = 2.0;                                 // Mercado: alvo = stop x este valor

#define GUARD_VERSION "1.72"
#define PFX           "FG_"
#define PANEL_W       360
#define PAD           14
#define MAX_DAYS_SENT 400

//--- cores
// Cores que mudam com o tema (ver ApplyTheme); as de nivel sao iguais nos dois.
color C_BG      = C'14,16,20';
color C_BORDER  = C'42,47,56';
color C_TEXT    = C'236,239,244';
color C_MUTED   = C'134,142,156';
color C_TRACK   = C'32,36,44';
color C_HEADING = C'160,168,182';
color C_ERRBG   = C'48,22,24';
color C_TABON   = C'40,46,58';
bool  g_light   = false;
#define C_OK       C'38,166,91'
#define C_WARN     C'240,180,41'
#define C_CRIT     C'245,124,0'
#define C_BREACH   C'229,57,53'
#define C_INFO     C'96,125,255'

struct GuardRule
  {
   string            key;
   string            label;
   string            kind;
   string            status;
   string            metric;
   string            trailing;
   string            message;
   string            mode;         // close: weekly|daily  lots: total|per_order
   string            group;        // account|payout|reminder
   double            param1;       // close: minuto do dia do fechamento
   bool              hasParam1;
   double            limit;
   double            floorValue;
   double            floorMax;
   double            targetBalance;
   double            dayStart;
   double            todayCap;
   double            regularize;
   double            current;
   double            required;
   bool              hasLimit;
   bool              hasFloor;
   bool              hasFloorMax;
   bool              hasTarget;
   bool              hasDayStart;
   bool              hasCap;
   bool              hasRegularize;
   bool              hasCurrent;
   bool              hasRequired;
   int               alertLevel;   // maior nivel ja avisado hoje (0 nenhum, 1 atencao, 2 critico, 3 limite)
   double            pct;          // calculado ao vivo
   int               level;        // calculado ao vivo
   string            valueText;    // calculado ao vivo (texto inteiro, usado nos avisos)
   string            valuePre;     // parte apagada do valor no painel ("folga")
   string            valueMain;    // parte forte do valor no painel ("$3.900")
   bool              valueDone;    // cumprido: mostra o selo de check
   string            detailText;   // calculado ao vivo
   double            slack;        // folga em dinheiro ate quebrar (floor e floating)
   bool              hasSlack;
  };

// Todas as regras da mesa, para a aba Configurações (linhas O| do Fortify).
struct GuardOption
  {
   string            key;
   string            label;
   string            group;
   bool              live;
   bool              on;
   string            detail;       // valor da regra nesta conta, já calculado: "6% ($6.000)"
  };

GuardRule   g_rules[];
GuardOption g_options[];
bool        g_pendingSave = false;  // escolha feita no MT5 ainda não enviada ao Fortify
string      g_expanded = "";        // regra com o detalhe aberto no painel
string    g_firm = "", g_program = "", g_size = "", g_currency = "USD", g_overall = "", g_stage = "";
string    g_error = "", g_notice = "";
double    g_warnPct = 70.0, g_critPct = 85.0;
int       g_pollSeconds = 15;
datetime  g_lastPoll = 0, g_lastOk = 0;
string    g_utcDay = "";         // dia de hoje no calendario da mesa
string    g_dayBasis = "utc";    // calendario: utc, server ou fuso+minuto da virada
int       g_dayReset = 0;        // minuto do dia em que a mesa vira o dia
long      g_dayEpochs[];         // trocas de fuso: instante UTC
int       g_dayOffsets[];        // trocas de fuso: minutos a somar ao UTC
bool      g_collapsed = false;
bool      g_hasFeed = false;
double    g_peakEquity = 0.0;
string    g_used[];
bool      g_previewShot = false;
int       g_previewEnd = 0;       // demonstração: 1 rolou até o fim, 2 print do fim salvo
uint      g_startTick = 0;
datetime  g_lastTradesSent = 0;
bool      g_tradesDirty = true;
double    g_todayClosed = 0.0;   // P&L fechado de hoje, do historico do terminal
double    g_balanceNow = 0.0, g_equityNow = 0.0;
uint      g_repollAt = 0;        // nova consulta logo depois de uma operação
string    g_tab = "painel";       // aba ativa: painel | regras | config
int       g_simStop = 200;        // simulador de lote: stop em pontos
CTrade    g_trade;

void ResetRule(GuardRule &r)
  {
   r.key = ""; r.label = ""; r.kind = ""; r.status = ""; r.metric = ""; r.trailing = ""; r.message = "";
   r.mode = ""; r.group = ""; r.param1 = 0; r.hasParam1 = false;
   r.limit = 0; r.floorValue = 0; r.floorMax = 0; r.targetBalance = 0; r.dayStart = 0;
   r.todayCap = 0; r.regularize = 0; r.current = 0; r.required = 0;
   r.hasLimit = false; r.hasFloor = false; r.hasFloorMax = false; r.hasTarget = false; r.hasDayStart = false;
   r.hasCap = false; r.hasRegularize = false; r.hasCurrent = false; r.hasRequired = false;
   r.alertLevel = 0; r.pct = 0; r.level = 0; r.valueText = ""; r.detailText = "";
   r.valuePre = ""; r.valueMain = ""; r.valueDone = false;
   r.slack = 0; r.hasSlack = false;
  }

//--- paleta do painel desenhado em pixels (ARGB)
uint P_BG, P_CARD, P_BORDER, P_TEXT, P_MUTED, P_TRACK, P_FIELD, P_TABON, P_TOGGLEOFF;
const uint P_OK     = (uint)0xFF2FBF71;
const uint P_WARN   = (uint)0xFFF0B429;
const uint P_CRIT   = (uint)0xFFF57C00;
const uint P_BREACH = (uint)0xFFE5484D;
const uint P_INFO   = (uint)0xFF3D7BFA;
const uint P_WHITE  = (uint)0xFFFFFFFF;

void ApplyPalette()
  {
   if(g_light)
     {
      P_BG = (uint)0xFFFBFBFD; P_CARD = (uint)0xFFF1F3F7; P_BORDER = (uint)0xFFDCE0E7; P_TEXT = (uint)0xFF151922;
      P_MUTED = (uint)0xFF657082; P_TRACK = (uint)0xFFE3E7EE; P_FIELD = (uint)0xFFFFFFFF; P_TABON = (uint)0xFFFFFFFF;
      P_TOGGLEOFF = (uint)0xFFC9CFD9;
     }
   else
     {
      P_BG = (uint)0xFF0F1115; P_CARD = (uint)0xFF171A21; P_BORDER = (uint)0xFF262B34; P_TEXT = (uint)0xFFF3F5F8;
      P_MUTED = (uint)0xFF8B94A4; P_TRACK = (uint)0xFF242932; P_FIELD = (uint)0xFF1D2129; P_TABON = (uint)0xFF2A303B;
      P_TOGGLEOFF = (uint)0xFF3A404C;
     }
  }

bool IsLightChart()
  {
   color bg = (color)ChartGetInteger(0, CHART_COLOR_BACKGROUND);
   int r = (int)(bg & 0xFF), g = (int)((bg >> 8) & 0xFF), b = (int)((bg >> 16) & 0xFF);
   return (r * 299 + g * 587 + b * 114) / 1000 > 128;
  }

void ApplyTheme()
  {
   g_light = (InpTheme == GUARD_THEME_LIGHT) || (InpTheme == GUARD_THEME_AUTO && IsLightChart());
   if(g_light)
     {
      C_BG = C'250,250,252'; C_BORDER = C'214,218,226'; C_TEXT = C'22,26,34'; C_MUTED = C'100,108,122';
      C_TRACK = C'230,233,240'; C_HEADING = C'88,96,110'; C_ERRBG = C'253,236,236'; C_TABON = C'226,232,244';
     }
   else
     {
      C_BG = C'14,16,20'; C_BORDER = C'42,47,56'; C_TEXT = C'236,239,244'; C_MUTED = C'134,142,156';
      C_TRACK = C'32,36,44'; C_HEADING = C'160,168,182'; C_ERRBG = C'48,22,24'; C_TABON = C'40,46,58';
     }
   ApplyPalette();
  }

string PeakVarName()
  {
   return "FortifyGuard_peak_" + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));
  }

//+------------------------------------------------------------------+
//| Utilidades                                                        |
//+------------------------------------------------------------------+
string UtcDayKey(const datetime utc)
  {
   MqlDateTime t;
   TimeToStruct(utc, t);
   return StringFormat("%04d-%02d-%02d", t.year, t.mon, t.day);
  }

// Diferenca entre o servidor e o UTC, arredondada para meia hora (o relogio oscila segundos).
long ServerOffset()
  {
   return (long)MathRound((double)(TimeTradeServer() - TimeGMT()) / 1800.0) * 1800;
  }

int ZoneOffsetAt(const datetime utc)
  {
   int minutes = 0;
   for(int i = 0; i < ArraySize(g_dayEpochs); i++)
      if((long)utc >= g_dayEpochs[i])
         minutes = g_dayOffsets[i];
   return minutes;
  }

// Dia de um instante no calendario da mesa. Recebe a hora do servidor, como vem nos negocios.
string FirmDayKey(const datetime serverTime, const long offset)
  {
   if(g_dayBasis == "server")
      return UtcDayKey(serverTime);
   datetime utc = (datetime)(serverTime - offset);
   if(g_dayBasis == "utc")
      return UtcDayKey(utc);
   return UtcDayKey((datetime)(utc + (ZoneOffsetAt(utc) - g_dayReset) * 60));
  }

string FirmToday()
  {
   return FirmDayKey(TimeTradeServer(), ServerOffset());
  }

string Trimmed(string s)
  {
   StringTrimLeft(s);
   StringTrimRight(s);
   return s;
  }

string BaseUrl()
  {
   string url = Trimmed(InpGatewayUrl);
   while(StringLen(url) > 0 && StringSubstr(url, StringLen(url) - 1) == "/")
      url = StringSubstr(url, 0, StringLen(url) - 1);
   return url;
  }

string CurrencySymbol()
  {
   if(g_currency == "USD") return "$";
   if(g_currency == "BRL") return "R$";
   if(g_currency == "EUR") return "€";
   if(g_currency == "GBP") return "£";
   return g_currency + " ";
  }

// 1234567.5 -> "1.234.567,50"
string FormatNumber(const double value)
  {
   string raw = DoubleToString(MathAbs(value), 2);
   int dot = StringFind(raw, ".");
   string intPart = (dot >= 0) ? StringSubstr(raw, 0, dot) : raw;
   string decPart = (dot >= 0) ? StringSubstr(raw, dot + 1) : "00";
   string grouped = "";
   int len = StringLen(intPart);
   for(int i = 0; i < len; i++)
     {
      if(i > 0 && (len - i) % 3 == 0)
         grouped += ".";
      grouped += StringSubstr(intPart, i, 1);
     }
   return (value < 0 ? "-" : "") + grouped + "," + decPart;
  }

string Money(const double value)
  {
   return (value < 0 ? "-" : "") + CurrencySymbol() + FormatNumber(MathAbs(value));
  }

// Valor redondo para o painel: 3899.6 -> "$3.900".
string MoneyShort(const double value)
  {
   string raw = DoubleToString(MathRound(MathAbs(value)), 0);
   string grouped = "";
   int len = StringLen(raw);
   for(int i = 0; i < len; i++)
     {
      if(i > 0 && (len - i) % 3 == 0)
         grouped += ".";
      grouped += StringSubstr(raw, i, 1);
     }
   return (value <= -0.5 ? "-" : "") + CurrencySymbol() + grouped;
  }

// Valor da regra no painel: parte apagada ("folga") + número forte ("$3.900").
void SetValue(GuardRule &r, const string pre, const string main, const bool done = false)
  {
   r.valuePre = pre;
   r.valueMain = main;
   r.valueDone = done;
   r.valueText = (pre != "") ? pre + " " + main : main;
  }

// Regra aparece no painel? Sem a lista de opções (Fortify antigo), mostra tudo.
bool RuleVisible(const int i)
  {
   for(int o = 0; o < ArraySize(g_options); o++)
      if(g_options[o].key == g_rules[i].key)
         return g_options[o].on;
   return true;
  }

string JsonSafe(string s)
  {
   StringReplace(s, "\\", "");
   StringReplace(s, "\"", "'");
   return s;
  }

bool ParseNum(const string s, double &out)
  {
   if(StringLen(s) == 0)
      return false;
   out = StringToDouble(s);
   return true;
  }

color LevelColor(const int level)
  {
   if(level >= 3) return C_BREACH;
   if(level == 2) return C_CRIT;
   if(level == 1) return C_WARN;
   return C_OK;
  }

int LevelFor(const double pct)
  {
   if(pct >= 100.0) return 3;
   if(pct >= g_critPct) return 2;
   if(pct >= g_warnPct) return 1;
   return 0;
  }

//+------------------------------------------------------------------+
//| Historico do terminal por dia da mesa                             |
//+------------------------------------------------------------------+
string BuildPayload()
  {
   long   login   = AccountInfoInteger(ACCOUNT_LOGIN);
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity  = AccountInfoDouble(ACCOUNT_EQUITY);
   long   offset  = ServerOffset(); // servidor - UTC, em segundos

   string dayKeys[];
   double dayPnl[];
   double dayEod[];
   bool   dayTraded[];
   int    days = 0;
   double running = 0.0;
   // Saques: retiradas de saldo no historico. Algumas regras mudam depois do saque.
   int    payouts = 0;
   string lastPayout = "";

   // Resultado de cada trade (posicao) fechado, para a consistencia por trade.
   ulong  posIds[];
   double posSum[];
   bool   posClosed[];
   int    positions = 0;

   if(HistorySelect(0, TimeTradeServer() + 86400))
     {
      int total = HistoryDealsTotal();
      for(int i = 0; i < total; i++)
        {
         ulong ticket = HistoryDealGetTicket(i);
         if(ticket == 0)
            continue;
         long     type   = HistoryDealGetInteger(ticket, DEAL_TYPE);
         datetime when   = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);
         double   amount = HistoryDealGetDouble(ticket, DEAL_PROFIT)
                           + HistoryDealGetDouble(ticket, DEAL_COMMISSION)
                           + HistoryDealGetDouble(ticket, DEAL_SWAP)
                           + HistoryDealGetDouble(ticket, DEAL_FEE);
         running += amount;

         string key = FirmDayKey(when, offset);
         if(type == DEAL_TYPE_BALANCE && amount < 0.0)
           {
            payouts++;
            lastPayout = key;
           }
         if(days == 0 || dayKeys[days - 1] != key)
           {
            days++;
            ArrayResize(dayKeys, days);
            ArrayResize(dayPnl, days);
            ArrayResize(dayEod, days);
            ArrayResize(dayTraded, days);
            dayKeys[days - 1]   = key;
            dayPnl[days - 1]    = 0.0;
            dayTraded[days - 1] = false;
           }
         bool isTrade = (type == DEAL_TYPE_BUY || type == DEAL_TYPE_SELL);
         if(isTrade)
           {
            dayPnl[days - 1] += amount;
            dayTraded[days - 1] = true;
            ulong posId = (ulong)HistoryDealGetInteger(ticket, DEAL_POSITION_ID);
            long  entry = HistoryDealGetInteger(ticket, DEAL_ENTRY);
            int   slot = -1;
            for(int p = positions - 1; p >= 0; p--)
               if(posIds[p] == posId) { slot = p; break; }
            if(slot < 0)
              {
               positions++;
               ArrayResize(posIds, positions);
               ArrayResize(posSum, positions);
               ArrayResize(posClosed, positions);
               slot = positions - 1;
               posIds[slot] = posId;
               posSum[slot] = 0.0;
               posClosed[slot] = false;
              }
            posSum[slot] += amount;
            if(entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_OUT_BY || entry == DEAL_ENTRY_INOUT)
               posClosed[slot] = true;
           }
         dayEod[days - 1] = running;
        }
     }

   // Se o terminal nao tem o historico inteiro, os saldos ficam deslocados por uma
   // constante: corrige para o ultimo dia terminar no saldo atual.
   double drift = balance - running;
   string todayKey = FirmToday();
   g_todayClosed = (days > 0 && dayKeys[days - 1] == todayKey) ? dayPnl[days - 1] : 0.0;

   string json = "{";
   json += "\"login\":\"" + IntegerToString(login) + "\",";
   json += "\"server\":\"" + JsonSafe(AccountInfoString(ACCOUNT_SERVER)) + "\",";
   json += "\"company\":\"" + JsonSafe(AccountInfoString(ACCOUNT_COMPANY)) + "\",";
   json += "\"currency\":\"" + JsonSafe(AccountInfoString(ACCOUNT_CURRENCY)) + "\",";
   json += "\"eaVersion\":\"" + GUARD_VERSION + "\",";
   json += "\"balance\":" + DoubleToString(balance, 2) + ",";
   json += "\"equity\":" + DoubleToString(equity, 2) + ",";
   json += "\"peakEquity\":" + DoubleToString(g_peakEquity, 2) + ",";
   json += "\"dayBasis\":\"" + JsonSafe(g_dayBasis) + "\",";
   json += "\"dayToday\":\"" + todayKey + "\",";
   json += "\"payouts\":" + IntegerToString(payouts) + ",";
   if(lastPayout != "")
      json += "\"lastPayout\":\"" + lastPayout + "\",";
   bool   hasBest = false;
   double bestTrade = 0.0;
   for(int p = 0; p < positions; p++)
      if(posClosed[p] && (!hasBest || posSum[p] > bestTrade))
        {
         bestTrade = posSum[p];
         hasBest = true;
        }
   if(hasBest)
      json += "\"bestTrade\":" + DoubleToString(bestTrade, 2) + ",";
   json += "\"days\":[";
   int first = MathMax(0, days - MAX_DAYS_SENT);
   for(int d = first; d < days; d++)
     {
      if(d > first)
         json += ",";
      json += "{\"date\":\"" + dayKeys[d] + "\",\"pnl\":" + DoubleToString(dayPnl[d], 2)
              + ",\"eodBalance\":" + DoubleToString(dayEod[d] + drift, 2)
              + ",\"traded\":" + (dayTraded[d] ? "true" : "false") + "}";
     }
   json += "]";
   json += ",\"positions\":[" + PositionsJson() + "]";
   // Operacoes fechadas: a cada minuto ou logo depois que uma operacao fecha.
   if(g_tradesDirty || TimeLocal() - g_lastTradesSent >= 60)
     {
      json += ",\"trades\":[" + TradesJson(offset) + "]";
      g_lastTradesSent = TimeLocal();
      g_tradesDirty = false;
     }
   // Aba Configurações: o trader ligou/desligou regras aqui no MT5.
   if(g_pendingSave)
     {
      string keys = "";
      for(int o = 0; o < ArraySize(g_options); o++)
         if(g_options[o].on)
            keys += (keys == "" ? "" : ",") + "\"" + JsonSafe(g_options[o].key) + "\"";
      json += ",\"setRuleKeys\":[" + keys + "]";
     }
   json += "}";
   return json;
  }

// Dados de exemplo do modo demonstração: regras reais do Alpha Pro 10% (fase funded)
// do catálogo do Fortify, calculadas pelo motor sobre uma conta simulada de $100K.
string PreviewFeed()
  {
   string f = "";
   f += "FORTIFY-EA|1\n";
   f += "OK|Alpha Capital Group|Alpha Pro 10%|$100K|USD|partial|15|70.00|85.00|funded\n";
   f += "R|daily_loss|Perda diária|floor|partial|5000.00|97000.00|min|||||||||Perda diária de 5%.|||account\n";
   f += "R|max_drawdown|Drawdown máximo|floor|safe|10000.00|90000.00|min|||||||||Drawdown estático de 10%.|||account\n";
   f += "R|inactivity|Inatividade|idle|safe|30.00|||||||||0.00|30.00|A mesa encerra a conta com 30 dias sem operar.|||account\n";
   f += "R|max_lots|Lote máximo|lots|safe|40.00|||||||||||Até 40 lotes abertos, somando todas as posições.|total||account\n";
   f += "R|weekend|Fechamento de sexta|close|safe||||||||||||Qualified Analyst Pro não permite manter posição no fim de semana e aplica soft breach.|weekly||account\n";
   f += "R|consistency|Consistência|daycap|warning|600.00||||||102000.00|1333.33|1000.00|||Nenhum dia pode passar de 40% do lucro total. Regra oficial: payout on-demand exige Best Day de 40% e 2% de lucro bruto.|||payout\n";
   f += "R|min_trading_days|Dias mínimos|counter|safe|4.00|||||||||4.00|4.00|Mínimo de dias operados atingido.|||payout\n";
   f += "R|news|Notícias|note|safe||||||||||||Avaliação livre; Qualified proíbe execução em ±2 minutos de eventos direcionados.|||rules\n";
   f += "R|leverage|Alavancagem|note|safe||||||||||||Até 1:100 em forex; índices e metais com alavancagem menor.|||rules\n";
   f += "R|payout_split|Divisão do lucro|note|safe||||||||||||80% para o trader; pode subir para 90% com o add-on.|||rules\n";
   // Todas as regras da mesa para a aba Configurações (1 = ao vivo, depois 1 = ligada).
   f += "O|daily_loss|Perda diária|account|1|1|5% ($5.000)\\n";
   f += "O|max_drawdown|Drawdown máximo|account|1|1|10% ($10.000)\\n";
   f += "O|inactivity|Inatividade|account|1|0|30 dias sem operar\\n";
   f += "O|max_lots|Lote máximo|account|1|0|40 lotes no total\\n";
   f += "O|weekend|Fechamento de sexta|account|1|0|Toda sexta\\n";
   f += "O|consistency|Consistência|payout|1|1|Maior dia até 40% do lucro total\\n";
   f += "O|min_trading_days|Dias mínimos|payout|1|1|4 dias operados\\n";
   f += "O|news|Notícias|rules|0|1|Livre na avaliação. Qualified: ±2 minutos\\n";
   f += "O|leverage|Alavancagem|rules|0|1|Até 1:100 em forex\\n";
   f += "O|payout_split|Divisão do lucro|rules|0|0|80% para o trader\\n";
   f += "END\n";
   return f;
  }

//+------------------------------------------------------------------+
//| Operacoes e posicoes enviadas ao Fortify                           |
//+------------------------------------------------------------------+
bool IsExitDeal(const ulong ticket)
  {
   long entry = HistoryDealGetInteger(ticket, DEAL_ENTRY);
   long type  = HistoryDealGetInteger(ticket, DEAL_TYPE);
   return (entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_OUT_BY || entry == DEAL_ENTRY_INOUT)
          && (type == DEAL_TYPE_BUY || type == DEAL_TYPE_SELL);
  }

// Ultimas operacoes fechadas (ate 100), com o historico ja selecionado.
// Horarios em segundos UTC; o Fortify grava so as que fecharam depois que a
// conta foi ligada ao EA.
string TradesJson(const long offset)
  {
   string json = "";
   int total = HistoryDealsTotal();
   int found = 0;
   for(int i = total - 1; i >= 0 && found < 100; i--)
     {
      ulong out = HistoryDealGetTicket(i);
      if(out == 0 || !IsExitDeal(out))
         continue;
      long   positionId = HistoryDealGetInteger(out, DEAL_POSITION_ID);
      double volume     = HistoryDealGetDouble(out, DEAL_VOLUME);
      string side       = (HistoryDealGetInteger(out, DEAL_TYPE) == DEAL_TYPE_SELL) ? "buy" : "sell";
      datetime openTime = (datetime)HistoryDealGetInteger(out, DEAL_TIME);
      double openPrice  = HistoryDealGetDouble(out, DEAL_PRICE);
      double commission = HistoryDealGetDouble(out, DEAL_COMMISSION) + HistoryDealGetDouble(out, DEAL_FEE);
      // A entrada da mesma posicao vem antes no historico.
      for(int j = i - 1; j >= 0; j--)
        {
         ulong in = HistoryDealGetTicket(j);
         if(in == 0 || HistoryDealGetInteger(in, DEAL_POSITION_ID) != positionId)
            continue;
         if(HistoryDealGetInteger(in, DEAL_ENTRY) != DEAL_ENTRY_IN)
            continue;
         side      = (HistoryDealGetInteger(in, DEAL_TYPE) == DEAL_TYPE_BUY) ? "buy" : "sell";
         openTime  = (datetime)HistoryDealGetInteger(in, DEAL_TIME);
         openPrice = HistoryDealGetDouble(in, DEAL_PRICE);
         double inVolume = HistoryDealGetDouble(in, DEAL_VOLUME);
         if(inVolume > 0)
            commission += HistoryDealGetDouble(in, DEAL_COMMISSION) * MathMin(1.0, volume / inVolume);
         break;
        }
      if(found > 0)
         json += ",";
      json += "{\"ticket\":" + IntegerToString((long)out)
              + ",\"symbol\":\"" + JsonSafe(HistoryDealGetString(out, DEAL_SYMBOL)) + "\""
              + ",\"side\":\"" + side + "\""
              + ",\"volume\":" + DoubleToString(volume, 2)
              + ",\"openTime\":" + IntegerToString((long)openTime - offset)
              + ",\"closeTime\":" + IntegerToString((long)HistoryDealGetInteger(out, DEAL_TIME) - offset)
              + ",\"openPrice\":" + DoubleToString(openPrice, 5)
              + ",\"closePrice\":" + DoubleToString(HistoryDealGetDouble(out, DEAL_PRICE), 5)
              + ",\"profit\":" + DoubleToString(HistoryDealGetDouble(out, DEAL_PROFIT), 2)
              + ",\"commission\":" + DoubleToString(commission, 2)
              + ",\"swap\":" + DoubleToString(HistoryDealGetDouble(out, DEAL_SWAP), 2) + "}";
      found++;
     }
   return json;
  }

string PositionsJson()
  {
   string json = "";
   int count = 0;
   for(int i = 0; i < PositionsTotal(); i++)
     {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0)
         continue;
      if(count > 0)
         json += ",";
      json += "{\"ticket\":" + IntegerToString((long)ticket)
              + ",\"symbol\":\"" + JsonSafe(PositionGetString(POSITION_SYMBOL)) + "\""
              + ",\"volume\":" + DoubleToString(PositionGetDouble(POSITION_VOLUME), 2)
              + ",\"openPrice\":" + DoubleToString(PositionGetDouble(POSITION_PRICE_OPEN), 5)
              + ",\"currentPrice\":" + DoubleToString(PositionGetDouble(POSITION_PRICE_CURRENT), 5)
              + ",\"profit\":" + DoubleToString(PositionGetDouble(POSITION_PROFIT) + PositionGetDouble(POSITION_SWAP), 2)
              + ",\"stopLoss\":" + DoubleToString(PositionGetDouble(POSITION_SL), 5)
              + ",\"takeProfit\":" + DoubleToString(PositionGetDouble(POSITION_TP), 5) + "}";
      count++;
     }
   return json;
  }

//+------------------------------------------------------------------+
//| Consulta ao Fortify                                               |
//+------------------------------------------------------------------+
bool FetchFeed(string &response, string &error)
  {
   string url = BaseUrl() + "/ea/feed";
   string headers = "Content-Type: application/json\r\nX-Fortify-EA-Token: " + Trimmed(InpToken) + "\r\n";
   string payload = BuildPayload();
   char body[];
   int size = StringToCharArray(payload, body, 0, WHOLE_ARRAY, CP_UTF8);
   if(size > 0)
      ArrayResize(body, size - 1); // sem o \0 final
   char result[];
   string resultHeaders;
   ResetLastError();
   int code = WebRequest("POST", url, headers, 8000, body, result, resultHeaders);
   if(code == -1)
     {
      int err = GetLastError();
      if(err == 4014)
         error = "Libere o endereço " + BaseUrl() + " em Ferramentas > Opções > Expert Advisors > Permitir WebRequest.";
      else
         error = "Sem conexão com o Fortify (erro " + IntegerToString(err) + "). Tentando de novo.";
      return false;
     }
   response = CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);
   if(code != 200)
     {
      error = "O Fortify respondeu HTTP " + IntegerToString(code) + ". Tentando de novo.";
      return false;
     }
   return true;
  }

bool ParseFeed(const string text, string &error)
  {
   string lines[];
   int count = StringSplit(text, '\n', lines);
   if(count < 2 || StringFind(lines[0], "FORTIFY-EA|1") != 0)
     {
      error = "Resposta inesperada do Fortify. Atualize o EA pela página da conta.";
      return false;
     }

   GuardRule parsed[];
   int n = 0;
   GuardOption parsedOptions[];
   int nOptions = 0;
   string notice = "";
   for(int i = 1; i < count; i++)
     {
      string line = lines[i];
      StringReplace(line, "\r", "");
      string f[];
      int k = StringSplit(line, '|', f);
      if(k < 1)
         continue;
      if(f[0] == "ERR" && k >= 3)
        {
         error = f[2];
         return false;
        }
      if(f[0] == "OK" && k >= 9)
        {
         g_firm     = f[1];
         g_program  = f[2];
         g_size     = f[3];
         g_currency = f[4];
         g_overall  = f[5];
         g_pollSeconds = (int)MathMax(5, StringToInteger(f[6]));
         ParseNum(f[7], g_warnPct);
         ParseNum(f[8], g_critPct);
         g_stage = (k >= 10) ? f[9] : "";
         continue;
        }
      // Hora em que esta mesa vira o dia. Mudou: refaz a consulta com os dias certos.
      if(f[0] == "D" && k >= 4)
        {
         bool changed = (f[1] != g_dayBasis);
         g_dayBasis = f[1];
         g_dayReset = (int)StringToInteger(f[2]);
         string steps[];
         int total = (k >= 5 && f[4] != "") ? StringSplit(f[4], ',', steps) : 0;
         ArrayResize(g_dayEpochs, total);
         ArrayResize(g_dayOffsets, total);
         for(int s = 0; s < total; s++)
           {
            string pair[];
            if(StringSplit(steps[s], ':', pair) == 2)
              {
               g_dayEpochs[s]  = StringToInteger(pair[0]);
               g_dayOffsets[s] = (int)StringToInteger(pair[1]);
              }
           }
         if(changed)
           {
            g_utcDay = FirmToday();
            g_lastPoll = 0;
           }
         continue;
        }
      if(f[0] == "R" && k >= 17)
        {
         GuardRule r;
         ResetRule(r);
         r.key      = f[1];
         r.label    = f[2];
         r.kind     = f[3];
         r.status   = f[4];
         r.hasLimit = ParseNum(f[5], r.limit);
         r.hasFloor = ParseNum(f[6], r.floorValue);
         r.metric   = f[7];
         r.trailing = f[8];
         r.hasFloorMax   = ParseNum(f[9], r.floorMax);
         r.hasTarget     = ParseNum(f[10], r.targetBalance);
         r.hasDayStart   = ParseNum(f[11], r.dayStart);
         r.hasCap        = ParseNum(f[12], r.todayCap);
         r.hasRegularize = ParseNum(f[13], r.regularize);
         r.hasCurrent    = ParseNum(f[14], r.current);
         r.hasRequired   = ParseNum(f[15], r.required);
         r.message       = f[16];
         if(k >= 20)
           {
            r.mode      = f[17];
            r.hasParam1 = ParseNum(f[18], r.param1);
            r.group     = f[19];
           }
         // Mantem o nivel ja avisado hoje para nao repetir o popup a cada consulta.
         for(int j = 0; j < ArraySize(g_rules); j++)
            if(g_rules[j].key == r.key)
               r.alertLevel = g_rules[j].alertLevel;
         n++;
         ArrayResize(parsed, n);
         parsed[n - 1] = r;
         continue;
        }
      if(f[0] == "O" && k >= 6)
        {
         GuardOption o;
         o.key   = f[1];
         o.label = f[2];
         o.group = f[3];
         o.live  = (f[4] == "1");
         o.on    = (f[5] == "1");
         o.detail = (k >= 7) ? f[6] : "";
         // Demonstração: a escolha feita na aba Configurações vale só nesta tela.
         if(InpPreview)
            for(int j = 0; j < ArraySize(g_options); j++)
               if(g_options[j].key == o.key)
                  o.on = g_options[j].on;
         nOptions++;
         ArrayResize(parsedOptions, nOptions);
         parsedOptions[nOptions - 1] = o;
         continue;
        }
      if(f[0] == "N" && k >= 2)
         notice = f[1];
     }

   ArrayResize(g_rules, n);
   for(int i = 0; i < n; i++)
      g_rules[i] = parsed[i];
   ArrayResize(g_options, nOptions);
   for(int i = 0; i < nOptions; i++)
      g_options[i] = parsedOptions[i];
   if(notice != "")
      g_notice = notice;
   return true;
  }

// Demonstração: as regras de exemplo valem sobre o dia real da conta aberta no MT5.
void PreviewAnchor()
  {
   if(InpPreviewStress)
      return;
   BuildPayload(); // atualiza o resultado fechado de hoje a partir do histórico
   double dayStart = AccountInfoDouble(ACCOUNT_BALANCE) - g_todayClosed;
   for(int i = 0; i < ArraySize(g_rules); i++)
     {
      if(g_rules[i].key == "daily_loss" && g_rules[i].hasFloor && g_rules[i].hasLimit)
         g_rules[i].floorValue = dayStart - g_rules[i].limit;
      if(g_rules[i].kind == "daycap" && g_rules[i].hasDayStart)
         g_rules[i].dayStart = dayStart;
     }
  }

void Poll()
  {
   g_lastPoll = TimeLocal();
   if(InpPreview)
     {
      string previewError;
      // Demonstração: usa um feed salvo em MQL5\Files quando existe (prévia com as regras escolhidas).
      string feed = PreviewFeed();
      int fh = FileOpen("FortifyGuard_preview_feed.txt", FILE_READ | FILE_TXT | FILE_ANSI | FILE_SHARE_READ, 0, CP_UTF8);
      if(fh != INVALID_HANDLE)
        {
         string custom = "";
         while(!FileIsEnding(fh))
            custom += FileReadString(fh) + "\n";
         FileClose(fh);
         if(StringFind(custom, "FORTIFY-EA|") == 0)
            feed = custom;
        }
      if(ParseFeed(feed, previewError))
        {
         PreviewAnchor();
         g_error = "";
         g_lastOk = TimeLocal();
         g_hasFeed = true;
        }
      else
         g_error = previewError;
      return;
     }
   if(StringLen(Trimmed(InpToken)) == 0)
     {
      g_error = "Cole a chave do EA nas configurações (F7). Ela é gerada na página da conta no Fortify.";
      return;
     }
   string response, error;
   if(FetchFeed(response, error) && ParseFeed(response, error))
     {
      g_error  = "";
      g_lastOk = TimeLocal();
      g_hasFeed = true;
      // A escolha foi junto com a consulta; a resposta já traz o que ficou salvo.
      g_pendingSave = false;
     }
   else
      g_error = error;
  }

//+------------------------------------------------------------------+
//| Utilidades das regras novas                                       |
//+------------------------------------------------------------------+
string FormatLots(const double lots)
  {
   string text = DoubleToString(lots, 2);
   while(StringLen(text) > 1 && StringSubstr(text, StringLen(text) - 1) == "0")
      text = StringSubstr(text, 0, StringLen(text) - 1);
   if(StringSubstr(text, StringLen(text) - 1) == ".")
      text = StringSubstr(text, 0, StringLen(text) - 1);
   StringReplace(text, ".", ",");
   return text;
  }

string FormatDuration(const long seconds)
  {
   long minutes = seconds / 60;
   if(minutes < 60)
      return IntegerToString(minutes) + " min";
   long hours = minutes / 60;
   if(hours < 48)
      return IntegerToString(hours) + "h" + StringFormat("%02d", (int)(minutes % 60));
   return IntegerToString(hours / 24) + " dias";
  }

string WeekdayShort(const int day)
  {
   string names[] = {"dom", "seg", "ter", "qua", "qui", "sex", "sáb"};
   return names[day % 7];
  }

// Horario local do trader para um instante UTC, ex.: "sex 17:45".
string FormatLocal(const datetime utc)
  {
   datetime local = (datetime)(utc + (TimeLocal() - TimeGMT()));
   MqlDateTime t;
   TimeToStruct(local, t);
   return WeekdayShort(t.day_of_week) + " " + StringFormat("%02d:%02d", t.hour, t.min);
  }

// Fim do pregao de sexta (minuto do dia, horario do servidor) dos ativos com posicao aberta.
int FridaySessionCloseMinutes()
  {
   int best = -1;
   for(int i = 0; i < PositionsTotal(); i++)
     {
      if(PositionGetTicket(i) == 0)
         continue;
      string symbol = PositionGetString(POSITION_SYMBOL);
      datetime from, to;
      for(uint session = 0; SymbolInfoSessionTrade(symbol, FRIDAY, session, from, to); session++)
        {
         int minutes = (int)((long)to / 60);
         if(minutes > best)
            best = minutes;
        }
     }
   return best;
  }

// Proximo fechamento obrigatorio em UTC; 0 = horario desconhecido.
datetime NextCloseUtc(const GuardRule &rule)
  {
   datetime nowUtc = TimeGMT();
   long offset = (long)(TimeTradeServer() - TimeGMT());
   bool server = (rule.metric == "server");
   int minutes = rule.hasParam1 ? (int)rule.param1 : -1;
   if(rule.mode == "weekly" && minutes < 0)
     {
      minutes = InpPreview ? 21 * 60 : FridaySessionCloseMinutes();
      server = !InpPreview;
     }
   if(minutes < 0)
      return 0;
   datetime nowRef = server ? (datetime)(nowUtc + offset) : nowUtc;
   datetime dayStart = nowRef - (nowRef % 86400);
   datetime candidate;
   if(rule.mode == "daily")
     {
      candidate = dayStart + minutes * 60;
      if(candidate <= nowRef)
         candidate += 86400;
     }
   else
     {
      MqlDateTime t;
      TimeToStruct(nowRef, t);
      int daysToFriday = (5 - t.day_of_week + 7) % 7;
      candidate = dayStart + daysToFriday * 86400 + minutes * 60;
      if(candidate <= nowRef)
         candidate += 7 * 86400;
     }
   return server ? (datetime)(candidate - offset) : candidate;
  }

//+------------------------------------------------------------------+
//| Calculo ao vivo                                                   |
//+------------------------------------------------------------------+
void ComputeLive()
  {
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity  = AccountInfoDouble(ACCOUNT_EQUITY);
   // Só o teste de "dia perto do limite" usa conta simulada. A demonstração lê a conta aberta no MT5.
   bool simulated = (InpPreview && InpPreviewStress);
   if(simulated)
     {
      balance = 101500.0;
      equity  = 98000.0 + 120.0 * MathSin(GetTickCount() / 2500.0);
      g_todayClosed = -500.0;
     }
   else if(!InpPreview && equity > g_peakEquity)
     {
      g_peakEquity = equity;
      GlobalVariableSet(PeakVarName(), g_peakEquity);
     }

   g_balanceNow = balance;
   g_equityNow = equity;
   double totalLots = 0.0, biggestLot = 0.0, openRisk = 0.0;
   int positions = PositionsTotal(), withoutStop = 0;
   for(int p = 0; p < positions; p++)
     {
      if(PositionGetTicket(p) == 0)
         continue;
      double volume = PositionGetDouble(POSITION_VOLUME);
      totalLots += volume;
      biggestLot = MathMax(biggestLot, volume);
      double stop = PositionGetDouble(POSITION_SL);
      if(stop <= 0)
        {
         withoutStop++;
         continue;
        }
      ENUM_ORDER_TYPE side = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;
      double atStop = 0.0;
      if(OrderCalcProfit(side, PositionGetString(POSITION_SYMBOL), volume, PositionGetDouble(POSITION_PRICE_OPEN), stop, atStop))
         openRisk += MathMax(0.0, -atStop);
     }
   if(simulated)
     {
      totalLots = 12.5;
      biggestLot = 5.0;
      openRisk = 1180.0;
      positions = 3;
      withoutStop = 0;
     }

   for(int i = 0; i < ArraySize(g_rules); i++)
     {
      g_rules[i].pct = 0.0;
      g_rules[i].level = 0;
      g_rules[i].valueText = "";
      g_rules[i].valuePre = "";
      g_rules[i].valueMain = "";
      g_rules[i].valueDone = false;
      g_rules[i].detailText = "";
      string kind = g_rules[i].kind;

      if(kind == "floor" && g_rules[i].hasFloor && g_rules[i].hasLimit && g_rules[i].limit > 0)
        {
         if(g_rules[i].trailing != "")
           {
            double source = (g_rules[i].trailing == "equity") ? equity : balance;
            double candidate = source - g_rules[i].limit;
            if(g_rules[i].hasFloorMax)
               candidate = MathMin(candidate, g_rules[i].floorMax);
            if(candidate > g_rules[i].floorValue)
               g_rules[i].floorValue = candidate;
           }
         double metric = (g_rules[i].metric == "equity") ? equity
                         : (g_rules[i].metric == "balance") ? balance
                         : MathMin(balance, equity);
         double slack = metric - g_rules[i].floorValue;
         double used  = g_rules[i].limit - slack;
         g_rules[i].slack = slack;
         g_rules[i].hasSlack = true;
         g_rules[i].pct = MathMax(0.0, used / g_rules[i].limit * 100.0);
         g_rules[i].level = LevelFor(g_rules[i].pct);
         if(slack > 0) SetValue(g_rules[i], "folga", MoneyShort(slack));
         else          SetValue(g_rules[i], "", "LIMITE ATINGIDO");
         g_rules[i].detailText = "Equity mínima " + Money(g_rules[i].floorValue)
                                 + (g_rules[i].trailing != "" ? " (sobe com o pico)" : "");
        }
      else if(kind == "target" && g_rules[i].hasTarget && g_rules[i].hasLimit && g_rules[i].limit > 0)
        {
         double missing = g_rules[i].targetBalance - balance;
         g_rules[i].pct = MathMin(100.0, MathMax(0.0, (g_rules[i].limit - missing) / g_rules[i].limit * 100.0));
         if(missing > 0) SetValue(g_rules[i], "faltam", MoneyShort(missing));
         else            SetValue(g_rules[i], "", "META ATINGIDA", true);
         g_rules[i].detailText = "Saldo da meta " + Money(g_rules[i].targetBalance)
                                 + "  |  lucro flutuante só conta ao fechar";
        }
      else if(kind == "daycap" && g_rules[i].hasDayStart && g_rules[i].hasCap)
        {
         double today = equity - g_rules[i].dayStart;
         if(g_rules[i].todayCap > 0)
           {
            g_rules[i].pct = MathMax(0.0, today / g_rules[i].todayCap * 100.0);
            double room = g_rules[i].todayCap - today;
            if(room > 0) SetValue(g_rules[i], "hoje até", "+" + MoneyShort(g_rules[i].todayCap));
            else         SetValue(g_rules[i], "", "ACIMA DO TETO");
            g_rules[i].detailText = "Hoje " + (today >= 0 ? "+" : "") + Money(today)
                                    + " de teto " + Money(g_rules[i].todayCap);
           }
         else
           {
            g_rules[i].pct = (today > 0) ? 100.0 : 0.0;
            SetValue(g_rules[i], "", "sem folga hoje");
            g_rules[i].detailText = g_rules[i].message;
           }
         g_rules[i].level = LevelFor(g_rules[i].pct);
         if(g_rules[i].hasRegularize && g_rules[i].regularize > 0)
            g_rules[i].detailText += "  |  falta +" + Money(g_rules[i].regularize) + " de lucro total para o melhor dia caber na regra";
        }
      else if(kind == "tradecap" && g_rules[i].hasCap)
        {
         // Maior lucro entre os trades abertos agora, contra o teto do proximo trade.
         double openBest = 0.0;
         for(int p = PositionsTotal() - 1; p >= 0; p--)
           {
            ulong ticket = PositionGetTicket(p);
            if(ticket == 0 || !PositionSelectByTicket(ticket))
               continue;
            double result = PositionGetDouble(POSITION_PROFIT) + PositionGetDouble(POSITION_SWAP);
            if(result > openBest)
               openBest = result;
           }
         if(g_rules[i].todayCap > 0)
           {
            g_rules[i].pct = MathMax(0.0, openBest / g_rules[i].todayCap * 100.0);
            double room = g_rules[i].todayCap - openBest;
            if(room > 0) SetValue(g_rules[i], "trade até", "+" + MoneyShort(g_rules[i].todayCap));
            else         SetValue(g_rules[i], "", "TRADE ACIMA DO TETO");
            g_rules[i].detailText = "Trade aberto +" + Money(openBest) + " de teto " + Money(g_rules[i].todayCap);
           }
         else
           {
            g_rules[i].pct = (openBest > 0) ? 100.0 : 0.0;
            SetValue(g_rules[i], "", "sem folga");
            g_rules[i].detailText = g_rules[i].message;
           }
         g_rules[i].level = LevelFor(g_rules[i].pct);
         if(g_rules[i].hasRegularize && g_rules[i].regularize > 0)
            g_rules[i].detailText += "  |  falta +" + Money(g_rules[i].regularize) + " de lucro total para o maior trade caber na regra";
        }
      else if(kind == "counter")
        {
         if(g_rules[i].hasCurrent && g_rules[i].hasRequired)
           {
            bool done = g_rules[i].current >= g_rules[i].required;
            double shownDays = done ? g_rules[i].required : g_rules[i].current;
            SetValue(g_rules[i], "", DoubleToString(shownDays, 0) + " de " + DoubleToString(g_rules[i].required, 0), done);
            g_rules[i].pct = (g_rules[i].required > 0) ? MathMin(100.0, g_rules[i].current / g_rules[i].required * 100.0) : 100.0;
            g_rules[i].detailText = (g_rules[i].mode == "profitable")
                                    ? DoubleToString(g_rules[i].current, 0) + " dias lucrativos; a mesa exige " + DoubleToString(g_rules[i].required, 0)
                                      + (g_rules[i].hasParam1 && g_rules[i].param1 > 0 ? ", cada um com " + Money(g_rules[i].param1) + " ou mais." : ".")
                                    : DoubleToString(g_rules[i].current, 0) + " dias operados; a mesa exige " + DoubleToString(g_rules[i].required, 0) + ".";
           }
         else
            g_rules[i].detailText = g_rules[i].message;
        }
      else if(kind == "idle" && g_rules[i].hasRequired && g_rules[i].required > 0)
        {
         if(g_rules[i].hasCurrent)
           {
            double left = g_rules[i].required - g_rules[i].current;
            g_rules[i].pct = g_rules[i].current / g_rules[i].required * 100.0;
            g_rules[i].level = LevelFor(g_rules[i].pct);
            if(left > 0) SetValue(g_rules[i], "faltam", DoubleToString(left, 0) + " dias");
            else         SetValue(g_rules[i], "", "LIMITE ATINGIDO");
            g_rules[i].detailText = ((g_rules[i].current < 1) ? "Operou hoje." : "Último trade há " + DoubleToString(g_rules[i].current, 0) + " dias.")
                                    + " A mesa encerra a conta com "
                                    + DoubleToString(g_rules[i].required, 0) + " dias sem operar.";
           }
         else
            g_rules[i].detailText = g_rules[i].message;
        }
      else if(kind == "close")
        {
         datetime deadline = NextCloseUtc(g_rules[i]);
         string when = (deadline > 0) ? FormatLocal(deadline) : "no fim do pregão";
         if(positions == 0)
           {
            SetValue(g_rules[i], "", "sem posição");
            g_rules[i].detailText = "Próximo fechamento: " + when + ". " + g_rules[i].message;
           }
         else if(deadline == 0)
           {
            SetValue(g_rules[i], "", "confira o horário");
            g_rules[i].level = 1;
            g_rules[i].detailText = g_rules[i].message;
           }
         else
           {
            long left = (long)(deadline - TimeGMT());
            g_rules[i].pct = (left < 86400) ? (1.0 - left / 86400.0) * 100.0 : 0.0;
            g_rules[i].level = (left <= 0) ? 3 : (left <= 1800) ? 2 : (left <= 7200) ? 1 : 0;
            if(left > 0) SetValue(g_rules[i], "feche em", FormatDuration(left));
            else         SetValue(g_rules[i], "", "HORÁRIO PASSOU");
            g_rules[i].detailText = "Fechamento obrigatório " + when + " (seu horário). " + g_rules[i].message;
           }
        }
      else if(kind == "lots" && g_rules[i].hasLimit && g_rules[i].limit > 0)
        {
         bool perOrder = (g_rules[i].mode == "per_order");
         double used = perOrder ? biggestLot : totalLots;
         g_rules[i].pct = used / g_rules[i].limit * 100.0;
         g_rules[i].level = LevelFor(g_rules[i].pct);
         SetValue(g_rules[i], "", FormatLots(used) + " de " + FormatLots(g_rules[i].limit) + " lotes");
         g_rules[i].detailText = perOrder ? "Maior posição aberta. " + g_rules[i].message
                                          : "Soma das posições abertas. " + g_rules[i].message;
        }
      else if(kind == "floating" && g_rules[i].hasLimit && g_rules[i].limit > 0)
        {
         double loss = MathMax(0.0, balance - equity);
         double slack = g_rules[i].limit - loss;
         g_rules[i].slack = slack;
         g_rules[i].hasSlack = true;
         g_rules[i].pct = loss / g_rules[i].limit * 100.0;
         g_rules[i].level = LevelFor(g_rules[i].pct);
         if(slack > 0) SetValue(g_rules[i], "folga", MoneyShort(slack));
         else          SetValue(g_rules[i], "", "LIMITE ATINGIDO");
         g_rules[i].detailText = "Em aberto -" + Money(loss) + " de -" + Money(g_rules[i].limit) + ". " + g_rules[i].message;
        }
      else if(kind == "risk" && g_rules[i].hasLimit && g_rules[i].limit > 0)
        {
         g_rules[i].pct = openRisk / g_rules[i].limit * 100.0;
         g_rules[i].level = (withoutStop > 0) ? MathMax(2, LevelFor(g_rules[i].pct)) : LevelFor(g_rules[i].pct);
         if(withoutStop > 0) SetValue(g_rules[i], "", IntegerToString(withoutStop) + " sem stop");
         else                SetValue(g_rules[i], "risco", MoneyShort(openRisk));
         g_rules[i].detailText = "Risco até os stops " + Money(openRisk) + " de " + Money(g_rules[i].limit) + ". " + g_rules[i].message;
        }
      else
        {
         g_rules[i].detailText = g_rules[i].message;
        }
     }
  }

//+------------------------------------------------------------------+
//| Avisos                                                            |
//+------------------------------------------------------------------+
void Notify(const string text)
  {
   Alert("Fortify Guard  |  " + text);
   if(InpPush)
      SendNotification("Fortify Guard: " + text);
  }

void CheckAlerts()
  {
   if(InpPreview)
      return;
   for(int i = 0; i < ArraySize(g_rules); i++)
     {
      if(!RuleVisible(i))
         continue;
      string kind = g_rules[i].kind;
      if(kind == "target")
        {
         if(g_rules[i].pct >= 100.0 && g_rules[i].alertLevel < 3)
           {
            g_rules[i].alertLevel = 3;
            Notify(g_rules[i].label + ": meta atingida. Confira o próximo passo da sua mesa.");
           }
         continue;
        }
      bool alertable = (kind == "floor" || kind == "daycap" || kind == "tradecap" || kind == "idle" || kind == "close"
                        || kind == "lots" || kind == "floating" || kind == "risk");
      if(!alertable)
         continue;
      int level = g_rules[i].level;
      if(level <= g_rules[i].alertLevel)
         continue;
      g_rules[i].alertLevel = level;
      string text;
      if(kind == "tradecap")
         text = (level >= 3)
                ? g_rules[i].label + ": o trade aberto passou do teto. " + g_rules[i].detailText
                : g_rules[i].label + ": " + DoubleToString(g_rules[i].pct, 0) + "% do teto do trade. " + g_rules[i].detailText + ".";
      else if(kind == "daycap")
         text = (level >= 3)
                ? g_rules[i].label + ": o lucro de hoje passou do teto. " + g_rules[i].detailText
                : g_rules[i].label + ": " + DoubleToString(g_rules[i].pct, 0) + "% do teto de hoje. " + g_rules[i].valueText + ".";
      else if(kind == "floor" || kind == "floating")
         text = (level >= 3)
                ? g_rules[i].label + ": limite atingido. " + g_rules[i].detailText
                : g_rules[i].label + ": " + DoubleToString(g_rules[i].pct, 0) + "% do limite usado, " + g_rules[i].valueText + ".";
      else
         text = g_rules[i].label + ": " + g_rules[i].valueText + ". " + g_rules[i].detailText;
      Notify(text);
      if(InpSound && level >= 2)
         PlaySound("::fortify_alert.wav");
     }
  }

//+------------------------------------------------------------------+
//| Fechar posicoes (so com confirmacao)                              |
//+------------------------------------------------------------------+
void CloseAllPositions()
  {
   int total = PositionsTotal();
   if(total == 0)
     {
      g_notice = "Nenhuma posição aberta.";
      return;
     }
   if(!TerminalInfoInteger(TERMINAL_TRADE_ALLOWED) || !MQLInfoInteger(MQL_TRADE_ALLOWED))
     {
      g_notice = "Ative o Algo Trading no MT5 para o botão conseguir fechar as posições.";
      return;
     }
   string question = "Fechar TODAS as " + IntegerToString(total) + " posições abertas desta conta agora?";
   if(MessageBox(question, "Fortify Guard", MB_YESNO | MB_ICONWARNING) != IDYES)
      return;

   int closed = 0, failed = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0)
         continue;
      if(g_trade.PositionClose(ticket))
         closed++;
      else
         failed++;
     }
   g_notice = IntegerToString(closed) + " posição(ões) fechada(s)" + (failed > 0 ? ", " + IntegerToString(failed) + " falharam: confira na aba Negociação." : ".");
   Poll();
  }

//+------------------------------------------------------------------+
//| Painel: desenhado em pixels (cantos arredondados, anel, chaves)   |
//+------------------------------------------------------------------+
#define PANEL_RES "::fortify_panel"
#define PW        340.0   // largura do painel em pontos de tela (x escala do Windows)
#define PP        16.0    // margem interna

struct HitArea
  {
   double            x1;
   double            y1;
   double            x2;
   double            y2;
   string            action;
  };

uint     g_px[];
int      g_cw = 0, g_ch = 0;      // tamanho do desenho em pixels
double   g_s = 1.0;               // escala do Windows (DPI / 96)
bool     g_measure = false;       // true: só mede a altura, não desenha
bool     g_compact = false;       // painel apertado no gráfico baixo
int      g_x0 = 0, g_y0 = 0;      // canto do painel no gráfico (pixels)
// Painel arrastável pelo cabeçalho. A posição escolhida fica salva no terminal.
#define  DRAG_HANDLE_H 62.0       // altura da faixa de arrastar (pontos, a partir do topo)
bool     g_userPos = false;       // trader moveu o painel (senão vale o canto do InpCorner)
int      g_posX = 0, g_posY = 0;
bool     g_mouseDown = false, g_dragArmed = false, g_drag = false;
int      g_dragDX = 0, g_dragDY = 0;
uint     g_dragEndTick = 0;
void     ClampPanel(const int chartW, const int chartH);
HitArea  g_hits[];
bool     g_editOn = false;
double   g_editX = 0, g_editY = 0;
int      g_worst = 0, g_worstIdx = -1, g_slackIdx = -1;
double   g_canLose = 0.0;
bool     g_hasCanLose = false;
uchar    g_logoSq[], g_logoF[];
int      g_logoSize = 0;
// Rolagem do conteúdo das abas quando não cabe na altura do gráfico.
uint     g_content[];             // conteúdo desenhado inteiro, antes do recorte
double   g_scroll = 0.0, g_scrollMax = 0.0;
double   g_contentTop = 0.0;      // onde o conteúdo começa (abaixo das abas)
double   g_hitDy = 0.0, g_hitTop = 0.0, g_hitBottom = 1e9;
double   g_editDy = 0.0;
bool     g_hover = false;
long     g_savedMouseScroll = 1;
#define  FONT_K 1.12              // a fonte em pixels sai menor que o tamanho pedido

void MarkUsed(const string name)
  {
   int n = ArraySize(g_used);
   ArrayResize(g_used, n + 1);
   g_used[n] = name;
  }

color ToColor(const uint argb)
  {
   return (color)(((argb & 0xFF) << 16) | (argb & 0xFF00) | ((argb >> 16) & 0xFF));
  }

uint Argb(const uint rgb, const int alpha)
  {
   return ((uint)alpha << 24) | (rgb & 0xFFFFFF);
  }

uint Mix(const uint a, const uint b, const double t)
  {
   int r  = (int)MathRound(((a >> 16) & 0xFF) * (1.0 - t) + ((b >> 16) & 0xFF) * t);
   int g  = (int)MathRound(((a >> 8) & 0xFF) * (1.0 - t) + ((b >> 8) & 0xFF) * t);
   int bl = (int)MathRound((a & 0xFF) * (1.0 - t) + (b & 0xFF) * t);
   return (uint)0xFF000000 | ((uint)r << 16) | ((uint)g << 8) | (uint)bl;
  }

uint LevelArgb(const int level)
  {
   if(level >= 3) return P_BREACH;
   if(level == 2) return P_CRIT;
   if(level == 1) return P_WARN;
   return P_OK;
  }

//--- pixels
void Blend(const int x, const int y, const uint c, const double cov)
  {
   if(x < 0 || y < 0 || x >= g_cw || y >= g_ch || cov <= 0.0)
      return;
   int i = y * g_cw + x;
   int ca = (int)((c >> 24) & 0xFF);
   if(cov >= 1.0 && ca == 255)
     {
      g_px[i] = c;
      return;
     }
   double sa = ca / 255.0 * MathMin(1.0, cov);
   if(sa <= 0.0)
      return;
   uint d = g_px[i];
   double da = ((d >> 24) & 0xFF) / 255.0;
   double oa = sa + da * (1.0 - sa);
   if(oa <= 0.0)
      return;
   double k = da * (1.0 - sa);
   int r = (int)MathRound((((c >> 16) & 0xFF) * sa + ((d >> 16) & 0xFF) * k) / oa);
   int g = (int)MathRound((((c >> 8) & 0xFF) * sa + ((d >> 8) & 0xFF) * k) / oa);
   int b = (int)MathRound(((c & 0xFF) * sa + (d & 0xFF) * k) / oa);
   g_px[i] = ((uint)MathRound(oa * 255.0) << 24) | ((uint)r << 16) | ((uint)g << 8) | (uint)b;
  }

double Clamp01(const double v)
  {
   return MathMax(0.0, MathMin(1.0, v));
  }

// Retangulo arredondado com antialias (distancia com sinal). stroke > 0: só a borda.
void RoundRect(const double x, const double y, const double w, const double h, const double r, const uint c, const double stroke = 0.0)
  {
   if(g_measure || w <= 0 || h <= 0)
      return;
   double X = x * g_s, Y = y * g_s, W = w * g_s, H = h * g_s;
   double R = MathMin(r * g_s, MathMin(W, H) / 2.0), T = stroke * g_s;
   double cx = X + W / 2.0, cy = Y + H / 2.0, hx = W / 2.0 - R, hy = H / 2.0 - R;
   int x1 = MathMax(0, (int)MathFloor(X)), x2 = MathMin(g_cw, (int)MathCeil(X + W));
   int y1 = MathMax(0, (int)MathFloor(Y)), y2 = MathMin(g_ch, (int)MathCeil(Y + H));
   for(int py = y1; py < y2; py++)
      for(int px = x1; px < x2; px++)
        {
         double qx = MathAbs(px + 0.5 - cx) - hx, qy = MathAbs(py + 0.5 - cy) - hy;
         double ox = MathMax(qx, 0.0), oy = MathMax(qy, 0.0);
         double d = MathSqrt(ox * ox + oy * oy) + MathMin(MathMax(qx, qy), 0.0) - R;
         double cov = Clamp01(0.5 - d);
         if(T > 0)
            cov -= Clamp01(0.5 - (d + T));
         if(cov > 0)
            Blend(px, py, c, cov);
        }
  }

void Circle(const double cx, const double cy, const double r, const uint c, const double stroke = 0.0)
  {
   RoundRect(cx - r, cy - r, 2.0 * r, 2.0 * r, r, c, stroke);
  }

double Atan2(const double y, const double x)
  {
   if(x > 0) return MathArctan(y / x);
   if(x < 0) return MathArctan(y / x) + (y >= 0 ? M_PI : -M_PI);
   if(y > 0) return M_PI / 2.0;
   if(y < 0) return -M_PI / 2.0;
   return 0.0;
  }

// Arco do anel: começa no topo e anda no sentido horário; pontas arredondadas.
void Arc(const double cx, const double cy, const double r, const double thick, double frac, const uint c)
  {
   if(g_measure || frac <= 0)
      return;
   frac = MathMin(1.0, frac);
   double CX = cx * g_s, CY = cy * g_s, R = r * g_s, T = thick * g_s / 2.0;
   double sweep = frac * 2.0 * M_PI;
   double sx = CX, sy = CY - R, ex = CX + R * MathSin(sweep), ey = CY - R * MathCos(sweep);
   int x1 = MathMax(0, (int)MathFloor(CX - R - T - 1)), x2 = MathMin(g_cw, (int)MathCeil(CX + R + T + 1));
   int y1 = MathMax(0, (int)MathFloor(CY - R - T - 1)), y2 = MathMin(g_ch, (int)MathCeil(CY + R + T + 1));
   for(int py = y1; py < y2; py++)
      for(int px = x1; px < x2; px++)
        {
         double dx = px + 0.5 - CX, dy = py + 0.5 - CY;
         double d = MathSqrt(dx * dx + dy * dy);
         double ring = Clamp01(T + 0.5 - MathAbs(d - R));
         if(ring <= 0)
            continue;
         double cov = ring;
         if(frac < 1.0)
           {
            double ang = Atan2(dx, -dy);
            if(ang < 0)
               ang += 2.0 * M_PI;
            if(ang > sweep)
              {
               double d1 = MathSqrt((px + 0.5 - sx) * (px + 0.5 - sx) + (py + 0.5 - sy) * (py + 0.5 - sy));
               double d2 = MathSqrt((px + 0.5 - ex) * (px + 0.5 - ex) + (py + 0.5 - ey) * (py + 0.5 - ey));
               cov = MathMax(Clamp01(T + 0.5 - d1), Clamp01(T + 0.5 - d2));
              }
           }
         if(cov > 0)
            Blend(px, py, c, cov);
        }
  }

// Meio círculo do medidor: vai da esquerda, passa pelo topo e termina à direita.
// frac enche a partir da esquerda; pontas arredondadas.
void HalfArc(const double cx, const double cy, const double r, const double thick, double frac, const uint c)
  {
   if(g_measure || frac <= 0)
      return;
   frac = MathMin(1.0, frac);
   double CX = cx * g_s, CY = cy * g_s, R = r * g_s, T = thick * g_s / 2.0;
   double sweep = frac * M_PI;
   double sx = CX - R, sy = CY, ex = CX - R * MathCos(sweep), ey = CY - R * MathSin(sweep);
   int x1 = MathMax(0, (int)MathFloor(CX - R - T - 1)), x2 = MathMin(g_cw, (int)MathCeil(CX + R + T + 1));
   int y1 = MathMax(0, (int)MathFloor(CY - R - T - 1)), y2 = MathMin(g_ch, (int)MathCeil(CY + T + 1));
   for(int py = y1; py < y2; py++)
      for(int px = x1; px < x2; px++)
        {
         double dx = px + 0.5 - CX, dy = py + 0.5 - CY;
         double ang = Atan2(-dy, -dx);   // 0 na esquerda, PI/2 no topo, PI na direita
         double cov = 0.0;
         if(ang >= 0 && ang <= sweep)
           {
            double d = MathSqrt(dx * dx + dy * dy);
            cov = Clamp01(T + 0.5 - MathAbs(d - R));
           }
         else
           {
            double d1 = MathSqrt((px + 0.5 - sx) * (px + 0.5 - sx) + (py + 0.5 - sy) * (py + 0.5 - sy));
            double d2 = MathSqrt((px + 0.5 - ex) * (px + 0.5 - ex) + (py + 0.5 - ey) * (py + 0.5 - ey));
            cov = MathMax(Clamp01(T + 0.5 - d1), Clamp01(T + 0.5 - d2));
           }
         if(cov > 0)
            Blend(px, py, c, cov);
        }
  }

double SegDist(const double px, const double py, const double ax, const double ay, const double bx, const double by)
  {
   double vx = bx - ax, vy = by - ay, wx = px - ax, wy = py - ay;
   double len = vx * vx + vy * vy;
   double t = (len > 0) ? MathMax(0.0, MathMin(1.0, (wx * vx + wy * vy) / len)) : 0.0;
   double dx = wx - t * vx, dy = wy - t * vy;
   return MathSqrt(dx * dx + dy * dy);
  }

// Linha grossa por pontos (em pontos de tela), com pontas e juntas arredondadas.
void Stroke(const double &xs[], const double &ys[], const bool closed, const double thick, const uint c)
  {
   if(g_measure)
      return;
   int n = ArraySize(xs);
   if(n < 2)
      return;
   double T = thick * g_s / 2.0;
   double minX = xs[0], maxX = xs[0], minY = ys[0], maxY = ys[0];
   for(int i = 1; i < n; i++)
     {
      minX = MathMin(minX, xs[i]); maxX = MathMax(maxX, xs[i]);
      minY = MathMin(minY, ys[i]); maxY = MathMax(maxY, ys[i]);
     }
   int x1 = MathMax(0, (int)MathFloor(minX * g_s - T - 1)), x2 = MathMin(g_cw, (int)MathCeil(maxX * g_s + T + 1));
   int y1 = MathMax(0, (int)MathFloor(minY * g_s - T - 1)), y2 = MathMin(g_ch, (int)MathCeil(maxY * g_s + T + 1));
   int segs = closed ? n : n - 1;
   for(int py = y1; py < y2; py++)
      for(int px = x1; px < x2; px++)
        {
         double best = 1e9;
         for(int s = 0; s < segs; s++)
           {
            int e = (s + 1) % n;
            best = MathMin(best, SegDist(px + 0.5, py + 0.5, xs[s] * g_s, ys[s] * g_s, xs[e] * g_s, ys[e] * g_s));
           }
         double cov = Clamp01(T + 0.5 - best);
         if(cov > 0)
            Blend(px, py, c, cov);
        }
  }

void ShieldIcon(const double x, const double y, const double size, const uint c)
  {
   double k = size / 16.0;
   double xs[] = {8.0, 14.0, 14.0, 12.6, 8.0, 3.4, 2.0, 2.0};
   double ys[] = {1.2, 3.4, 8.2, 11.8, 15.0, 11.8, 8.2, 3.4};
   for(int i = 0; i < 8; i++)
     {
      xs[i] = x + xs[i] * k;
      ys[i] = y + ys[i] * k;
     }
   Stroke(xs, ys, true, MathMax(1.5, 1.7 * k), c);
  }

void CheckIcon(const double x, const double y, const double size, const uint c, const double thick)
  {
   double k = size / 16.0;
   double xs[] = {3.6, 6.7, 12.4};
   double ys[] = {8.3, 11.3, 5.0};
   for(int i = 0; i < 3; i++)
     {
      xs[i] = x + xs[i] * k;
      ys[i] = y + ys[i] * k;
     }
   Stroke(xs, ys, false, thick, c);
  }

void CheckBadge(const double cx, const double cy, const double r, const uint fill, const uint mark)
  {
   Circle(cx, cy, r, fill);
   CheckIcon(cx - r * 0.8, cy - r * 0.8, r * 1.6, mark, MathMax(1.6, r * 0.22));
  }

// Logo do Fortify (mesmo desenho do favicon.svg do site): "F" branco num quadrado
// preto de cantos arredondados, com antialias 4x4. Calculada uma vez por tamanho.
bool LogoInside(const double px, const double py, const double &xs[], const double &ys[])
  {
   bool in = false;
   int n = ArraySize(xs);
   for(int i = 0, j = n - 1; i < n; j = i++)
      if(((ys[i] > py) != (ys[j] > py)) && (px < (xs[j] - xs[i]) * (py - ys[i]) / (ys[j] - ys[i]) + xs[i]))
         in = !in;
   return in;
  }

void DrawLogo(const double x, const double y, const double size)
  {
   if(g_measure)
      return;
   int S = (int)MathRound(size * g_s);
   if(g_logoSize != S)
     {
      double ax[] = {32, 232, 191, 82, 82, 32}, ay[] = {29, 29, 71, 71, 180, 229};
      double bx[] = {110, 162, 110}, by[] = {100, 100, 152};
      double scale = 0.2473, offX = 16.0, offY = 18.97; // viewBox 275x251 dentro de 68x64
      ArrayResize(g_logoSq, S * S);
      ArrayResize(g_logoF, S * S);
      for(int j = 0; j < S; j++)
         for(int i = 0; i < S; i++)
           {
            int inSquare = 0, inF = 0;
            for(int sj = 0; sj < 4; sj++)
               for(int si = 0; si < 4; si++)
                 {
                  double u = (i + (si + 0.5) / 4.0) * 100.0 / S;
                  double v = (j + (sj + 0.5) / 4.0) * 100.0 / S;
                  double cx = MathMax(14.0, MathMin(86.0, u)), cy = MathMax(14.0, MathMin(86.0, v));
                  if((u - cx) * (u - cx) + (v - cy) * (v - cy) > 14.0 * 14.0)
                     continue;
                  inSquare++;
                  double sx = (u - offX) / scale, sy = (v - offY) / scale;
                  if(LogoInside(sx, sy, ax, ay) || LogoInside(sx, sy, bx, by))
                     inF++;
                 }
            g_logoSq[j * S + i] = (uchar)inSquare;
            g_logoF[j * S + i] = (uchar)inF;
           }
      g_logoSize = S;
     }
   int X0 = (int)MathRound(x * g_s), Y0 = (int)MathRound(y * g_s);
   for(int j = 0; j < S; j++)
      for(int i = 0; i < S; i++)
        {
         int sq = g_logoSq[j * S + i];
         if(sq == 0)
            continue;
         Blend(X0 + i, Y0 + j, (uint)0xFF000000, sq / 16.0);
         int f = g_logoF[j * S + i];
         if(f > 0)
            Blend(X0 + i, Y0 + j, P_WHITE, f / 16.0);
        }
  }

//--- texto
double TextWidth(const string s, const double size, const int weight)
  {
   TextSetFont("Segoe UI", (int)MathRound(size * FONT_K * g_s), weight);
   uint w = 0, h = 0;
   TextGetSize(s, w, h);
   return w / g_s;
  }

void Text(const string s, const double x, const double y, const double size, const uint c,
          const int weight = FW_NORMAL, const uint align = TA_LEFT | TA_TOP)
  {
   if(g_measure || s == "")
      return;
   TextSetFont("Segoe UI", (int)MathRound(size * FONT_K * g_s), weight);
   TextOut(s, (int)MathRound(x * g_s), (int)MathRound(y * g_s), align, g_px, g_cw, g_ch, c, COLOR_FORMAT_ARGB_NORMALIZE);
  }

// Corta com "…" para caber na largura.
string FitText(string s, const double maxW, const double size, const int weight)
  {
   if(TextWidth(s, size, weight) <= maxW)
      return s;
   while(StringLen(s) > 1 && TextWidth(s + "…", size, weight) > maxW)
      s = StringSubstr(s, 0, StringLen(s) - 1);
   return Trimmed(s) + "…";
  }

// Quebra o texto em linhas que cabem na largura; a última termina em "…" se sobrar texto.
int WrapWidth(const string text, const double maxW, const double size, const int weight, const int maxLines, string &out[])
  {
   ArrayResize(out, 0);
   string words[];
   int count = StringSplit(text, ' ', words);
   string line = "";
   int lines = 0;
   for(int i = 0; i < count; i++)
     {
      if(words[i] == "")
         continue;
      string candidate = (line == "") ? words[i] : line + " " + words[i];
      if(line != "" && TextWidth(candidate, size, weight) > maxW)
        {
         if(lines == maxLines - 1)
           {
            lines++;
            ArrayResize(out, lines);
            out[lines - 1] = FitText(candidate, maxW, size, weight);
            return lines;
           }
         lines++;
         ArrayResize(out, lines);
         out[lines - 1] = line;
         line = words[i];
        }
      else
         line = candidate;
     }
   if(line != "" && lines < maxLines)
     {
      lines++;
      ArrayResize(out, lines);
      out[lines - 1] = FitText(line, maxW, size, weight);
     }
   return lines;
  }

void AddHit(const double x, const double y, const double w, const double h, const string action)
  {
   if(g_measure)
      return;
   // Conteúdo rolado: desloca e corta na parte visível.
   double y1 = MathMax(g_hitTop, y + g_hitDy), y2 = MathMin(g_hitBottom, y + h + g_hitDy);
   if(y2 <= y1)
      return;
   int n = ArraySize(g_hits);
   ArrayResize(g_hits, n + 1);
   g_hits[n].x1 = x;
   g_hits[n].y1 = y1;
   g_hits[n].x2 = x + w;
   g_hits[n].y2 = y2;
   g_hits[n].action = action;
  }

//--- objetos do gráfico que ficam fora do desenho (linha de quebra e campo do stop)
void Label(const string name, const int x, const int y, const string text, const color clr, const int size,
           const string font = "Segoe UI", const ENUM_ANCHOR_POINT anchor = ANCHOR_LEFT_UPPER)
  {
   string id = PFX + name;
   if(ObjectFind(0, id) < 0)
     {
      ObjectCreate(0, id, OBJ_LABEL, 0, 0, 0);
      ObjectSetInteger(0, id, OBJPROP_CORNER, CORNER_LEFT_UPPER);
      ObjectSetInteger(0, id, OBJPROP_SELECTABLE, false);
      ObjectSetInteger(0, id, OBJPROP_HIDDEN, true);
     }
   ObjectSetInteger(0, id, OBJPROP_XDISTANCE, x);
   ObjectSetInteger(0, id, OBJPROP_YDISTANCE, y);
   ObjectSetInteger(0, id, OBJPROP_ANCHOR, anchor);
   ObjectSetString(0, id, OBJPROP_TEXT, text);
   ObjectSetString(0, id, OBJPROP_FONT, font);
   ObjectSetInteger(0, id, OBJPROP_FONTSIZE, size);
   ObjectSetInteger(0, id, OBJPROP_COLOR, clr);
   MarkUsed(id);
  }

void Edit(const string name, const int x, const int y, const int w, const int h, const string initial)
  {
   string id = PFX + name;
   if(ObjectFind(0, id) < 0)
     {
      ObjectCreate(0, id, OBJ_EDIT, 0, 0, 0);
      ObjectSetInteger(0, id, OBJPROP_CORNER, CORNER_LEFT_UPPER);
      ObjectSetInteger(0, id, OBJPROP_SELECTABLE, false);
      ObjectSetInteger(0, id, OBJPROP_HIDDEN, true);
      ObjectSetString(0, id, OBJPROP_FONT, "Segoe UI Semibold");
      ObjectSetInteger(0, id, OBJPROP_FONTSIZE, 9);
      ObjectSetInteger(0, id, OBJPROP_ALIGN, ALIGN_CENTER);
      ObjectSetString(0, id, OBJPROP_TEXT, initial); // depois disso o texto e do trader
     }
   ObjectSetInteger(0, id, OBJPROP_XDISTANCE, x);
   ObjectSetInteger(0, id, OBJPROP_YDISTANCE, y);
   ObjectSetInteger(0, id, OBJPROP_XSIZE, w);
   ObjectSetInteger(0, id, OBJPROP_YSIZE, h);
   ObjectSetInteger(0, id, OBJPROP_BGCOLOR, ToColor(P_FIELD));
   ObjectSetInteger(0, id, OBJPROP_COLOR, ToColor(P_TEXT));
   ObjectSetInteger(0, id, OBJPROP_BORDER_COLOR, ToColor(P_FIELD));
   ObjectSetInteger(0, id, OBJPROP_ZORDER, 2);
   MarkUsed(id);
  }

// Resultado de 1 lote pela calculadora do MT5. Ela arredonda em centavos, então
// em ativos baratos mede num volume maior e divide, para não perder precisão.
bool ProfitPerLot(const string symbol, const ENUM_ORDER_TYPE type, const double open, const double close, double &perLot)
  {
   double volume = 1.0, result = 0.0;
   bool have = false;
   for(int i = 0; i < 4; i++)
     {
      // Volume alto demais para o ativo: fica com a última medida boa.
      if(!OrderCalcProfit(type, symbol, volume, open, close, result))
         break;
      perLot = result / volume;
      have = true;
      if(MathAbs(result) >= 1000.0)
         break;
      volume *= (result == 0.0) ? 1000.0 : MathCeil(2000.0 / MathAbs(result));
     }
   return have;
  }

// Quanto vale 1 ponto de preco para 1 lote do ativo, na moeda da conta.
double PointValuePerLot(const string symbol)
  {
   // A calculadora do MT5 usa o contrato e a conversão de moeda reais do ativo.
   double px = SymbolInfoDouble(symbol, SYMBOL_ASK), pt = SymbolInfoDouble(symbol, SYMBOL_POINT);
   if(px > 0 && pt > 0)
     {
      double dist = MathMin(1000.0 * pt, px * 0.1), res = 0.0;
      if(ProfitPerLot(symbol, ORDER_TYPE_BUY, px, px - dist, res) && res < 0)
         return -res / (dist / pt);
     }
   double tickValue = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_VALUE_LOSS);
   if(tickValue <= 0)
      tickValue = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_VALUE);
   double tickSize = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_SIZE);
   double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
   if(tickValue <= 0 || tickSize <= 0 || point <= 0)
      return InpPreview ? 1.0 : 0; // demonstração: EURUSD, 1 lote = US$1 por ponto
   return tickValue * point / tickSize;
  }

// Lote maximo em que um stop de `stopPoints` consome so a folga de hoje.
double SimLots(const double budget, const int stopPoints, const double pointValue)
  {
   if(stopPoints <= 0 || pointValue <= 0 || budget <= 0)
      return 0;
   double step = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
   if(step <= 0)
      step = 0.01;
   double lots = MathFloor(budget / (stopPoints * pointValue) / step) * step;
   double maxVolume = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   if(maxVolume > 0)
      lots = MathMin(lots, maxVolume);
   return MathMax(0.0, lots);
  }

// Linha no grafico: preco em que a regra mais apertada quebra, com as posicoes
// abertas neste ativo. As de outros ativos ficam paradas na conta.
void DrawBreakLine(const bool has, const double budget, const string ruleLabel, const int level)
  {
   if(!has || g_collapsed)
      return;
   double net = 0.0;
   for(int i = 0; i < PositionsTotal(); i++)
     {
      if(PositionGetTicket(i) == 0 || PositionGetString(POSITION_SYMBOL) != _Symbol)
         continue;
      double volume = PositionGetDouble(POSITION_VOLUME);
      net += (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) ? volume : -volume;
     }
   if(InpPreview && InpPreviewStress)
      net = 2.0;
   double pointValue = PointValuePerLot(_Symbol);
   double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
   if(net == 0.0 || pointValue <= 0 || point <= 0)
      return;
   double points = MathMax(0.0, budget) / (MathAbs(net) * pointValue);
   double ref = (net > 0) ? SymbolInfoDouble(_Symbol, SYMBOL_BID) : SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   if(ref <= 0)
      ref = iClose(_Symbol, PERIOD_CURRENT, 0);
   if(ref <= 0)
      return;
   double price = (net > 0) ? ref - points * point : ref + points * point;
   color c = LevelColor(MathMax(1, level));
   string text = ruleLabel + " quebra em " + DoubleToString(price, _Digits);
   string id = PFX + "break_line";
   if(ObjectFind(0, id) < 0)
     {
      ObjectCreate(0, id, OBJ_HLINE, 0, 0, price);
      ObjectSetInteger(0, id, OBJPROP_SELECTABLE, false);
      ObjectSetInteger(0, id, OBJPROP_HIDDEN, true);
      ObjectSetInteger(0, id, OBJPROP_STYLE, STYLE_DASH);
      ObjectSetInteger(0, id, OBJPROP_WIDTH, 1);
     }
   ObjectSetDouble(0, id, OBJPROP_PRICE, price);
   ObjectSetInteger(0, id, OBJPROP_COLOR, c);
   ObjectSetString(0, id, OBJPROP_TOOLTIP, text);
   MarkUsed(id);
   int lx = 0, ly = 0;
   if(ChartTimePriceToXY(0, 0, TimeCurrent(), price, lx, ly))
      Label("break_txt", 10, ly - 17, text, c, 8, "Segoe UI Semibold");
  }

string Elapsed()
  {
   if(g_lastOk == 0)
      return "aguardando o Fortify";
   long secs = (long)(TimeLocal() - g_lastOk);
   if(secs < 5)
      return "atualizado agora";
   if(secs < 60)
      return "atualizado há " + IntegerToString(secs) + "s";
   return "atualizado há " + IntegerToString(secs / 60) + " min";
  }

// Regra mais perto do limite e quanto ainda pode perder hoje (só regras ligadas).
void Summarize()
  {
   g_worst = 0;
   g_worstIdx = -1;
   g_slackIdx = -1;
   g_hasCanLose = false;
   g_canLose = 0.0;
   double worstPct = -1.0;
   for(int i = 0; i < ArraySize(g_rules); i++)
     {
      if(!RuleVisible(i))
         continue;
      string k = g_rules[i].kind;
      if(k == "target" || k == "counter" || k == "note")
         continue;
      if(g_rules[i].level > g_worst || (g_rules[i].level == g_worst && g_rules[i].pct > worstPct))
        {
         g_worst = g_rules[i].level;
         worstPct = g_rules[i].pct;
         g_worstIdx = i;
        }
      if(g_rules[i].hasSlack && (!g_hasCanLose || g_rules[i].slack < g_canLose))
        {
         g_canLose = g_rules[i].slack;
         g_hasCanLose = true;
         g_slackIdx = i;
        }
     }
  }

uint ConnectionTone()
  {
   if(g_error != "")
      return P_BREACH;
   if(!g_hasFeed || g_lastOk == 0)
      return P_MUTED;
   if(TimeLocal() - g_lastOk > MathMax(45, 3 * g_pollSeconds))
      return P_WARN;
   return P_OK;
  }

string StageText()
  {
   if(g_stage == "funded")
      return "Funded";
   if(g_stage == "evaluation")
      return "Avaliação";
   return "";
  }

//--- conteúdo das abas
double RenderRuleRow(const int i, double y)
  {
   double inner = PW - 2 * PP;
   string kind = g_rules[i].kind;
   bool info = (kind == "target" || kind == "counter" || ((kind == "daycap" || kind == "tradecap") && g_rules[i].level == 0));
   uint accent = info ? P_INFO : LevelArgb(g_rules[i].level);
   if(g_rules[i].valueDone)
      accent = P_OK;
   bool calm = (g_rules[i].level == 0);

   // Valor à direita: parte apagada ("folga") + número forte ("$3.900").
   double vs = 14.0;
   string main = g_rules[i].valueMain, pre = g_rules[i].valuePre;
   double right = PW - PP;
   double mainW = (main != "") ? TextWidth(main, vs, FW_SEMIBOLD) : 0;
   Text(main, right, y, vs, calm ? P_TEXT : accent, FW_SEMIBOLD, TA_RIGHT | TA_TOP);
   double valueW = mainW;
   if(pre != "")
     {
      Text(pre, right - mainW - 5, y, vs, P_MUTED, FW_NORMAL, TA_RIGHT | TA_TOP);
      valueW += 5 + TextWidth(pre, vs, FW_NORMAL);
     }
   if(g_rules[i].valueDone)
     {
      CheckBadge(right - valueW - 16, y + 10, 9.5, P_OK, P_BG);
      valueW += 28;
     }
   Text(FitText(g_rules[i].label, inner - valueW - 12, 14.0, FW_NORMAL), PP, y, 14.0, P_TEXT);
   AddHit(PP, y - 6, inner, 36, "row:" + g_rules[i].key);
   y += 26;

   bool showBar = (kind != "note") && !(kind == "counter" && !g_rules[i].hasRequired);
   if(showBar)
     {
      RoundRect(PP, y, inner, 6, 3, P_TRACK);
      double pct = MathMin(100.0, MathMax(0.0, g_rules[i].pct));
      double fill = inner * pct / 100.0;
      if(fill > 0)
         RoundRect(PP, y, MathMax(6.0, fill), 6, 3, accent);
      y += 6;
     }
   // Toque na regra: abre a explicação embaixo.
   if(g_expanded == g_rules[i].key && g_rules[i].detailText != "")
     {
      string lines[];
      int n = WrapWidth(g_rules[i].detailText, inner, 11.5, FW_NORMAL, 5, lines);
      y += 9;
      for(int l = 0; l < n; l++)
         Text(lines[l], PP, y + l * 16, 11.5, P_MUTED);
      y += n * 16;
     }
   y += g_compact ? 12 : 18;
   return y;
  }

double RenderMain(double y)
  {
   double inner = PW - 2 * PP;
   if(!g_hasFeed)
     {
      if(g_error == "")
        {
         Text("Conectando ao Fortify...", PP, y, 13, P_MUTED);
         y += 30;
        }
      return y;
     }
   if(g_error == "")
     {
      uint tone = LevelArgb(g_worst);
      // Medidor em meio círculo: o valor que importa (quanto ainda pode perder hoje) fica no
      // centro; o arco esvazia e muda de cor conforme a regra mais apertada aperta.
      double gr = g_compact ? 54.0 : 66.0, gt = g_compact ? 10.0 : 12.0;
      double hh = 44 + gr + gt / 2 + 14;
      // Crítico ou limite: o cartão pisca para chamar o olho.
      double tint = (g_worst >= 2 && (GetTickCount() / 500) % 2 == 0) ? 0.28 : 0.11;
      RoundRect(PP, y, inner, hh, 14, Mix(P_BG, tone, tint));
      RoundRect(PP, y, inner, hh, 14, Argb(tone, 160), 1.2);
      string headline = "Dentro das regras";
      if(g_worstIdx >= 0 && g_worst >= 1)
         headline = g_rules[g_worstIdx].label + " · " + DoubleToString(MathMin(999.0, g_rules[g_worstIdx].pct), 0) + "%";
      ShieldIcon(PP + 15, y + 13, 18, tone);
      Text(FitText(headline, inner - 42 - 16, 15, FW_SEMIBOLD), PP + 41, y + 13, 15, tone, FW_SEMIBOLD);
      double frac = 1.0;
      if(g_slackIdx >= 0 && g_rules[g_slackIdx].limit > 0)
         frac = Clamp01(g_rules[g_slackIdx].slack / g_rules[g_slackIdx].limit);
      double gcx = PP + inner / 2, gcy = y + 44 + gr;
      HalfArc(gcx, gcy, gr, gt, 1.0, Mix(P_BG, tone, 0.22));
      HalfArc(gcx, gcy, gr, gt, frac, tone);
      string lose = g_hasCanLose ? MoneyShort(MathMax(0.0, g_canLose)) : "–";
      double vs = g_compact ? 24.0 : 28.0;
      while(vs > 16 && TextWidth(lose, vs, FW_BOLD) > 2 * (gr - gt) - 6)
         vs -= 1.0;
      Text(lose, gcx, gcy - 6, vs, P_TEXT, FW_BOLD, TA_CENTER | TA_BOTTOM);
      Text("PODE PERDER HOJE", gcx, gcy - 2, 10, P_MUTED, FW_SEMIBOLD, TA_CENTER | TA_TOP);
      y += hh + 14;
      // Os mesmos números da aba Negociação do MT5, com centavos.
      double openResult = g_equityNow - g_balanceNow;
      bool flat = (MathAbs(openResult) < 0.005);
      Text("Saldo", PP, y, 11.5, P_MUTED);
      Text(Money(g_balanceNow), PP, y + 16, 13, P_TEXT, FW_SEMIBOLD);
      Text("Equity", PP + inner / 2, y, 11.5, P_MUTED, FW_NORMAL, TA_CENTER | TA_TOP);
      Text(Money(g_equityNow), PP + inner / 2, y + 16, 13, P_TEXT, FW_SEMIBOLD, TA_CENTER | TA_TOP);
      Text("Em aberto", PP + inner, y, 11.5, P_MUTED, FW_NORMAL, TA_RIGHT | TA_TOP);
      Text((openResult > 0 && !flat ? "+" : "") + Money(flat ? 0.0 : openResult), PP + inner, y + 16, 13,
           flat ? P_TEXT : (openResult > 0 ? P_OK : P_BREACH), FW_SEMIBOLD, TA_RIGHT | TA_TOP);
      y += 36 + 18;
     }

   int shown = 0;
   for(int i = 0; i < ArraySize(g_rules); i++)
     {
      if(!RuleVisible(i) || g_rules[i].kind == "note" || g_rules[i].group == "rules")
         continue;
      y = RenderRuleRow(i, y);
      shown++;
     }
   if(shown == 0)
     {
      Text("Nenhuma regra ao vivo ligada.", PP, y, 13, P_TEXT, FW_SEMIBOLD);
      Text("Abrir Configurações", PP, y + 22, 12.5, P_INFO, FW_SEMIBOLD);
      AddHit(PP, y + 16, 170, 26, "tab:config");
      y += 52;
     }

   if(g_error == "")
     {
      // Simulador: stop em pontos -> lote máximo que cabe no que ainda pode perder hoje.
      RoundRect(PP, y, inner, 1, 0, P_BORDER);
      y += 14;
      Text("Stop", PP, y + 13, 12.5, P_MUTED, FW_NORMAL, TA_LEFT | TA_VCENTER);
      RoundRect(PP + 40, y, 66, 26, 8, P_FIELD);
      RoundRect(PP + 40, y, 66, 26, 8, P_BORDER, 1);
      if(!g_measure)
        {
         g_editOn = true;
         g_editX = PP + 44;
         g_editY = y + 4;
        }
      double pointValue = PointValuePerLot(_Symbol);
      string sim = "pts";
      if(g_hasCanLose && pointValue > 0)
         sim = "pts  →  " + FormatLots(SimLots(g_canLose, g_simStop, pointValue)) + " lotes";
      Text(sim, PP + 116, y + 13, 12.5, P_TEXT, FW_SEMIBOLD, TA_LEFT | TA_VCENTER);
      y += 26 + 14;
      RoundRect(PP, y, inner, 36, 10, P_BREACH);
      Text("FECHAR POSIÇÕES", PP + inner / 2, y + 18, 13, P_WHITE, FW_BOLD, TA_CENTER | TA_VCENTER);
      AddHit(PP, y, inner, 36, "close");
      y += 36 + 14;
     }
   return y;
  }

double RenderNotes(double y)
  {
   double inner = PW - 2 * PP;
   int shown = 0;
   for(int i = 0; i < ArraySize(g_rules); i++)
     {
      if(!RuleVisible(i) || g_rules[i].kind != "note")
         continue;
      if(shown > 0)
        {
         RoundRect(PP, y, inner, 1, 0, P_BORDER);
         y += 14;
        }
      Text(FitText(g_rules[i].label, inner, 13.5, FW_SEMIBOLD), PP, y, 13.5, P_TEXT, FW_SEMIBOLD);
      y += 22;
      string lines[];
      int n = WrapWidth(g_rules[i].message, inner, 12, FW_NORMAL, g_compact ? 3 : 6, lines);
      for(int l = 0; l < n; l++)
         Text(lines[l], PP, y + l * 17, 12, P_MUTED);
      y += n * 17 + 14;
      shown++;
     }
   if(shown == 0)
     {
      Text("Nenhuma regra de texto ligada.", PP, y, 13, P_TEXT, FW_SEMIBOLD);
      Text("Ligue em Configurações o que quer ler aqui.", PP, y + 22, 12, P_MUTED);
      Text("Abrir Configurações", PP, y + 48, 12.5, P_INFO, FW_SEMIBOLD);
      AddHit(PP, y + 42, 170, 26, "tab:config");
      y += 80;
     }
   return y;
  }

//+------------------------------------------------------------------+
//| Aba Mercado: leitura do dia, probabilidade histórica e lote       |
//+------------------------------------------------------------------+
// Como o número sai: o EA olha o contexto de agora no ativo (tendência do
// diário e do H4, zona na faixa de ontem, se já varreu a máxima ou a mínima
// de ontem, sessão) e procura no histórico do próprio MT5 as horas com o
// mesmo contexto. Em cada uma, simula uma compra e uma venda com o mesmo
// stop (ATR do H1) e o mesmo alvo (stop x InpMkRR) e conta quantas vezes o
// alvo veio antes do stop. O lado que se saiu melhor vira o botão.
#define MK_FWD    48     // horas que a operação tem para tocar o stop ou o alvo
#define MK_MIN_N  40     // casos mínimos para mostrar uma probabilidade
#define MK_EDGE   0.03   // vantagem mínima sobre a referência para indicar um lado

double   g_mkRisk = 1000.0;      // quanto o trader quer arriscar (moeda da conta)
string   g_mkSym = "";
datetime g_mkBar = 0;            // H1 em que o estudo foi feito
datetime g_mkTry = 0;
int      g_mkBars = 0;           // barras H1 usadas no estudo (muda quando o MT5 baixa mais histórico)
datetime g_mkSyncSince = 0;      // desde quando espera o histórico sincronizar
bool     g_mkReady = false;
string   g_mkStatus = "Lendo o histórico do ativo...";
datetime g_mkFrom = 0;           // início do histórico estudado
int      g_mkKeyFull[], g_mkKeyMid[], g_mkKeyLow[];
char     g_mkBuy[], g_mkSell[];  // 1 alvo, 0 stop, -1 sem desfecho
// Contexto que não muda dentro da hora.
double   g_mkPdh = 0, g_mkPdl = 0, g_mkAtr = 0;
int      g_mkTrendNow = 2;
// Leitura de agora.
int      g_mkZone = 0, g_mkSweep = 0, g_mkSession = 0, g_mkLevel = 0;
double   g_mkP = 0.0;
int      g_mkN = 0, g_mkSide = 0;    // 1 compra, -1 venda, 0 sem indicação
int      g_mkProbSide = 1;           // lado da probabilidade mostrada
datetime g_mkNewsTime = 0;           // horário da notícia forte (servidor)
string   g_mkNewsName = "";
datetime g_mkNewsCheck = 0;
// Campo do valor a arriscar (objeto de edição por cima do desenho).
bool     g_mkEditOn = false;
double   g_mkEditX = 0, g_mkEditY = 0, g_mkEditW = 0;

void MkEma(const MqlRates &r[], const int period, double &out[])
  {
   int n = ArraySize(r);
   ArrayResize(out, n);
   if(n == 0)
      return;
   double k = 2.0 / (period + 1.0);
   out[0] = r[0].close;
   for(int i = 1; i < n; i++)
      out[i] = r[i].close * k + out[i - 1] * (1.0 - k);
  }

// 0 Ásia, 1 Londres, 2 Nova York (hora de Greenwich).
int MkSessionOf(const datetime gmt)
  {
   MqlDateTime t;
   TimeToStruct(gmt, t);
   if(t.hour >= 7 && t.hour < 12)
      return 1;
   if(t.hour >= 12 && t.hour < 21)
      return 2;
   return 0;
  }

// 0 diário e H4 em alta, 1 os dois em baixa, 2 em direções opostas.
int MkTrend(const bool d1Up, const bool h4Up)
  {
   if(d1Up && h4Up)
      return 0;
   if(!d1Up && !h4Up)
      return 1;
   return 2;
  }

int MkKeyFull(const int tr, const int zone, const int sweep, const int ses) { return ((tr * 2 + zone) * 4 + sweep) * 3 + ses; }
int MkKeyMid(const int tr, const int zone, const int sweep)                 { return (tr * 2 + zone) * 4 + sweep; }
int MkKeyLow(const int tr, const int zone)                                  { return tr * 2 + zone; }

// Compra entra no ask e sai no bid; venda o contrário. Stop e alvo na mesma hora contam como stop.
char MkOutcome(const MqlRates &r[], const int k, const int n, const double entry, const int dir,
               const double risk, const double target, const double spread)
  {
   double sl = entry - dir * risk, tp = entry + dir * target;
   for(int f = k + 1; f < n && f <= k + MK_FWD; f++)
     {
      bool hitSl = (dir > 0) ? (r[f].low <= sl) : (r[f].high + spread >= sl);
      bool hitTp = (dir > 0) ? (r[f].high >= tp) : (r[f].low + spread <= tp);
      if(hitSl)
         return 0;
      if(hitTp)
         return 1;
     }
   return -1;
  }

// ---------------------------------------------------------------------------
// Microestrutura institucional (SMC) no H1: varredura de liquidez, CHoCH/BOS,
// order block e FVG. A mesma engine alimenta o estudo histórico (probabilidade),
// o stop técnico da aba Mercado e as marcações no gráfico. Só usa velas fechadas:
// um topo/fundo da vela i só existe depois de SMC_L velas (sem olhar o futuro).
#define SMC_L          3      // velas de cada lado para confirmar um topo/fundo
#define SMC_SWEEP_BARS 36     // a varredura vale se veio até 36 h antes do rompimento
#define SMC_SETUP_BARS 24     // o reteste vale até 24 h depois do rompimento
#define SMC_ZONES_KEEP 48     // zonas guardadas durante a leitura (as mais novas)
#define SMC_DRAW_BARS  700    // velas H1 lidas para a leitura recente e o desenho
#define SMC_DRAW_ZONES 4      // zonas desenhadas por tipo e lado
#define SMC_DRAW_EVENTS 8     // rompimentos (CHoCH/BOS) desenhados
#define SMC_DRAW_ARROWS 8     // setas de confluência desenhadas
#define SMC_PFX        "FG_SMC_"   // = PFX + "SMC_": o painel não apaga, OnInit/OnDeinit apagam

struct SmcZone
  {
   int      dir;      // 1 zona de compra (demanda), -1 de venda (oferta)
   int      kind;     // 0 order block, 1 FVG
   datetime t0;       // vela que formou a zona
   double   lo, hi;
   int      born;     // vela em que a zona passou a existir
   bool     alive;    // false: preço fechou além dela (OB) ou preencheu o gap (FVG)
   bool     used;     // já gerou uma confluência (um trade por zona)
  };

struct SmcEvent
  {
   datetime t;        // vela que confirmou o rompimento
   datetime tFrom;    // topo/fundo rompido
   double   price;
   int      dir;
   bool     choch;    // true: mudança de caráter; false: continuação (BOS)
  };

struct SmcArrow
  {
   datetime t;
   double   price;
   int      dir;
  };

// Estudo histórico das confluências (MkBuild): direção e desfecho por vela H1.
char     g_mkSmcDir[];      // 1 confluência de compra, -1 de venda, 0 nenhuma
char     g_mkSmcOut[];      // 1 alvo, 0 stop, -1 sem desfecho
double   g_mkSmcP = 0.0;    // frequência histórica de alvo do setup de agora
int      g_mkSmcN = 0;      // casos usados
int      g_mkSmcLevel = -1; // 0 mesma tendência e zona, 1 só a direção, -1 poucos casos
int      g_mkTrigger = 0;   // 1 gatilho de compra, -1 de venda, 0 aguardando
// Leitura recente (gráfico e leitura ao vivo).
SmcZone  g_smcZones[];
SmcEvent g_smcEvents[];
SmcArrow g_smcArrows[];
int      g_smcN = 0;                    // velas fechadas lidas
int      g_smcArmBull = -1000000, g_smcArmBullSweep = 0;
int      g_smcArmBear = -1000000, g_smcArmBearSweep = 0;
double   g_smcAtr = 0.0, g_smcSpread = 0.0;
datetime g_smcBar = 0;                  // vela H1 aberta da última leitura
string   g_smcSym = "";
bool     g_smcOn = true;                // marcações no gráfico ligadas (Configurações)
bool     g_smcDrawn = false;
// Confluência de agora.
int      g_smcLiveDir = 0;
double   g_smcLiveStop = 0.0;
int      g_smcLiveZone = -1;            // índice em g_smcZones da zona em reteste
int      g_smcLiveDrawn = -2;           // zona destacada no desenho atual

// Guarda uma zona nova. Descarta as mortas e, se passar do limite, as mais velhas.
void SmcAddZone(SmcZone &z[], const int dir, const int kind, const datetime t0, const double lo, const double hi, const int born)
  {
   if(hi <= lo)
      return;
   int n = ArraySize(z);
   if(n >= SMC_ZONES_KEEP)
     {
      int w = 0;
      for(int i = 0; i < n; i++)
         if(z[i].alive)
            z[w++] = z[i];
      if(w >= SMC_ZONES_KEEP)
        {
         // Continua cheio: sai a mais velha.
         for(int i = 1; i < w; i++)
            z[i - 1] = z[i];
         w--;
        }
      n = w;
      ArrayResize(z, n);
     }
   ArrayResize(z, n + 1);
   z[n].dir = dir;
   z[n].kind = kind;
   z[n].t0 = t0;
   z[n].lo = lo;
   z[n].hi = hi;
   z[n].born = born;
   z[n].alive = true;
   z[n].used = false;
  }

// Stop técnico: alguns ticks além da zona. Válido entre 0,25 e 3 ATR do H1.
bool SmcStopOk(const int dir, const double entry, const double stop, const double atr)
  {
   if(atr <= 0 || stop <= 0)
      return false;
   double dist = (dir > 0) ? entry - stop : stop - entry;
   return dist >= 0.25 * atr && dist <= 3.0 * atr;
  }

// Roda a engine nas velas fechadas r[0..n-1] (da mais antiga para a mais nova).
// dirOut/stopOut: a confluência de cada vela (a vela que retestou a zona e fechou a favor).
// collect = true guarda zonas, rompimentos, setas e o estado final para o gráfico e a leitura ao vivo.
void SmcRun(const MqlRates &r[], const int n, const double spread, const bool collect, char &dirOut[], double &stopOut[])
  {
   ArrayResize(dirOut, MathMax(n, 0));
   ArrayResize(stopOut, MathMax(n, 0));
   if(n > 0)
     {
      ArrayInitialize(dirOut, 0);
      ArrayInitialize(stopOut, 0.0);
     }
   SmcZone zones[];
   ArrayResize(zones, 0);
   if(collect)
     {
      ArrayResize(g_smcEvents, 0);
      ArrayResize(g_smcArrows, 0);
     }
   double hiPx = 0, loPx = 0;
   int hiIdx = -1, loIdx = -1;
   bool hiBroken = true, loBroken = true;
   int trend = 0;
   int sweepBull = -1000000, sweepBear = -1000000;
   int armBull = -1000000, armBear = -1000000, armBullSweep = 0, armBearSweep = 0;
   double trSum = 0, atr = 0;
   double tr[];
   ArrayResize(tr, MathMax(n, 1));
   for(int k = 0; k < n; k++)
     {
      double prevClose = (k > 0) ? r[k - 1].close : r[k].open;
      tr[k] = MathMax(r[k].high, prevClose) - MathMin(r[k].low, prevClose);
      trSum += tr[k];
      if(k >= 14)
         trSum -= tr[k - 14];
      atr = (k >= 13) ? trSum / 14.0 : 0.0;

      // 1. Topo/fundo da vela k - SMC_L, confirmado agora.
      int c = k - SMC_L;
      if(c >= SMC_L)
        {
         bool isHi = true, isLo = true;
         for(int j = 1; j <= SMC_L && (isHi || isLo); j++)
           {
            if(r[c - j].high >= r[c].high || r[c + j].high > r[c].high)
               isHi = false;
            if(r[c - j].low <= r[c].low || r[c + j].low < r[c].low)
               isLo = false;
           }
         if(isHi)
           {
            hiPx = r[c].high;
            hiIdx = c;
            hiBroken = false;
           }
         if(isLo)
           {
            loPx = r[c].low;
            loIdx = c;
            loBroken = false;
           }
        }

      // 2. Varredura de liquidez: pavio além do topo/fundo e fechamento de volta para dentro.
      if(!loBroken && loIdx >= 0 && loIdx < k && r[k].low < loPx && r[k].close > loPx)
         sweepBull = k;
      if(!hiBroken && hiIdx >= 0 && hiIdx < k && r[k].high > hiPx && r[k].close < hiPx)
         sweepBear = k;

      // 3. Zonas existentes: invalida pelo fechamento (OB) ou pelo preenchimento (FVG).
      for(int i = 0; i < ArraySize(zones); i++)
        {
         if(!zones[i].alive || zones[i].born >= k)
            continue;
         if(zones[i].dir > 0)
           {
            if(r[k].close < zones[i].lo || (zones[i].kind == 1 && r[k].low <= zones[i].lo))
               zones[i].alive = false;
           }
         else if(r[k].close > zones[i].hi || (zones[i].kind == 1 && r[k].high >= zones[i].hi))
            zones[i].alive = false;
        }

      // 4. Rompimento com o corpo: BOS (a favor) ou CHoCH (contra a estrutura anterior).
      if(!hiBroken && hiIdx >= 0 && r[k].close > hiPx)
        {
         hiBroken = true;
         bool choch = (trend == -1);
         trend = 1;
         // Order block: última vela de baixa antes do impulso que rompeu.
         int m = hiIdx;
         for(int j = hiIdx; j <= k; j++)
            if(r[j].low < r[m].low)
               m = j;
         int ob = m;
         for(int j = m; j >= MathMax(0, m - 10); j--)
            if(r[j].close < r[j].open)
              {
               ob = j;
               break;
              }
         SmcAddZone(zones, 1, 0, r[ob].time, r[ob].low, r[ob].high, k);
         armBear = -1000000;
         if(k - sweepBull <= SMC_SWEEP_BARS)
           {
            armBull = k;
            armBullSweep = sweepBull;
           }
         if(collect)
           {
            int e = ArraySize(g_smcEvents);
            ArrayResize(g_smcEvents, e + 1);
            g_smcEvents[e].t = r[k].time;
            g_smcEvents[e].tFrom = r[hiIdx].time;
            g_smcEvents[e].price = hiPx;
            g_smcEvents[e].dir = 1;
            g_smcEvents[e].choch = choch;
           }
        }
      if(!loBroken && loIdx >= 0 && r[k].close < loPx)
        {
         loBroken = true;
         bool choch = (trend == 1);
         trend = -1;
         int m = loIdx;
         for(int j = loIdx; j <= k; j++)
            if(r[j].high > r[m].high)
               m = j;
         int ob = m;
         for(int j = m; j >= MathMax(0, m - 10); j--)
            if(r[j].close > r[j].open)
              {
               ob = j;
               break;
              }
         SmcAddZone(zones, -1, 0, r[ob].time, r[ob].low, r[ob].high, k);
         armBull = -1000000;
         if(k - sweepBear <= SMC_SWEEP_BARS)
           {
            armBear = k;
            armBearSweep = sweepBear;
           }
         if(collect)
           {
            int e = ArraySize(g_smcEvents);
            ArrayResize(g_smcEvents, e + 1);
            g_smcEvents[e].t = r[k].time;
            g_smcEvents[e].tFrom = r[loIdx].time;
            g_smcEvents[e].price = loPx;
            g_smcEvents[e].dir = -1;
            g_smcEvents[e].choch = choch;
           }
        }

      // 5. FVG: vão entre a vela k-2 e a vela k (mínimo de 0,1 ATR para não marcar ruído).
      if(k >= 2 && atr > 0)
        {
         double minGap = atr * 0.1;
         if(r[k].low - r[k - 2].high >= minGap)
            SmcAddZone(zones, 1, 1, r[k - 1].time, r[k - 2].high, r[k].low, k);
         if(r[k - 2].low - r[k].high >= minGap)
            SmcAddZone(zones, -1, 1, r[k - 1].time, r[k].high, r[k - 2].low, k);
        }

      // 6. Confluência: varredura -> rompimento -> reteste de OB/FVG formado depois da varredura.
      double buffer = MathMax(2.0 * spread, 0.1 * atr);
      for(int side = 1; side >= -1; side -= 2)
        {
         int arm = (side > 0) ? armBull : armBear;
         int swp = (side > 0) ? armBullSweep : armBearSweep;
         if(arm < 0 || k <= arm || k - arm > SMC_SETUP_BARS || atr <= 0)
            continue;
         int best = -1;
         for(int i = 0; i < ArraySize(zones); i++)
           {
            if(!zones[i].alive || zones[i].used || zones[i].dir != side || zones[i].born >= k || zones[i].born < swp)
               continue;
            bool touch = (side > 0) ? (r[k].low <= zones[i].hi && r[k].close > zones[i].lo)
                                    : (r[k].high >= zones[i].lo && r[k].close < zones[i].hi);
            if(touch && (best < 0 || zones[i].born > zones[best].born))
               best = i;
           }
         if(best < 0)
            continue;
         double entry = (side > 0) ? r[k].close + spread : r[k].close;
         double stop = (side > 0) ? zones[best].lo - buffer : zones[best].hi + buffer;
         zones[best].used = true;
         if(!SmcStopOk(side, entry, stop, atr) || dirOut[k] != 0)
            continue;
         dirOut[k] = (char)side;
         stopOut[k] = stop;
         if(collect)
           {
            int a = ArraySize(g_smcArrows);
            ArrayResize(g_smcArrows, a + 1);
            g_smcArrows[a].t = r[k].time;
            g_smcArrows[a].price = (side > 0) ? r[k].low - 0.3 * atr : r[k].high + 0.3 * atr;
            g_smcArrows[a].dir = side;
           }
        }
     }

   if(!collect)
      return;
   int w = 0;
   for(int i = 0; i < ArraySize(zones); i++)
      if(zones[i].alive)
         zones[w++] = zones[i];
   ArrayResize(zones, w);
   ArrayResize(g_smcZones, w);
   for(int i = 0; i < w; i++)
      g_smcZones[i] = zones[i];
   g_smcN = n;
   g_smcArmBull = armBull;
   g_smcArmBullSweep = armBullSweep;
   g_smcArmBear = armBear;
   g_smcArmBearSweep = armBearSweep;
   g_smcAtr = atr;
   g_smcSpread = spread;
  }

// Leitura recente do H1 (gráfico e leitura ao vivo): refaz a cada vela H1 nova.
void SmcRefresh()
  {
   datetime bar = iTime(_Symbol, PERIOD_H1, 0);
   if(bar == 0 || (bar == g_smcBar && g_smcSym == _Symbol))
      return;
   MqlRates rates[];
   int got = CopyRates(_Symbol, PERIOD_H1, 0, SMC_DRAW_BARS, rates);
   if(got < 60)
      return;
   double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
   double spread = (double)SymbolInfoInteger(_Symbol, SYMBOL_SPREAD) * point;
   char dirs[];
   double stops[];
   // A última vela ainda está aberta: fica de fora da leitura.
   SmcRun(rates, got - 1, spread, true, dirs, stops);
   g_smcBar = bar;
   g_smcSym = _Symbol;
   g_smcDrawn = false;
  }

// Confluência agora: a vela H1 aberta retestando uma zona válida depois de varredura + rompimento.
void SmcLiveCheck()
  {
   g_smcLiveDir = 0;
   g_smcLiveStop = 0.0;
   g_smcLiveZone = -1;
   if(g_smcN <= 0 || g_smcSym != _Symbol || g_smcAtr <= 0)
      return;
   double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID), ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double lo = iLow(_Symbol, PERIOD_H1, 0), hi = iHigh(_Symbol, PERIOD_H1, 0);
   if(bid <= 0 || ask <= 0 || lo <= 0 || hi <= 0)
      return;
   double buffer = MathMax(2.0 * g_smcSpread, 0.1 * g_smcAtr);
   int bestArm = -1;
   for(int side = 1; side >= -1; side -= 2)
     {
      int arm = (side > 0) ? g_smcArmBull : g_smcArmBear;
      int swp = (side > 0) ? g_smcArmBullSweep : g_smcArmBearSweep;
      // A vela aberta é a de índice g_smcN.
      if(arm < 0 || g_smcN - arm > SMC_SETUP_BARS || arm <= bestArm)
         continue;
      int best = -1;
      for(int i = 0; i < ArraySize(g_smcZones); i++)
        {
         if(!g_smcZones[i].alive || g_smcZones[i].used || g_smcZones[i].dir != side || g_smcZones[i].born < swp)
            continue;
         bool touch = (side > 0) ? (lo <= g_smcZones[i].hi && bid > g_smcZones[i].lo)
                                 : (hi >= g_smcZones[i].lo && ask < g_smcZones[i].hi);
         if(touch && (best < 0 || g_smcZones[i].born > g_smcZones[best].born))
            best = i;
        }
      if(best < 0)
         continue;
      double entry = (side > 0) ? ask : bid;
      double stop = (side > 0) ? g_smcZones[best].lo - buffer : g_smcZones[best].hi + buffer;
      if(!SmcStopOk(side, entry, stop, g_smcAtr))
         continue;
      g_smcLiveDir = side;
      g_smcLiveStop = stop;
      g_smcLiveZone = best;
      bestArm = arm;
     }
  }

// Frequência histórica de alvo das confluências desta direção (mesma tendência e zona, senão só a direção).
void SmcStats(const int dir)
  {
   g_mkSmcP = 0.0;
   g_mkSmcN = 0;
   g_mkSmcLevel = -1;
   int key = MkKeyLow(g_mkTrendNow, g_mkZone);
   int n = ArraySize(g_mkSmcDir);
   for(int level = 0; level < 2; level++)
     {
      int wins = 0, cnt = 0;
      for(int k = 0; k < n; k++)
        {
         if(g_mkSmcDir[k] != dir || g_mkSmcOut[k] < 0)
            continue;
         if(level == 0 && (k >= ArraySize(g_mkKeyLow) || g_mkKeyLow[k] != key))
            continue;
         cnt++;
         wins += g_mkSmcOut[k];
        }
      if(cnt >= MK_MIN_N)
        {
         g_mkSmcLevel = level;
         g_mkSmcN = cnt;
         g_mkSmcP = (double)wins / cnt;
         return;
        }
      if(level == 1)
        {
         g_mkSmcN = cnt;
         g_mkSmcP = (cnt > 0) ? (double)wins / cnt : 0.0;
        }
     }
  }

// ---- Marcações no gráfico (objetos FG_SMC_*). Só desenha quando a leitura muda. ----
void SmcProps(const string name, const color c)
  {
   ObjectSetInteger(0, name, OBJPROP_COLOR, c);
   ObjectSetInteger(0, name, OBJPROP_SELECTABLE, false);
   ObjectSetInteger(0, name, OBJPROP_SELECTED, false);
   ObjectSetInteger(0, name, OBJPROP_HIDDEN, true);
   ObjectSetInteger(0, name, OBJPROP_BACK, true);
  }

void SmcText(const string name, const datetime t, const double price, const string text, const color c,
             const ENUM_ANCHOR_POINT anchor, const int size)
  {
   if(ObjectFind(0, name) < 0)
      ObjectCreate(0, name, OBJ_TEXT, 0, t, price);
   ObjectMove(0, name, 0, t, price);
   ObjectSetString(0, name, OBJPROP_TEXT, text);
   ObjectSetString(0, name, OBJPROP_FONT, "Segoe UI Semibold");
   ObjectSetInteger(0, name, OBJPROP_FONTSIZE, size);
   ObjectSetInteger(0, name, OBJPROP_ANCHOR, anchor);
   SmcProps(name, c);
  }

void SmcClear()
  {
   ObjectsDeleteAll(0, SMC_PFX);
  }

void SmcDraw()
  {
   // Leitura de outro ativo (o gráfico trocou e o histórico novo ainda não chegou): nada de zona velha.
   if(g_smcSym != _Symbol)
     {
      if(ObjectsTotal(0, 0, -1) > 0)
         SmcClear();
      g_smcDrawn = false;
      return;
     }
   if(!g_smcOn)
     {
      if(!g_smcDrawn)
        {
         SmcClear();
         ChartRedraw(0);
         g_smcDrawn = true;
        }
      return;
     }
   if(g_smcDrawn && g_smcLiveDrawn == g_smcLiveZone)
      return;
   SmcClear();
   bool light = IsLightChart();
   color bullFill = light ? C'214,240,224' : C'22,64,44';
   color bearFill = light ? C'250,222,222' : C'74,28,32';
   color bullGap  = light ? C'216,231,250' : C'26,46,82';
   color bearGap  = light ? C'250,234,214' : C'78,54,22';
   color bullInk  = light ? C'22,128,72' : C'72,214,140';
   color bearInk  = light ? C'200,40,48' : C'240,96,100';
   color mutedInk = light ? C'110,116,128' : C'150,156,168';
   datetime right = TimeCurrent() + PeriodSeconds(PERIOD_H1) * 8;

   // Zonas vivas: as mais novas de cada tipo e lado.
   for(int dir = 1; dir >= -1; dir -= 2)
      for(int kind = 0; kind < 2; kind++)
        {
         int shown = 0;
         for(int i = ArraySize(g_smcZones) - 1; i >= 0 && shown < SMC_DRAW_ZONES; i--)
           {
            if(g_smcZones[i].dir != dir || g_smcZones[i].kind != kind || !g_smcZones[i].alive)
               continue;
            string name = SMC_PFX + "Z" + IntegerToString(i);
            color fill = (kind == 0) ? (dir > 0 ? bullFill : bearFill) : (dir > 0 ? bullGap : bearGap);
            ObjectCreate(0, name, OBJ_RECTANGLE, 0, g_smcZones[i].t0, g_smcZones[i].hi, right, g_smcZones[i].lo);
            ObjectSetInteger(0, name, OBJPROP_FILL, true);
            SmcProps(name, fill);
            string tag = (kind == 0 ? "OB" : "FVG") + string(dir > 0 ? " compra" : " venda") + " · H1";
            SmcText(SMC_PFX + "ZT" + IntegerToString(i), g_smcZones[i].t0, dir > 0 ? g_smcZones[i].lo : g_smcZones[i].hi,
                    tag, dir > 0 ? bullInk : bearInk, dir > 0 ? ANCHOR_LEFT_UPPER : ANCHOR_LEFT_LOWER, 7);
            shown++;
           }
        }

   // Zona que define o stop técnico da aba Mercado agora: contorno forte.
   if(g_smcLiveZone >= 0 && g_smcLiveZone < ArraySize(g_smcZones))
     {
      SmcZone z = g_smcZones[g_smcLiveZone];
      string name = SMC_PFX + "LIVE";
      ObjectCreate(0, name, OBJ_RECTANGLE, 0, z.t0, z.hi, right, z.lo);
      ObjectSetInteger(0, name, OBJPROP_FILL, false);
      ObjectSetInteger(0, name, OBJPROP_WIDTH, 2);
      SmcProps(name, z.dir > 0 ? bullInk : bearInk);
      SmcText(SMC_PFX + "LIVET", right, z.dir > 0 ? z.hi : z.lo, "Zona do stop técnico",
              z.dir > 0 ? bullInk : bearInk, z.dir > 0 ? ANCHOR_RIGHT_LOWER : ANCHOR_RIGHT_UPPER, 8);
     }

   // Rompimentos: linha pontilhada no nível rompido e o nome (CHoCH ou BOS).
   int ne = ArraySize(g_smcEvents);
   for(int e = MathMax(0, ne - SMC_DRAW_EVENTS); e < ne; e++)
     {
      color ink = g_smcEvents[e].dir > 0 ? bullInk : bearInk;
      string ln = SMC_PFX + "EL" + IntegerToString(e);
      ObjectCreate(0, ln, OBJ_TREND, 0, g_smcEvents[e].tFrom, g_smcEvents[e].price, g_smcEvents[e].t, g_smcEvents[e].price);
      ObjectSetInteger(0, ln, OBJPROP_STYLE, STYLE_DOT);
      ObjectSetInteger(0, ln, OBJPROP_RAY_RIGHT, false);
      SmcProps(ln, ink);
      SmcText(SMC_PFX + "ET" + IntegerToString(e), g_smcEvents[e].t, g_smcEvents[e].price,
              g_smcEvents[e].choch ? "CHoCH" : "BOS", ink,
              g_smcEvents[e].dir > 0 ? ANCHOR_RIGHT_LOWER : ANCHOR_RIGHT_UPPER, 8);
     }

   // Setas de confluência total (varredura -> rompimento -> reteste da zona).
   int na = ArraySize(g_smcArrows);
   for(int a = MathMax(0, na - SMC_DRAW_ARROWS); a < na; a++)
     {
      string name = SMC_PFX + "A" + IntegerToString(a);
      ObjectCreate(0, name, OBJ_ARROW, 0, g_smcArrows[a].t, g_smcArrows[a].price);
      ObjectSetInteger(0, name, OBJPROP_ARROWCODE, g_smcArrows[a].dir > 0 ? 233 : 234);
      ObjectSetInteger(0, name, OBJPROP_ANCHOR, g_smcArrows[a].dir > 0 ? ANCHOR_TOP : ANCHOR_BOTTOM);
      ObjectSetInteger(0, name, OBJPROP_WIDTH, 1);
      SmcProps(name, g_smcArrows[a].dir > 0 ? bullInk : bearInk);
     }
   if(ArraySize(g_smcZones) == 0 && ne == 0)
      SmcText(SMC_PFX + "NONE", TimeCurrent(), SymbolInfoDouble(_Symbol, SYMBOL_BID), "Sem estrutura H1 suficiente", mutedInk, ANCHOR_RIGHT, 8);
   g_smcLiveDrawn = g_smcLiveZone;
   g_smcDrawn = true;
   ChartRedraw(0);
  }

bool MkBuild()
  {
   string sym = g_mkSym;
   // Só estuda com o histórico sincronizado com a corretora (espera até 30 s).
   bool synced = SeriesInfoInteger(sym, PERIOD_H1, SERIES_SYNCHRONIZED) && SeriesInfoInteger(sym, PERIOD_H4, SERIES_SYNCHRONIZED)
                 && SeriesInfoInteger(sym, PERIOD_D1, SERIES_SYNCHRONIZED);
   if(!synced)
     {
      if(g_mkSyncSince == 0)
         g_mkSyncSince = TimeLocal();
      if(TimeLocal() - g_mkSyncSince < 30)
        {
         g_mkStatus = "Sincronizando o histórico do " + sym + "...";
         return false;
        }
     }
   g_mkSyncSince = 0;
   MqlRates h1[], h4[], d1[];
   int n1 = CopyRates(sym, PERIOD_H1, 0, MathMin(MathMax(Bars(sym, PERIOD_H1), 1), 20000), h1);
   int n4 = CopyRates(sym, PERIOD_H4, 0, MathMin(MathMax(Bars(sym, PERIOD_H4), 1), 6000), h4);
   int nd = CopyRates(sym, PERIOD_D1, 0, MathMin(MathMax(Bars(sym, PERIOD_D1), 1), 1500), d1);
   if(n1 < 1500 || n4 < 120 || nd < 80)
     {
      g_mkStatus = "Baixando o histórico do " + sym + "...";
      return false;
     }
   double e4[], ed[];
   MkEma(h4, 20, e4);
   MkEma(d1, 50, ed);
   double point = SymbolInfoDouble(sym, SYMBOL_POINT);
   double spread = (double)SymbolInfoInteger(sym, SYMBOL_SPREAD) * point;
   // Fuso do servidor em blocos de 30 min (a diferença entre os relógios pode vir com segundos a mais).
   long offset = (long)MathRound((double)(TimeTradeServer() - TimeGMT()) / 1800.0) * 1800;

   ArrayResize(g_mkKeyFull, n1);
   ArrayResize(g_mkKeyMid, n1);
   ArrayResize(g_mkKeyLow, n1);
   ArrayResize(g_mkBuy, n1);
   ArrayResize(g_mkSell, n1);
   ArrayInitialize(g_mkKeyFull, -1);
   ArrayInitialize(g_mkKeyMid, -1);
   ArrayInitialize(g_mkKeyLow, -1);
   ArrayInitialize(g_mkBuy, -1);
   ArrayInitialize(g_mkSell, -1);

   double tr[];
   ArrayResize(tr, n1);
   double trSum = 0;
   int j4 = 0, jd = 0;
   datetime curDay = 0;
   double dayHi = 0, dayLo = 0;
   for(int k = 0; k < n1; k++)
     {
      double prevClose = (k > 0) ? h1[k - 1].close : h1[k].open;
      tr[k] = MathMax(h1[k].high, prevClose) - MathMin(h1[k].low, prevClose);
      trSum += tr[k];
      if(k >= 14)
         trSum -= tr[k - 14];
      datetime dayStart = h1[k].time - h1[k].time % 86400;
      if(dayStart != curDay)
        {
         curDay = dayStart;
         dayHi = h1[k].high;
         dayLo = h1[k].low;
        }
      else
        {
         dayHi = MathMax(dayHi, h1[k].high);
         dayLo = MathMin(dayLo, h1[k].low);
        }
      if(k < 14 || k + 1 >= n1)          // a hora que ainda está aberta fica de fora
         continue;
      datetime closeT = h1[k].time + 3600;
      while(jd + 1 < nd && d1[jd + 1].time < dayStart)
         jd++;
      while(j4 + 1 < n4 && h4[j4 + 1].time + 14400 <= closeT)
         j4++;
      if(jd < 50 || j4 < 20 || d1[jd].time >= dayStart || h4[j4].time + 14400 > closeT)
         continue;
      double pdh = d1[jd].high, pdl = d1[jd].low;
      double risk = trSum / 14.0 * InpMkStopAtr;
      if(pdh <= pdl || risk <= 0)
         continue;
      int trend = MkTrend(d1[jd].close > ed[jd], h4[j4].close > e4[j4]);
      int zone = ((h1[k].close - pdl) / (pdh - pdl) >= 0.5) ? 1 : 0;
      int sweep = (dayHi > pdh ? 1 : 0) + (dayLo < pdl ? 2 : 0);
      int ses = MkSessionOf((datetime)(closeT - offset));
      g_mkKeyFull[k] = MkKeyFull(trend, zone, sweep, ses);
      g_mkKeyMid[k] = MkKeyMid(trend, zone, sweep);
      g_mkKeyLow[k] = MkKeyLow(trend, zone);
      double target = risk * InpMkRR;
      g_mkBuy[k] = MkOutcome(h1, k, n1, h1[k].close + spread, 1, risk, target, spread);
      g_mkSell[k] = MkOutcome(h1, k, n1, h1[k].close, -1, risk, target, spread);
     }

   // Confluências SMC no mesmo histórico, testadas com o trade real: entrada no fechamento
   // da vela do reteste, stop técnico além da zona e alvo = stop x InpMkRR.
   double smcStop[];
   SmcRun(h1, n1 - 1, spread, false, g_mkSmcDir, smcStop);
   ArrayResize(g_mkSmcDir, n1);
   g_mkSmcDir[n1 - 1] = 0;
   ArrayResize(g_mkSmcOut, n1);
   ArrayInitialize(g_mkSmcOut, -1);
   for(int k = 0; k < n1 - 1; k++)
     {
      if(g_mkSmcDir[k] == 0)
         continue;
      int dir = g_mkSmcDir[k];
      double entry = (dir > 0) ? h1[k].close + spread : h1[k].close;
      double risk = (dir > 0) ? entry - smcStop[k] : smcStop[k] - entry;
      if(risk <= 0)
         continue;
      g_mkSmcOut[k] = MkOutcome(h1, k, n1, entry, dir, risk, risk * InpMkRR, spread);
     }
   int smcB = 0, smcS = 0, smcBw = 0, smcSw = 0;
   for(int k = 0; k < n1; k++)
     {
      if(g_mkSmcOut[k] < 0)
         continue;
      if(g_mkSmcDir[k] > 0)
        {
         smcB++;
         smcBw += g_mkSmcOut[k];
        }
      else if(g_mkSmcDir[k] < 0)
        {
         smcS++;
         smcSw += g_mkSmcOut[k];
        }
     }
   PrintFormat("Fortify SMC %s: %d velas H1; confluências com desfecho: compra %d (alvo %d), venda %d (alvo %d)",
               sym, n1, smcB, smcBw, smcS, smcSw);
   g_mkFrom = h1[0].time;

   // Contexto de agora que só muda com a hora: dia anterior, H4 fechado e ATR.
   datetime now = TimeCurrent();
   datetime today = now - now % 86400;
   int pd = -1;
   for(int i = nd - 1; i >= 0; i--)
      if(d1[i].time < today)
        {
         pd = i;
         break;
        }
   int p4 = -1;
   for(int i = n4 - 1; i >= 0; i--)
      if(h4[i].time + 14400 <= now)
        {
         p4 = i;
         break;
        }
   if(pd < 0 || p4 < 0)
     {
      g_mkStatus = "Histórico do " + sym + " incompleto.";
      return false;
     }
   g_mkPdh = d1[pd].high;
   g_mkPdl = d1[pd].low;
   g_mkTrendNow = MkTrend(d1[pd].close > ed[pd], h4[p4].close > e4[p4]);
   double s = 0;
   for(int i = n1 - 15; i < n1 - 1; i++)
      s += tr[i];
   g_mkAtr = s / 14.0;
   return g_mkAtr > 0 && g_mkPdh > g_mkPdl;
  }

void MkCount(const int level, const int key, int &bw, int &bn, int &sw, int &sn)
  {
   bw = 0; bn = 0; sw = 0; sn = 0;
   int n = ArraySize(g_mkBuy);
   for(int k = 0; k < n; k++)
     {
      int kk = (level == 0) ? g_mkKeyFull[k] : (level == 1) ? g_mkKeyMid[k] : g_mkKeyLow[k];
      if(kk != key)
         continue;
      if(g_mkBuy[k] >= 0)
        {
         bn++;
         bw += g_mkBuy[k];
        }
      if(g_mkSell[k] >= 0)
        {
         sn++;
         sw += g_mkSell[k];
        }
     }
  }

// Notícia forte da moeda do ativo, de 5 min atrás até 30 min à frente (calendário do MT5).
// Roda em qualquer aba (o aviso aparece também no Painel): usa o ativo do gráfico.
string g_mkNewsSym = "";
void MkNews()
  {
   datetime now = TimeTradeServer();
   if(g_mkNewsSym != _Symbol)
     {
      g_mkNewsSym = _Symbol;
      g_mkNewsCheck = 0;
     }
   if(now - g_mkNewsCheck < 60)
      return;
   g_mkNewsCheck = now;
   g_mkNewsTime = 0;
   g_mkNewsName = "";
   string c1 = SymbolInfoString(_Symbol, SYMBOL_CURRENCY_BASE), c2 = SymbolInfoString(_Symbol, SYMBOL_CURRENCY_PROFIT);
   MqlCalendarValue vals[];
   ResetLastError();
   if(CalendarValueHistory(vals, now - 300, now + 1800) <= 0)
      return;
   for(int i = 0; i < ArraySize(vals); i++)
     {
      MqlCalendarEvent ev;
      MqlCalendarCountry country;
      if(!CalendarEventById(vals[i].event_id, ev) || ev.importance != CALENDAR_IMPORTANCE_HIGH)
         continue;
      if(!CalendarCountryById(ev.country_id, country) || (country.currency != c1 && country.currency != c2))
         continue;
      if(g_mkNewsName == "" || vals[i].time < g_mkNewsTime)
        {
         g_mkNewsTime = vals[i].time;
         g_mkNewsName = ev.name;
        }
     }
  }

// Minutos até a notícia forte, arredondados para cima: 0 ou menos = já saiu.
int MkNewsMinutes()
  {
   return (int)MathCeil((double)(g_mkNewsTime - TimeTradeServer()) / 60.0);
  }

// Há notícia forte nos próximos 30 min (ou saiu há até 5 min)?
bool MkNewsSoon()
  {
   if(g_mkNewsName == "")
      return false;
   int mins = MkNewsMinutes();
   return mins <= 30 && mins >= -5;
  }

string MkNewsWhen()
  {
   int mins = MkNewsMinutes();
   return (mins <= 0) ? "agora" : "em " + IntegerToString(mins) + " min";
  }

// Amarelo até 15 min antes; vermelho a 15 min ou menos (e logo depois de sair).
uint MkNewsColor()
  {
   return (MkNewsMinutes() <= 15) ? P_BREACH : P_WARN;
  }

// Leitura de agora (preço, máxima e mínima do dia, sessão) e a probabilidade.
void MkLive()
  {
   double bid = SymbolInfoDouble(g_mkSym, SYMBOL_BID);
   if(bid <= 0)
      bid = iClose(g_mkSym, PERIOD_H1, 0);
   datetime now = TimeCurrent();
   datetime today = now - now % 86400;
   double hi = bid, lo = bid;
   if(iTime(g_mkSym, PERIOD_D1, 0) == today)
     {
      hi = MathMax(hi, iHigh(g_mkSym, PERIOD_D1, 0));
      lo = MathMin(lo, iLow(g_mkSym, PERIOD_D1, 0));
     }
   g_mkZone = ((bid - g_mkPdl) / (g_mkPdh - g_mkPdl) >= 0.5) ? 1 : 0;
   g_mkSweep = (hi > g_mkPdh ? 1 : 0) + (lo < g_mkPdl ? 2 : 0);
   g_mkSession = MkSessionOf(TimeGMT());

   // Do contexto mais completo para o mais simples, até ter casos suficientes.
   int bw = 0, bn = 0, sw = 0, sn = 0;
   g_mkLevel = -1;
   for(int level = 0; level < 3; level++)
     {
      int key = (level == 0) ? MkKeyFull(g_mkTrendNow, g_mkZone, g_mkSweep, g_mkSession)
                : (level == 1) ? MkKeyMid(g_mkTrendNow, g_mkZone, g_mkSweep) : MkKeyLow(g_mkTrendNow, g_mkZone);
      MkCount(level, key, bw, bn, sw, sn);
      if(MathMin(bn, sn) >= MK_MIN_N)
        {
         g_mkLevel = level;
         break;
        }
     }
   double pb = (bn > 0) ? (double)bw / bn : 0.0, ps = (sn > 0) ? (double)sw / sn : 0.0;
   g_mkProbSide = (pb >= ps) ? 1 : -1;
   g_mkSide = g_mkProbSide;
   g_mkP = MathMax(pb, ps);
   g_mkN = (g_mkSide > 0) ? bn : sn;
   // Gatilho: confluência SMC acontecendo agora, com histórico suficiente do mesmo setup e
   // frequência de alvo acima da referência (1 / (1 + R:R)). Nunca com notícia forte perto.
   double base = 1.0 / (1.0 + InpMkRR);
   SmcLiveCheck();
   g_mkTrigger = 0;
   g_mkSmcP = 0.0;
   g_mkSmcN = 0;
   g_mkSmcLevel = -1;
   if(g_smcLiveDir != 0)
     {
      SmcStats(g_smcLiveDir);
      if(g_mkSmcLevel >= 0 && g_mkSmcP >= base + MK_EDGE && !MkNewsSoon())
         g_mkTrigger = g_smcLiveDir;
     }
   // Só o gatilho destaca um lado; sem ele, o trader escolhe sem indicação.
   g_mkSide = g_mkTrigger;
  }

void MkUpdate()
  {
   datetime bar = iTime(_Symbol, PERIOD_H1, 0);
   int bars = Bars(_Symbol, PERIOD_H1);
   if(g_mkSym != _Symbol)
     {
      g_mkSym = _Symbol;
      g_mkReady = false;
      g_mkTry = 0;
      g_mkNewsCheck = 0;
      g_mkStatus = "Lendo o histórico do " + _Symbol + "...";
     }
   // Estudo novo a cada hora; se falhar, o anterior continua valendo.
   // Também refaz quando chega histórico novo (o MT5 ainda estava baixando).
   if((!g_mkReady || bar != g_mkBar || bars != g_mkBars) && TimeLocal() - g_mkTry >= 3)
     {
      g_mkTry = TimeLocal();
      if(MkBuild())
        {
         g_mkReady = true;
         g_mkBar = bar;
         g_mkBars = bars;
        }
     }
   if(!g_mkReady)
      return;
   MkNews();
   SmcRefresh();
   MkLive();
  }

string MkPrice(const double price)
  {
   string s = DoubleToString(price, (int)SymbolInfoInteger(g_mkSym, SYMBOL_DIGITS));
   StringReplace(s, ".", ",");
   return s;
  }

double g_mkGainUsed = 0.0;       // ganho real no alvo com o lote calculado

// Perda e ganho reais de 1 lote, pela calculadora do MT5 (valor do tick e tamanho do contrato
// do próprio ativo). dir 1 compra, -1 venda, 0 o pior dos dois lados.
bool MkPerLot(const int dir, const double stopDist, double &lossPerLot, double &gainPerLot)
  {
   double ask = SymbolInfoDouble(g_mkSym, SYMBOL_ASK), bid = SymbolInfoDouble(g_mkSym, SYMBOL_BID);
   if(ask <= 0 || bid <= 0 || stopDist <= 0)
      return false;
   double tpDist = stopDist * InpMkRR, a = 0, b = 0, c = 0, d = 0;
   if(dir > 0)
     {
      if(!ProfitPerLot(g_mkSym, ORDER_TYPE_BUY, ask, ask - stopDist, a) || !ProfitPerLot(g_mkSym, ORDER_TYPE_BUY, ask, ask + tpDist, c))
         return false;
      lossPerLot = -a;
      gainPerLot = c;
      return lossPerLot > 0;
     }
   if(dir < 0)
     {
      if(!ProfitPerLot(g_mkSym, ORDER_TYPE_SELL, bid, bid + stopDist, b) || bid - tpDist <= 0
         || !ProfitPerLot(g_mkSym, ORDER_TYPE_SELL, bid, bid - tpDist, d))
         return false;
      lossPerLot = -b;
      gainPerLot = d;
      return lossPerLot > 0;
     }
   if(!ProfitPerLot(g_mkSym, ORDER_TYPE_BUY, ask, ask - stopDist, a) || !ProfitPerLot(g_mkSym, ORDER_TYPE_SELL, bid, bid + stopDist, b)
      || !ProfitPerLot(g_mkSym, ORDER_TYPE_BUY, ask, ask + tpDist, c))
      return false;
   lossPerLot = MathMax(-a, -b);
   gainPerLot = c;
   // Em ativo muito barato o alvo da venda pode cair abaixo de zero: aí vale só o da compra.
   if(bid - tpDist > 0 && ProfitPerLot(g_mkSym, ORDER_TYPE_SELL, bid, bid - tpDist, d))
      gainPerLot = MathMin(c, d);
   return lossPerLot > 0;
  }

// Stop de cada lado: o técnico (além do order block/FVG do H1 em reteste) quando há confluência
// nesse lado; senão o de volatilidade (ATR do H1 x InpMkStopAtr). Devolve a distância até o stop
// a partir do preço de entrada de agora e o preço do stop. dir 0: o de volatilidade, para os dois lados.
double MkStopFor(const int dir, double &slPrice, bool &technical)
  {
   technical = false;
   double atrDist = g_mkAtr * InpMkStopAtr;
   double entry = (dir > 0) ? SymbolInfoDouble(_Symbol, SYMBOL_ASK) : SymbolInfoDouble(_Symbol, SYMBOL_BID);
   // Stop técnico só com o gatilho ativo nesse lado: o painel e o botão usam sempre o mesmo stop.
   if(dir != 0 && g_mkTrigger == dir && g_smcLiveDir == dir && g_smcLiveStop > 0 && entry > 0)
     {
      double dist = (dir > 0) ? entry - g_smcLiveStop : g_smcLiveStop - entry;
      if(dist > 0)
        {
         technical = true;
         slPrice = g_smcLiveStop;
         return dist;
        }
     }
   slPrice = (entry > 0 && dir != 0) ? entry - dir * atrDist : 0.0;
   return atrDist;
  }

// Lote para o valor que o trader quer arriscar, com o stop do lado escolhido e as regras da mesa.
double MkLots(const int dir, const double stopDist, double &riskUsed, string &warn)
  {
   warn = "";
   riskUsed = 0;
   g_mkGainUsed = 0;
   double lossPerLot = 0, gainPerLot = 0;
   if(!MkPerLot(dir, stopDist, lossPerLot, gainPerLot))
     {
      warn = "Sem cotação para calcular o valor deste ativo agora.";
      return 0;
     }
   double risk = g_mkRisk;
   if(g_hasCanLose && risk > g_canLose)
     {
      risk = MathMax(0.0, g_canLose);
      warn = "Hoje a mesa deixa perder no máximo " + MoneyShort(risk) + ". O lote foi calculado com esse valor.";
     }
   double step = SymbolInfoDouble(g_mkSym, SYMBOL_VOLUME_STEP);
   double minVol = SymbolInfoDouble(g_mkSym, SYMBOL_VOLUME_MIN);
   double maxVol = SymbolInfoDouble(g_mkSym, SYMBOL_VOLUME_MAX);
   if(step <= 0)
      step = 0.01;
   double lots = MathFloor(risk / lossPerLot / step + 1e-9) * step;
   if(maxVol > 0)
      lots = MathMin(lots, maxVol);
   // Limite de lote da mesa, se estiver ligado.
   for(int i = 0; i < ArraySize(g_rules); i++)
     {
      if(!RuleVisible(i) || g_rules[i].kind != "lots" || !g_rules[i].hasLimit || g_rules[i].limit <= 0)
         continue;
      double cap = g_rules[i].limit;
      if(g_rules[i].mode != "per_order")
        {
         double open = 0;
         for(int p = 0; p < PositionsTotal(); p++)
            if(PositionGetTicket(p) != 0)
               open += PositionGetDouble(POSITION_VOLUME);
         cap -= open;
        }
      cap = MathFloor(MathMax(0.0, cap) / step + 1e-9) * step;
      if(lots > cap)
        {
         lots = cap;
         warn = "Lote limitado pela regra da mesa (" + FormatLots(g_rules[i].limit) + " lotes).";
        }
     }
   if(minVol > 0 && lots < minVol)
     {
      warn = "Com " + MoneyShort(risk) + " o stop de hoje não cabe nem no lote mínimo (" + FormatLots(minVol) + ").";
      return 0;
     }
   riskUsed = lots * lossPerLot;
   g_mkGainUsed = lots * gainPerLot;
   return lots;
  }

// Preço alinhado ao passo de cotação do ativo.
double MkTickRound(const double price)
  {
   double tick = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   if(tick <= 0)
      return NormalizeDouble(price, _Digits);
   return NormalizeDouble(MathRound(price / tick) * tick, _Digits);
  }

// Entrada com um clique: lote, stop e alvo da aba Mercado, sempre com confirmação.
void MkPlaceOrder(const int dir)
  {
   if(!g_mkReady)
     {
      g_notice = "Espere a leitura do ativo terminar.";
      return;
     }
   string sideName = (dir > 0) ? "Comprar" : "Vender";
   double slTech = 0;
   bool technical = false;
   double stopDist = MkStopFor(dir, slTech, technical), tpDist = stopDist * InpMkRR;
   double riskUsed = 0;
   string warn = "";
   double lots = MkLots(dir, stopDist, riskUsed, warn);
   if(lots <= 0)
     {
      g_notice = (warn != "") ? warn : "Não deu para calcular o lote com esse valor.";
      return;
     }
   if(!TerminalInfoInteger(TERMINAL_TRADE_ALLOWED) || !MQLInfoInteger(MQL_TRADE_ALLOWED))
     {
      g_notice = "Ative o Algo Trading no MT5 para o botão conseguir abrir a operação.";
      return;
     }
   if(SymbolInfoInteger(_Symbol, SYMBOL_TRADE_MODE) != SYMBOL_TRADE_MODE_FULL &&
      SymbolInfoInteger(_Symbol, SYMBOL_TRADE_MODE) != (dir > 0 ? SYMBOL_TRADE_MODE_LONGONLY : SYMBOL_TRADE_MODE_SHORTONLY))
     {
      g_notice = "A corretora não aceita essa operação no " + _Symbol + " agora (mercado fechado ou só fechamento).";
      return;
     }
   double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
   long stopsLevel = SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL);
   if(stopsLevel > 0 && stopDist < stopsLevel * point)
     {
      g_notice = "O stop de hoje fica mais perto do que a corretora permite (" + IntegerToString(stopsLevel) + " pts).";
      return;
     }
   double entry = (dir > 0) ? SymbolInfoDouble(_Symbol, SYMBOL_ASK) : SymbolInfoDouble(_Symbol, SYMBOL_BID);
   if(entry <= 0)
     {
      g_notice = "Sem cotação do " + _Symbol + " agora.";
      return;
     }
   double margin = 0;
   if(OrderCalcMargin(dir > 0 ? ORDER_TYPE_BUY : ORDER_TYPE_SELL, _Symbol, lots, entry, margin)
      && margin > AccountInfoDouble(ACCOUNT_MARGIN_FREE))
     {
      g_notice = "Margem livre insuficiente para " + FormatLots(lots) + " lotes (precisa de " + MoneyShort(margin) + ").";
      return;
     }

   // Confirmação com tudo o que vai ser enviado.
   double slShow = technical ? slTech : entry - dir * stopDist;
   string q = sideName + " " + FormatLots(lots) + " lotes de " + _Symbol + " agora, a mercado?\n\n"
              + "Stop loss: " + MkPrice(MkTickRound(slShow)) + "  (-" + MoneyShort(riskUsed) + ")"
              + (technical ? "  · técnico, além da zona do H1\n" : "  · volatilidade (ATR do H1)\n")
              + "Take profit: " + MkPrice(MkTickRound(entry + dir * tpDist)) + "  (+" + MoneyShort(g_mkGainUsed) + ")\n"
              + "Risco x retorno: 1 : " + DoubleToString(InpMkRR, InpMkRR == MathFloor(InpMkRR) ? 0 : 1);
   if(warn != "")
      q += "\n\n" + warn;
   if(g_mkTrigger != 0 && g_mkTrigger != dir)
      q += "\n\nAtenção: o gatilho ativo agora é do outro lado.";
   if(MkNewsSoon())
     {
      int mins = MkNewsMinutes();
      q += "\n\nAtenção: Notícia de Alto Impacto " + (mins > 0 ? "em " + IntegerToString(mins) + " minutos" : "agora")
           + " (" + g_mkNewsName + "). Muitas mesas desclassificam operações durante notícias fortes. Deseja prosseguir?";
     }
   q += "\n\nStop e alvo podem escorregar com o preço em movimento.";
   if(MessageBox(q, "Fortify Guard", MB_YESNO | (dir > 0 && !MkNewsSoon() ? MB_ICONQUESTION : MB_ICONWARNING)) != IDYES)
      return;

   // Preço de agora (pode ter mudado durante a confirmação).
   entry = (dir > 0) ? SymbolInfoDouble(_Symbol, SYMBOL_ASK) : SymbolInfoDouble(_Symbol, SYMBOL_BID);
   double sl, tp;
   if(technical)
     {
      // O stop técnico fica preso ao nível da zona; o alvo segue o R:R do stop real.
      double dist2 = (dir > 0) ? entry - slTech : slTech - entry;
      if(dist2 <= 0 || dist2 > stopDist * 1.15 || (stopsLevel > 0 && dist2 < stopsLevel * point))
        {
         g_notice = "O preço andou durante a confirmação e o stop técnico não cabe mais no risco escolhido. Confira e tente de novo.";
         return;
        }
      sl = MkTickRound(slTech);
      tp = MkTickRound(entry + dir * dist2 * InpMkRR);
     }
   else
     {
      sl = MkTickRound(entry - dir * stopDist);
      tp = MkTickRound(entry + dir * tpDist);
     }
   g_trade.SetTypeFillingBySymbol(_Symbol);
   bool ok = (dir > 0) ? g_trade.Buy(lots, _Symbol, 0.0, sl, tp, "Fortify Mercado")
                       : g_trade.Sell(lots, _Symbol, 0.0, sl, tp, "Fortify Mercado");
   uint code = g_trade.ResultRetcode();
   if(ok && (code == TRADE_RETCODE_DONE || code == TRADE_RETCODE_PLACED || code == TRADE_RETCODE_DONE_PARTIAL))
      g_notice = (dir > 0 ? "Compra" : "Venda") + " aberta: " + FormatLots(g_trade.ResultVolume() > 0 ? g_trade.ResultVolume() : lots)
                 + " lotes de " + _Symbol + ", stop " + MkPrice(sl) + " e alvo " + MkPrice(tp) + ".";
   else
      g_notice = "A ordem não foi aceita: " + g_trade.ResultRetcodeDescription() + " (código " + IntegerToString(code) + ").";
   g_lastPoll = 0;
  }

double MkRow(const string label, const string value, const double y, const uint valueColor)
  {
   double inner = PW - 2 * PP;
   Text(label, PP + 14, y + 15, 12.5, P_MUTED, FW_NORMAL, TA_LEFT | TA_VCENTER);
   Text(value, PP + inner - 14, y + 15, 13, valueColor, FW_SEMIBOLD, TA_RIGHT | TA_VCENTER);
   return y + 30;
  }

double RenderMarket(double y)
  {
   double inner = PW - 2 * PP;
   Text(_Symbol + " · leitura de hoje", PP, y, 13.5, P_TEXT, FW_SEMIBOLD);
   y += 26;

   // Quanto quer arriscar.
   Text("Quanto quer arriscar", PP, y + 14, 12.5, P_MUTED, FW_NORMAL, TA_LEFT | TA_VCENTER);
   double fw = 112, fx = PP + inner - fw;
   RoundRect(fx, y, fw, 28, 8, P_FIELD);
   RoundRect(fx, y, fw, 28, 8, P_BORDER, 1);
   Text(CurrencySymbol(), fx - 8, y + 14, 12.5, P_MUTED, FW_SEMIBOLD, TA_RIGHT | TA_VCENTER);
   if(!g_measure)
     {
      g_mkEditOn = true;
      g_mkEditX = fx + 4;
      g_mkEditY = y + 5;
      g_mkEditW = fw - 8;
     }
   y += 28 + 16;

   if(!g_mkReady)
     {
      Text(g_mkStatus, PP, y, 12.5, P_MUTED);
      return y + 30;
     }

   // Índice de probabilidade: com confluência SMC, a frequência histórica de alvo desse mesmo
   // setup (mesmo stop técnico e R:R); sem ela, a do contexto do ativo. Abaixo, o gatilho.
   uint tone = (g_mkTrigger > 0) ? P_OK : (g_mkTrigger < 0) ? P_BREACH : P_MUTED;
   bool news = MkNewsSoon();
   bool smcProb = (g_smcLiveDir != 0 && g_mkSmcLevel >= 0);
   double ch = news ? 162 : 126;
   RoundRect(PP, y, inner, ch, 14, Mix(P_BG, tone, 0.10));
   RoundRect(PP, y, inner, ch, 14, Argb(tone, 140), 1.2);
   Text(smcProb ? "Índice de probabilidade · confluência SMC" : "Probabilidade de ganho", PP + 16, y + 14, 12.5, P_MUTED);
   bool hasProb = smcProb || (g_mkLevel >= 0);
   double pShow = smcProb ? g_mkSmcP : g_mkP;
   string pTxt = hasProb ? DoubleToString(pShow * 100.0, 0) + "%" : "–";
   Text(pTxt, PP + 14, y + 32, 40, P_TEXT, FW_BOLD);
   if(hasProb)
     {
      double px = PP + 14 + TextWidth(pTxt, 40, FW_BOLD) + 10;
      Text("de probabilidade estatística", px, y + 44, 12, P_TEXT, FW_SEMIBOLD);
      string sub = smcProb ? (g_smcLiveDir > 0 ? "compra · " : "venda · ") + IntegerToString(g_mkSmcN) + " casos iguais"
                           : (g_mkProbSide > 0 ? "na compra" : "na venda");
      Text(sub, px, y + 62, 11, P_MUTED);
     }
   // Gatilho de ação.
   string trig;
   uint trigC;
   if(g_mkTrigger > 0)
     {
      trig = "GATILHO DE COMPRA ATIVO";
      trigC = P_OK;
     }
   else if(g_mkTrigger < 0)
     {
      trig = "GATILHO DE VENDA ATIVO";
      trigC = P_BREACH;
     }
   else if(g_smcLiveDir != 0 && news)
     {
      trig = "PAUSADO: NOTÍCIA FORTE";
      trigC = MkNewsColor();
     }
   else if(g_smcLiveDir != 0)
     {
      trig = "CONFLUÊNCIA SEM VANTAGEM HISTÓRICA";
      trigC = P_WARN;
     }
   else
     {
      trig = "AGUARDANDO CONFLUÊNCIA";
      trigC = P_MUTED;
     }
   double ty = y + 88;
   RoundRect(PP + 12, ty, inner - 24, 28, 8, (g_mkTrigger != 0) ? trigC : Mix(P_BG, trigC, 0.14));
   Text(trig, PP + inner / 2, ty + 14, 12.5, (g_mkTrigger != 0) ? P_WHITE : trigC, FW_BOLD, TA_CENTER | TA_VCENTER);
   if(news)
     {
      double ny = y + 124;
      uint nc = MkNewsColor();
      RoundRect(PP + 12, ny, inner - 24, 26, 8, Mix(P_BG, nc, 0.18));
      string nt = "Notícia de alto impacto " + MkNewsWhen() + " · " + g_mkNewsName;
      Text(FitText(nt, inner - 48, 12, FW_SEMIBOLD), PP + inner / 2, ny + 13, 12, nc, FW_SEMIBOLD, TA_CENTER | TA_VCENTER);
     }
   y += ch + 14;

   // Lote, stop, alvo e risco x retorno: do lado do gatilho (stop técnico) ou, sem gatilho,
   // o stop de volatilidade, que vale para os dois lados.
   int dSide = g_mkTrigger;
   double slPrice = 0;
   bool technical = false;
   double stopDist = MkStopFor(dSide, slPrice, technical), tpDist = stopDist * InpMkRR;
   double riskUsed = 0;
   string warn = "";
   double lots = MkLots(dSide, stopDist, riskUsed, warn);
   double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
   long stopPts = (point > 0) ? (long)MathRound(stopDist / point) : 0;
   long tpPts = (point > 0) ? (long)MathRound(tpDist / point) : 0;
   // Quatro pílulas que se leem de relance: quanto entra, quanto pode perder, quanto pode ganhar.
   int dir = (g_mkSide != 0) ? g_mkSide : 1;
   double entry = (dir > 0) ? SymbolInfoDouble(_Symbol, SYMBOL_ASK) : SymbolInfoDouble(_Symbol, SYMBOL_BID);
   bool priced = (g_mkSide != 0 && entry > 0);
   string slSub = priced ? "em " + MkPrice(technical ? slPrice : entry - dir * stopDist) : IntegerToString(stopPts) + " pts";
   string tpSub = priced ? "em " + MkPrice(entry + dir * tpDist) : IntegerToString(tpPts) + " pts";
   string rrTxt = "1 : " + DoubleToString(InpMkRR, InpMkRR == MathFloor(InpMkRR) ? 0 : 1);
   double cw = (inner - 8) / 2.0, chH = g_compact ? 52.0 : 58.0;
   for(int k = 0; k < 4; k++)
     {
      double cx = PP + (k % 2) * (cw + 8), cy = y + (k / 2) * (chH + 8);
      string lab, val, sub;
      uint vc = P_TEXT;
      if(k == 0)
        {
         lab = "Lote";
         val = lots > 0 ? FormatLots(lots) : "–";
         sub = lots > 0 ? "risco " + MoneyShort(riskUsed) : "";
        }
      else if(k == 1)
        {
         lab = "Risco x retorno";
         val = rrTxt;
         sub = lots > 0 ? "ganho " + MoneyShort(g_mkGainUsed) : "";
        }
      else if(k == 2)
        {
         lab = technical ? "Stop técnico" : "Stop";
         val = lots > 0 ? "-" + MoneyShort(riskUsed) : IntegerToString(stopPts) + " pts";
         sub = lots > 0 ? slSub : (priced ? slSub : "");
         vc = P_BREACH;
        }
      else
        {
         lab = "Alvo";
         val = lots > 0 ? "+" + MoneyShort(g_mkGainUsed) : IntegerToString(tpPts) + " pts";
         sub = lots > 0 ? tpSub : (priced ? tpSub : "");
         vc = P_OK;
        }
      RoundRect(cx, cy, cw, chH, 12, P_FIELD);
      RoundRect(cx, cy, cw, chH, 12, P_BORDER, 1);
      Text(lab, cx + 12, cy + 8, 11, P_MUTED);
      Text(FitText(val, cw - 24, 15, FW_BOLD), cx + 12, cy + (g_compact ? 21 : 23), 15, vc, FW_BOLD);
      if(sub != "")
         Text(FitText(sub, cw - 24, 11, FW_NORMAL), cx + 12, cy + chH - (g_compact ? 17 : 19), 11, P_MUTED);
     }
   y += 2 * chH + 8 + 12;

   // Entrada com um clique. Com gatilho: um botão só, grande, na cor do lado certo; o outro lado
   // continua possível por um link discreto. Sem gatilho: os dois lados, sem destaque.
   bool can = (lots > 0);
   if(can && g_mkTrigger != 0)
     {
      int d = g_mkTrigger;
      uint c = (d > 0) ? P_OK : P_BREACH;
      double bh = 56;
      RoundRect(PP, y + 3, inner, bh, 12, Argb(c, 50));
      RoundRect(PP, y, inner, bh, 12, c);
      Text((d > 0) ? "COMPRAR AGORA" : "VENDER AGORA", PP + inner / 2, y + 11, 16, P_WHITE, FW_BOLD, TA_CENTER | TA_TOP);
      Text(FormatLots(lots) + (lots < 2.0 ? " lote" : " lotes") + " · stop e alvo já posicionados",
           PP + inner / 2, y + 34, 11, Argb(P_WHITE, 225), FW_SEMIBOLD, TA_CENTER | TA_TOP);
      AddHit(PP, y, inner, bh, (d > 0) ? "mkbuy" : "mksell");
      y += bh + 8;
      string other = (d > 0) ? "vender" : "comprar";
      string pre = "ou ", post = " mesmo assim";
      double w1 = TextWidth(pre, 11.5, FW_NORMAL), w2 = TextWidth(other, 11.5, FW_SEMIBOLD), w3 = TextWidth(post, 11.5, FW_NORMAL);
      double lx = PP + inner / 2 - (w1 + w2 + w3) / 2;
      Text(pre, lx, y, 11.5, P_MUTED);
      Text(other, lx + w1, y, 11.5, P_MUTED, FW_SEMIBOLD);
      RoundRect(lx + w1, y + 17, w2, 1, 0, Argb(P_MUTED, 150));
      Text(post, lx + w1 + w2, y, 11.5, P_MUTED);
      AddHit(lx + w1 - 6, y - 6, w2 + 12, 28, (d > 0) ? "mksell" : "mkbuy");
      y += 24;
     }
   else
     {
      double bw = (inner - 10) / 2.0, bh = 44;
      for(int b = 0; b < 2; b++)
        {
         int d = (b == 0) ? 1 : -1;
         double bx = PP + b * (bw + 10);
         uint c = (d > 0) ? P_OK : P_BREACH;
         if(!can)
           {
            RoundRect(bx, y, bw, bh, 10, P_CARD);
            RoundRect(bx, y, bw, bh, 10, P_BORDER, 1);
           }
         else
           {
            RoundRect(bx, y, bw, bh, 10, Mix(P_BG, c, 0.12));
            RoundRect(bx, y, bw, bh, 10, Argb(c, 170), 1.2);
           }
         Text((d > 0) ? "COMPRAR AGORA" : "VENDER AGORA", bx + bw / 2, y + bh / 2, 13, can ? P_TEXT : P_MUTED, FW_BOLD, TA_CENTER | TA_VCENTER);
         if(can)
            AddHit(bx, y, bw, bh, (d > 0) ? "mkbuy" : "mksell");
        }
      y += bh + 8;
      Text(can ? "Stop e alvo já posicionados · pede confirmação" : "Ajuste o valor para liberar a entrada.",
           PP + inner / 2, y, 11, P_MUTED, FW_NORMAL, TA_CENTER | TA_TOP);
      y += 24;
     }
   // Resultado da última ordem (ou o motivo de não ter enviado), logo abaixo dos botões.
   if(g_notice != "")
     {
      string nl[];
      int nn = WrapWidth(g_notice, inner - 24, 12, FW_NORMAL, 4, nl);
      double nh = 16 + nn * 18;
      RoundRect(PP, y, inner, nh, 10, Mix(P_BG, P_WARN, 0.12));
      RoundRect(PP, y, inner, nh, 10, Argb(P_WARN, 150), 1);
      for(int l = 0; l < nn; l++)
         Text(nl[l], PP + 12, y + 8 + l * 18, 12, P_TEXT);
      y += nh + 14;
     }

   if(warn != "")
     {
      string lines[];
      int n = WrapWidth(warn, inner, 11.5, FW_NORMAL, 3, lines);
      for(int l = 0; l < n; l++)
         Text(lines[l], PP, y + l * 17, 11.5, P_WARN);
      y += n * 17 + 10;
     }

   // O que fazer agora, em uma frase simples (serve para quem começa e para quem já opera).
   string todo;
   uint todoC = P_TEXT;
   if(lots <= 0)
      todo = "Aumente o valor a arriscar para liberar a entrada com stop e alvo.";
   else if(g_mkTrigger != 0)
     {
      todo = (g_mkTrigger > 0 ? "Hora de comprar: clique no botão verde e confirme."
                              : "Hora de vender: clique no botão vermelho e confirme.");
      todoC = (g_mkTrigger > 0) ? P_OK : P_BREACH;
     }
   else if(news)
     {
      todo = "Notícia forte chegando. Espere ela passar antes de abrir uma operação.";
      todoC = MkNewsColor();
     }
   else if(g_smcLiveDir != 0)
      todo = "Há um sinal no gráfico, mas ele não costuma dar certo neste ativo. Melhor esperar o gatilho.";
   else
      todo = "Sem entrada boa agora. Espere o gatilho acender: o Fortify avisa aqui.";
   string tl[];
   int tn = WrapWidth(todo, inner - 28, 12.5, FW_SEMIBOLD, 3, tl);
   double th = 22 + tn * 18;
   RoundRect(PP, y, inner, th, 12, Mix(P_BG, todoC == P_TEXT ? P_MUTED : todoC, 0.10));
   for(int l = 0; l < tn; l++)
      Text(tl[l], PP + 14, y + 11 + l * 18, 12.5, todoC, FW_SEMIBOLD);
   return y + th + 14;
  }

// Seção GRÁFICO da aba Configurações: liga e desliga as marcações institucionais.
// Fica só neste MT5 (não vai para o Fortify nem mexe nas regras da conta).
double RenderChartConfig(double y)
  {
   double inner = PW - 2 * PP;
   double rowH = g_compact ? 44 : 54;
   Text("GRÁFICO", PP + 2, y, 10.5, P_MUTED, FW_SEMIBOLD);
   y += 19;
   RoundRect(PP, y, inner, rowH, 12, P_CARD);
   Text(FitText("Marcações institucionais (SMC)", inner - 28 - 54, 13.5, FW_NORMAL), PP + 14, y + (g_compact ? 4 : 9), 13.5,
        g_smcOn ? P_TEXT : P_MUTED);
   Text(FitText("Order blocks, FVG, CHoCH/BOS e confluências do H1", inner - 28 - 54, 12, FW_NORMAL), PP + 14,
        y + (g_compact ? 23 : 29), 12, P_MUTED);
   double tx = PP + inner - 14 - 42, ty = y + rowH / 2 - 12;
   RoundRect(tx, ty, 42, 24, 12, g_smcOn ? P_OK : P_TOGGLEOFF);
   Circle(g_smcOn ? tx + 30 : tx + 12, ty + 12, 9, P_WHITE);
   AddHit(PP, y, inner, rowH, "smc:toggle");
   y += rowH + 8;
   // Posição do painel: arrasta pelo topo; aqui volta para o canto.
   RoundRect(PP, y, inner, rowH, 12, P_CARD);
   Text("Posição do painel", PP + 14, y + (g_compact ? 4 : 9), 13.5, P_TEXT);
   Text(FitText(g_userPos ? "Movido por você." : "Arraste o painel pelo topo.", inner - 28 - (g_userPos ? 96 : 0), 12, FW_NORMAL),
        PP + 14, y + (g_compact ? 23 : 29), 12, P_MUTED);
   if(g_userPos)
     {
      double bw = 84, bx = PP + inner - 14 - bw, by = y + rowH / 2 - 14;
      RoundRect(bx, by, bw, 28, 8, P_FIELD);
      RoundRect(bx, by, bw, 28, 8, P_BORDER, 1);
      Text("Restaurar", bx + bw / 2, by + 14, 12, P_TEXT, FW_SEMIBOLD, TA_CENTER | TA_VCENTER);
      AddHit(bx, by, bw, 28, "pos:reset");
     }
   return y + rowH + 18;
  }

double RenderConfig(double y)
  {
   double inner = PW - 2 * PP;
   Text("Escolha o que aparece no painel.", PP, y, 13, P_TEXT, FW_SEMIBOLD);
   y += 21;
   Text(InpPreview ? "Demonstração: a escolha vale só nesta tela." : "Fica salvo no Fortify e vale também no site.", PP, y, 11.5, P_MUTED);
   y += 26;
   y = RenderChartConfig(y);
   if(ArraySize(g_options) == 0)
     {
      string lines[];
      int n = WrapWidth(g_hasFeed ? "Para escolher aqui, atualize o Fortify. Por enquanto, escolha no site: Fortify Guard > Regras no MT5."
                                  : "Conectando ao Fortify...", inner, 12, FW_NORMAL, 4, lines);
      for(int l = 0; l < n; l++)
         Text(lines[l], PP, y + l * 17, 12, P_MUTED);
      return y + n * 17 + 14;
     }
   string groupIds[] = {"account", "payout", "rules"};
   string groupTitles[] = {"ZERAM A CONTA", "METAS E SAQUE", "OUTRAS REGRAS"};
   double rowH = g_compact ? 40 : 50;
   for(int g = 0; g < 3; g++)
     {
      int count = 0;
      for(int o = 0; o < ArraySize(g_options); o++)
         if(g_options[o].group == groupIds[g])
            count++;
      if(count == 0)
         continue;
      Text(groupTitles[g], PP + 2, y, 10.5, P_MUTED, FW_SEMIBOLD);
      y += 19;
      RoundRect(PP, y, inner, count * rowH, 12, P_CARD);
      int r = 0;
      for(int o = 0; o < ArraySize(g_options); o++)
        {
         if(g_options[o].group != groupIds[g])
            continue;
         double ry = y + r * rowH;
         if(r > 0)
            RoundRect(PP + 14, ry, inner - 28, 1, 0, P_BORDER);
         bool on = g_options[o].on;
         uint labelColor = on ? P_TEXT : P_MUTED;
         string label = FitText(g_options[o].label, inner - 28 - 54, 13.5, FW_NORMAL);
         // Embaixo do nome, o valor exato da regra nesta conta.
         string sub = (g_options[o].detail != "") ? g_options[o].detail : (g_options[o].live ? "ao vivo" : "texto da mesa");
         Text(label, PP + 14, ry + (g_compact ? 3 : 8), 13.5, labelColor);
         Text(FitText(sub, inner - 28 - 54, 12, FW_NORMAL), PP + 14, ry + (g_compact ? 21 : 27), 12,
              (on && g_options[o].detail != "") ? Mix(P_MUTED, P_TEXT, 0.6) : P_MUTED);
         // Chave de ligar e desligar.
         double tx = PP + inner - 14 - 42, ty = ry + rowH / 2 - 12;
         RoundRect(tx, ty, 42, 24, 12, on ? P_OK : P_TOGGLEOFF);
         Circle(on ? tx + 30 : tx + 12, ty + 12, 9, P_WHITE);
         AddHit(PP, ry, inner, rowH, "opt:" + g_options[o].key);
         r++;
        }
      y += count * rowH + 16;
     }
   return y;
  }

// Fundo, cabeçalho e abas. Devolve onde o conteúdo começa (ou a altura toda, recolhido).
double RenderHeader()
  {
   double inner = PW - 2 * PP;
   double y = PP;
   if(!g_measure)
     {
      RoundRect(0, 0, PW, g_ch / g_s, 16, P_BG);
      // Pegador: mostra que o painel arrasta pelo topo.
      RoundRect(PW / 2 - 18, 6, 36, 4, 2, Argb(P_MUTED, g_drag ? 220 : 110));
     }

   // Cabeçalho: logo, nome, selo de status, conta e a bolinha de conexão.
   DrawLogo(PP, y, 38);
   RoundRect(PP, y, 38, 38, 38 * 0.14, Argb(P_WHITE, 50), 1);
   Text("Fortify Guard", PP + 50, y, 16.5, P_TEXT, FW_SEMIBOLD);
   // Selo de status em uma palavra: o iniciante entende de longe, em qualquer aba.
   if(g_hasFeed || g_error != "")
     {
      string st;
      uint sc;
      if(g_error != "")
        {
         st = "OFFLINE";
         sc = P_MUTED;
        }
      else if(g_worst >= 3)
        {
         st = "ESTOUROU";
         sc = P_BREACH;
        }
      else if(g_worst == 2)
        {
         st = "PERIGO";
         sc = LevelArgb(2);
        }
      else if(g_worst == 1)
        {
         st = "ATENÇÃO";
         sc = P_WARN;
        }
      else
        {
         st = "SEGURO";
         sc = P_OK;
        }
      double sw = TextWidth(st, 9.5, FW_BOLD) + 16;
      double sx = PP + 50 + TextWidth("Fortify Guard", 16.5, FW_SEMIBOLD) + 8;
      RoundRect(sx, y + 2, sw, 19, 9.5, Mix(P_BG, sc, 0.16));
      RoundRect(sx, y + 2, sw, 19, 9.5, Argb(sc, 160), 1);
      Text(st, sx + sw / 2, y + 11.5, 9.5, sc, FW_BOLD, TA_CENTER | TA_VCENTER);
     }
   string subtitle = "Conectando...";
   if(g_hasFeed)
     {
      subtitle = (g_size != "") ? "Conta " + g_size : g_program;
      string stage = StageText();
      if(stage != "")
         subtitle += " · " + stage;
     }
   Text(FitText(subtitle, inner - 50 - 64, 12.5, FW_NORMAL), PP + 50, y + 22, 12.5, P_MUTED);
   double dcx = PW - PP - 10, dcy = y + 19;
   uint conn = ConnectionTone();
   Circle(dcx, dcy, 10, conn, 1.6);
   Circle(dcx, dcy, 4.5, conn);
   Text(g_collapsed ? "+" : "–", dcx - 27, dcy, 16, P_MUTED, FW_SEMIBOLD, TA_CENTER | TA_VCENTER);
   AddHit(dcx - 40, y, 52, 38, "min");
   y += 38 + 16;

   if(g_collapsed)
     {
      uint tone = (g_error != "") ? P_BREACH : LevelArgb(g_worst);
      string mini = (g_error != "") ? "Sem conexão com o Fortify"
                    : (g_worstIdx >= 0 && g_worst >= 1) ? g_rules[g_worstIdx].label : "Dentro das regras";
      if(g_error == "" && g_hasCanLose)
         mini += " · pode perder " + MoneyShort(MathMax(0.0, g_canLose));
      RoundRect(PP, y, inner, 42, 12, Mix(P_BG, tone, 0.12));
      RoundRect(PP, y, inner, 42, 12, Argb(tone, 150), 1);
      ShieldIcon(PP + 12, y + 12, 18, tone);
      Text(FitText(mini, inner - 50, 13, FW_SEMIBOLD), PP + 38, y + 21, 13, P_TEXT, FW_SEMIBOLD, TA_LEFT | TA_VCENTER);
      AddHit(PP, y, inner, 42, "min");
      return y + 42 + PP;
     }

   // Abas.
   string tabIds[] = {"painel", "mercado", "regras", "config"};
   string tabTitles[] = {"Painel", "Mercado", "Regras", "Configurações"};
   double tabH = 34, fs = 12;
   // Largura de cada aba proporcional ao texto, o que sobra é dividido igual.
   double widths[4], textSum = 0;
   for(int t = 0; t < 4; t++)
     {
      widths[t] = TextWidth(tabTitles[t], fs, FW_SEMIBOLD);
      textSum += widths[t];
     }
   double extra = MathMax(0.0, (inner - textSum) / 4.0);
   RoundRect(PP, y, inner, tabH, 10, P_CARD);
   double sx = PP;
   for(int t = 0; t < 4; t++)
     {
      double segW = widths[t] + extra;
      bool on = (g_tab == tabIds[t]);
      if(on)
         RoundRect(sx + 3, y + 3, segW - 6, tabH - 6, 8, P_TABON);
      Text(tabTitles[t], sx + segW / 2, y + tabH / 2, fs, on ? P_TEXT : P_MUTED, on ? FW_SEMIBOLD : FW_NORMAL, TA_CENTER | TA_VCENTER);
      if(t == 0 && !on && g_worst >= 1 && g_error == "")
         Circle(sx + segW / 2 + TextWidth(tabTitles[t], fs, FW_NORMAL) / 2 + 7, y + tabH / 2, 3.5, LevelArgb(g_worst));
      AddHit(sx, y, segW, tabH, "tab:" + tabIds[t]);
      sx += segW;
     }
   return y + tabH + 16;
  }

// Conteúdo da aba ativa, aviso e rodapé. Devolve o fim (y).
double RenderContent(double y)
  {
   double inner = PW - 2 * PP;
   if(g_error != "")
     {
      string lines[];
      int n = WrapWidth(g_error, inner - 24, 12.5, FW_NORMAL, 5, lines);
      double eh = 20 + n * 19;
      RoundRect(PP, y, inner, eh, 12, Mix(P_BG, P_BREACH, 0.14));
      RoundRect(PP, y, inner, eh, 12, Argb(P_BREACH, 150), 1);
      for(int l = 0; l < n; l++)
         Text(lines[l], PP + 12, y + 10 + l * 19, 12.5, P_TEXT);
      y += eh + 12;
      RoundRect(PP, y, inner, 36, 10, P_CARD);
      RoundRect(PP, y, inner, 36, 10, P_BORDER, 1);
      Text("Tentar de novo", PP + inner / 2, y + 18, 13, P_TEXT, FW_SEMIBOLD, TA_CENTER | TA_VCENTER);
      AddHit(PP, y, inner, 36, "refresh");
      y += 36 + 16;
     }

   // Notícia de alto impacto do ativo nos próximos 30 min: aviso em todas as abas (na Mercado
   // ele aparece dentro do card de probabilidade).
   if(g_tab != "mercado" && MkNewsSoon())
     {
      uint nc = MkNewsColor();
      string nt = "Notícia de alto impacto " + MkNewsWhen() + " · " + g_mkNewsName;
      RoundRect(PP, y, inner, 32, 10, Mix(P_BG, nc, 0.18));
      RoundRect(PP, y, inner, 32, 10, Argb(nc, 170), 1);
      Text(FitText(nt, inner - 24, 12.5, FW_SEMIBOLD), PP + inner / 2, y + 16, 12.5, nc, FW_SEMIBOLD, TA_CENTER | TA_VCENTER);
      y += 32 + 12;
     }

   if(g_tab == "config")
      y = RenderConfig(y);
   else if(g_tab == "regras")
      y = RenderNotes(y);
   else if(g_tab == "mercado")
      y = RenderMarket(y);
   else
      y = RenderMain(y);

   if(g_notice != "" && g_tab != "mercado")
     {
      string lines[];
      int n = WrapWidth(g_notice, inner, 11.5, FW_NORMAL, 3, lines);
      for(int l = 0; l < n; l++)
         Text(lines[l], PP, y + l * 17, 11.5, P_WARN);
      y += n * 17 + 8;
     }
   Text(g_pendingSave ? "Salvando a escolha..." : Elapsed(), PP, y, 11, P_MUTED);
   if(InpPreview)
      Text("DEMONSTRAÇÃO", PW - PP, y, 10.5, P_WARN, FW_SEMIBOLD, TA_RIGHT | TA_TOP);
   return y + 16 + PP;
  }

void DrawPanel()
  {
   ArrayResize(g_used, 0);
   ArrayResize(g_hits, 0);
   Summarize();
   g_s = MathMax(1.0, TerminalInfoInteger(TERMINAL_SCREEN_DPI) / 96.0);
   int chartW = (int)ChartGetInteger(0, CHART_WIDTH_IN_PIXELS);
   int chartH = (int)ChartGetInteger(0, CHART_HEIGHT_IN_PIXELS);
   int pw = (int)MathCeil(PW * g_s);
   // A largura do grafico inclui a escala de preco a direita (~70px).
   if(g_userPos)
     {
      g_x0 = g_posX;
      g_y0 = g_posY;
     }
   else
     {
      g_x0 = (InpCorner == GUARD_RIGHT) ? MathMax(8, chartW - pw - 84) : 12;
      g_y0 = 28;
     }
   ClampPanel(chartW, chartH);
   int avail = MathMax(160, chartH - g_y0 - 8);

   // 1) Mede: cabeçalho fixo + conteúdo da aba.
   g_measure = true;
   g_hitDy = 0;
   g_hitTop = 0;
   g_hitBottom = 1e9;
   double top = RenderHeader();
   double contentH = g_collapsed ? 0.0 : RenderContent(0.0);
   g_measure = false;
   g_contentTop = top;

   g_cw = pw;
   g_ch = (int)MathMax(1, MathMin(avail, MathCeil((top + contentH) * g_s)));
   double visible = g_ch / g_s - top;
   g_scrollMax = g_collapsed ? 0.0 : MathMax(0.0, contentH - visible);
   g_scroll = MathMax(0.0, MathMin(g_scrollMax, g_scroll));

   // 2) Cabeçalho direto no desenho final.
   ArrayResize(g_px, g_cw * g_ch);
   ArrayInitialize(g_px, 0);
   g_editOn = false;
   g_mkEditOn = false;
   g_editDy = 0;
   RenderHeader();

   if(!g_collapsed)
     {
      if(g_scrollMax <= 0)
         RenderContent(top);
      else
        {
         // 3) Conteúdo maior que o gráfico: desenha inteiro à parte e copia só a faixa visível.
         int mainCh = g_ch;
         ArraySwap(g_px, g_content);
         g_ch = (int)MathCeil(contentH * g_s);
         ArrayResize(g_px, g_cw * g_ch);
         ArrayInitialize(g_px, 0);
         g_hitDy = top - g_scroll;
         g_hitTop = top;
         g_hitBottom = mainCh / g_s - 4;
         g_editDy = top - g_scroll;
         RenderContent(0.0);
         ArraySwap(g_px, g_content);
         int contentPx = g_ch;
         g_ch = mainCh;
         int topPx = (int)MathRound(top * g_s), scrollPx = (int)MathRound(g_scroll * g_s);
         int bottomPx = g_ch - (int)MathRound(6 * g_s);
         for(int py = topPx; py < bottomPx; py++)
           {
            int sy = py - topPx + scrollPx;
            if(sy >= contentPx)
               break;
            for(int px = 0; px < g_cw; px++)
              {
               uint c = g_content[sy * g_cw + px];
               if((c >> 24) != 0)
                  Blend(px, py, c, 1.0);
              }
           }
         g_hitDy = 0;
         g_hitTop = 0;
         g_hitBottom = 1e9;
         // Barra de rolagem: clique acima/abaixo da barra pula uma página.
         double trackTop = top, trackH = g_ch / g_s - top - 10;
         double thumbH = MathMax(28.0, trackH * visible / contentH);
         double thumbY = trackTop + (trackH - thumbH) * (g_scroll / g_scrollMax);
         RoundRect(PW - 8, thumbY, 4, thumbH, 2, Argb(P_TEXT, 80));
         AddHit(PW - 14, trackTop, 14, thumbY - trackTop, "pgup");
         AddHit(PW - 14, thumbY + thumbH, 14, trackTop + trackH - thumbY - thumbH, "pgdn");
        }
     }

   // Borda por último, por cima do conteúdo.
   bool alarm = (g_worst >= 2 && !g_collapsed && g_error == "");
   RoundRect(0, 0, PW, g_ch / g_s, 16, alarm ? Argb(LevelArgb(g_worst), 210) : P_BORDER, 1);
   ResourceCreate(PANEL_RES, g_px, g_cw, g_ch, 0, 0, g_cw, COLOR_FORMAT_ARGB_NORMALIZE);

   string id = PFX + "panel";
   if(ObjectFind(0, id) < 0)
     {
      ObjectCreate(0, id, OBJ_BITMAP_LABEL, 0, 0, 0);
      ObjectSetInteger(0, id, OBJPROP_CORNER, CORNER_LEFT_UPPER);
      ObjectSetInteger(0, id, OBJPROP_SELECTABLE, false);
      ObjectSetInteger(0, id, OBJPROP_HIDDEN, true);
      ObjectSetInteger(0, id, OBJPROP_BACK, false);
      ObjectSetString(0, id, OBJPROP_BMPFILE, PANEL_RES);
     }
   ObjectSetInteger(0, id, OBJPROP_XDISTANCE, g_x0);
   ObjectSetInteger(0, id, OBJPROP_YDISTANCE, g_y0);
   ObjectSetInteger(0, id, OBJPROP_XSIZE, g_cw);
   ObjectSetInteger(0, id, OBJPROP_YSIZE, g_ch);
   ObjectSetInteger(0, id, OBJPROP_ZORDER, 1);
   MarkUsed(id);

   // Campo do stop: objeto de edição por cima do desenho (some fora da parte visível).
   double editY = g_editY + g_editDy;
   if(g_editOn && editY >= top && (editY + 18) * g_s < g_ch - 4)
      Edit("sim_stop", g_x0 + (int)MathRound(g_editX * g_s), g_y0 + (int)MathRound(editY * g_s),
           (int)MathRound(58 * g_s), (int)MathRound(18 * g_s), IntegerToString(g_simStop));
   // Campo do valor a arriscar (aba Mercado).
   double mkY = g_mkEditY + g_editDy;
   if(g_mkEditOn && mkY >= top && (mkY + 18) * g_s < g_ch - 4)
      Edit("mk_risk", g_x0 + (int)MathRound(g_mkEditX * g_s), g_y0 + (int)MathRound(mkY * g_s),
           (int)MathRound(g_mkEditW * g_s), (int)MathRound(18 * g_s), DoubleToString(g_mkRisk, 0));

   if(!g_collapsed && g_error == "" && g_hasFeed)
      DrawBreakLine(g_hasCanLose, g_canLose, g_slackIdx >= 0 ? g_rules[g_slackIdx].label : "", g_worst);

   // Remove o que não foi usado neste desenho. As marcações SMC têm ciclo próprio (SmcDraw).
   for(int i = ObjectsTotal(0, 0, -1) - 1; i >= 0; i--)
     {
      string name = ObjectName(0, i, 0, -1);
      if(StringFind(name, PFX) != 0 || StringFind(name, SMC_PFX) == 0)
         continue;
      bool keep = false;
      for(int j = 0; j < ArraySize(g_used) && !keep; j++)
         keep = (g_used[j] == name);
      if(!keep)
         ObjectDelete(0, name);
     }
   ChartRedraw(0);
  }

// O cabeçalho nunca sai do gráfico: sempre dá para pegar o painel de volta.
void ClampPanel(const int chartW, const int chartH)
  {
   int handleH = (int)MathCeil(DRAG_HANDLE_H * g_s);
   g_x0 = MathMax(0, MathMin(g_x0, chartW - (int)MathCeil(120 * g_s)));
   g_y0 = MathMax(0, MathMin(g_y0, chartH - handleH));
  }

// Ponto (em pontos do painel) em cima de um botão ou aba: ali o clique não vira arrasto.
bool OverHit(const double px, const double py)
  {
   for(int i = ArraySize(g_hits) - 1; i >= 0; i--)
      if(px >= g_hits[i].x1 && px <= g_hits[i].x2 && py >= g_hits[i].y1 && py <= g_hits[i].y2)
         return true;
   return false;
  }

// Arrasto: só move a imagem do painel e os campos de digitação (sem redesenhar a cada pixel).
void MovePanel(int nx, int ny)
  {
   int chartW = (int)ChartGetInteger(0, CHART_WIDTH_IN_PIXELS);
   int chartH = (int)ChartGetInteger(0, CHART_HEIGHT_IN_PIXELS);
   int ox = g_x0, oy = g_y0;
   g_x0 = nx;
   g_y0 = ny;
   ClampPanel(chartW, chartH);
   int dx = g_x0 - ox, dy = g_y0 - oy;
   if(dx == 0 && dy == 0)
      return;
   g_userPos = true;
   g_posX = g_x0;
   g_posY = g_y0;
   string objs[] = {"panel", "sim_stop", "mk_risk"};
   for(int i = 0; i < ArraySize(objs); i++)
     {
      string id = PFX + objs[i];
      if(ObjectFind(0, id) < 0)
         continue;
      ObjectSetInteger(0, id, OBJPROP_XDISTANCE, ObjectGetInteger(0, id, OBJPROP_XDISTANCE) + dx);
      ObjectSetInteger(0, id, OBJPROP_YDISTANCE, ObjectGetInteger(0, id, OBJPROP_YDISTANCE) + dy);
     }
   ChartRedraw(0);
  }

void SavePanelPos()
  {
   GlobalVariableSet("FG_PANEL_X", g_posX);
   GlobalVariableSet("FG_PANEL_Y", g_posY);
  }

// Mouse em cima do painel: a roda rola a lista e o arrasto não mexe no gráfico.
void UpdateHover(const int x, const int y)
  {
   bool inside = (x >= g_x0 && x <= g_x0 + g_cw && y >= g_y0 && y <= g_y0 + g_ch);
   if(inside == g_hover)
      return;
   g_hover = inside;
   if(inside)
     {
      g_savedMouseScroll = ChartGetInteger(0, CHART_MOUSE_SCROLL);
      ChartSetInteger(0, CHART_MOUSE_SCROLL, false);
     }
   else
      ChartSetInteger(0, CHART_MOUSE_SCROLL, g_savedMouseScroll);
  }
//+------------------------------------------------------------------+
//| Eventos                                                           |
//+------------------------------------------------------------------+
int OnInit()
  {
   if(MQLInfoInteger(MQL_TESTER) && !InpPreview)
     {
      Print("Fortify Guard não roda no Testador de Estratégia: precisa consultar o Fortify ao vivo.");
      return INIT_FAILED;
     }
   g_utcDay = FirmToday();
   g_startTick = GetTickCount();
   if(GlobalVariableCheck(PeakVarName()))
      g_peakEquity = GlobalVariableGet(PeakVarName());
   g_peakEquity = MathMax(g_peakEquity, AccountInfoDouble(ACCOUNT_EQUITY));
   g_currency = AccountInfoString(ACCOUNT_CURRENCY);
   g_trade.SetDeviationInPoints(30);
   g_simStop = MathMax(1, InpSimStopPoints);
   // Mercado: valor padrão a arriscar = 1% do saldo, arredondado.
   g_mkRisk = (InpMkRisk > 0) ? InpMkRisk : InpPreview ? 1000.0
              : MathMax(10.0, MathRound(AccountInfoDouble(ACCOUNT_BALANCE) * 0.01 / 10.0) * 10.0);
   if(InpPreview)
     {
      // Demonstração: aba inicial opcional, lida de MQL5\Files (só para gerar prints).
      int fh = FileOpen("FortifyGuard_preview_tab.txt", FILE_READ | FILE_TXT | FILE_ANSI);
      if(fh != INVALID_HANDLE)
        {
         string tab = FileReadString(fh);
         StringTrimRight(tab);
         StringTrimLeft(tab);
         if(tab == "account" || tab == "payout")
            tab = "painel";
         if(tab == "rules")
            tab = "regras";
         if(tab == "painel" || tab == "regras" || tab == "config" || tab == "mercado")
            g_tab = tab;
         FileClose(fh);
        }
      // Demonstração: janela solta de tamanho fixo, para o print sair igual em qualquer perfil.
      ChartSetInteger(0, CHART_IS_DOCKED, false);
      ChartSetInteger(0, CHART_FLOAT_LEFT, 20);
      ChartSetInteger(0, CHART_FLOAT_TOP, 20);
      ChartSetInteger(0, CHART_FLOAT_RIGHT, 1300);
      ChartSetInteger(0, CHART_FLOAT_BOTTOM, 860);
      if(InpTheme == GUARD_THEME_LIGHT)
        {
         ChartSetInteger(0, CHART_COLOR_BACKGROUND, clrWhite);
         ChartSetInteger(0, CHART_COLOR_FOREGROUND, clrBlack);
         ChartSetInteger(0, CHART_COLOR_GRID, C'226,229,236');
        }
     }
   ApplyTheme();
   ObjectsDeleteAll(0, PFX);
   // Marcações SMC: preferência salva no terminal (ligadas por padrão) e redesenho do zero.
   g_smcOn = !GlobalVariableCheck("FG_SMC_DRAW") || GlobalVariableGet("FG_SMC_DRAW") > 0.5;
   // Painel onde o trader deixou da última vez (se ele já arrastou).
   g_userPos = GlobalVariableCheck("FG_PANEL_X") && GlobalVariableCheck("FG_PANEL_Y");
   if(g_userPos)
     {
      g_posX = (int)GlobalVariableGet("FG_PANEL_X");
      g_posY = (int)GlobalVariableGet("FG_PANEL_Y");
     }
   g_mouseDown = false;
   g_drag = false;
   g_dragArmed = false;
   g_smcDrawn = false;
   g_smcLiveDrawn = -2;
   // O painel fica por cima do grafico.
   ChartSetInteger(0, CHART_FOREGROUND, false);
   // Roda do mouse rola a lista do painel; o movimento diz quando o mouse está em cima dele.
   ChartSetInteger(0, CHART_EVENT_MOUSE_MOVE, true);
   ChartSetInteger(0, CHART_EVENT_MOUSE_WHEEL, true);
   g_savedMouseScroll = ChartGetInteger(0, CHART_MOUSE_SCROLL);
   EventSetMillisecondTimer(250);
   DrawPanel();
   return INIT_SUCCEEDED;
  }

void OnDeinit(const int reason)
  {
   EventKillTimer();
   if(g_hover)
      ChartSetInteger(0, CHART_MOUSE_SCROLL, g_savedMouseScroll);
   ObjectsDeleteAll(0, PFX);
   ResourceFree(PANEL_RES);
   ChartRedraw(0);
  }

// Demonstração (só com InpPreview): executa ações lidas de MQL5\Files\FortifyGuard_preview_cmd.txt,
// uma por linha, iguais às do clique ("tab:mercado", "mkbuy", "pgdn"...). Serve para gravar vídeos
// sem mouse. Fora da demonstração o arquivo é ignorado.
void PreviewDirector()
  {
   if(!InpPreview || !FileIsExist("FortifyGuard_preview_cmd.txt"))
      return;
   int fh = FileOpen("FortifyGuard_preview_cmd.txt", FILE_READ | FILE_TXT | FILE_ANSI);
   if(fh == INVALID_HANDLE)
      return;
   string actions[];
   while(!FileIsEnding(fh))
     {
      string a = FileReadString(fh);
      StringTrimLeft(a);
      StringTrimRight(a);
      if(a != "")
        {
         int n = ArraySize(actions);
         ArrayResize(actions, n + 1);
         actions[n] = a;
        }
     }
   FileClose(fh);
   FileDelete("FortifyGuard_preview_cmd.txt");
   for(int i = 0; i < ArraySize(actions); i++)
      HandleAction(actions[i]);
  }

void OnTimer()
  {
   PreviewDirector();
   string today = FirmToday();
   bool newDay = (today != g_utcDay);
   if(newDay)
     {
      g_utcDay = today;
      for(int i = 0; i < ArraySize(g_rules); i++)
         g_rules[i].alertLevel = 0;
     }
   // Segunda consulta logo depois de uma operação: o histórico do MT5 pode demorar a registrar o negócio.
   if(g_repollAt != 0 && GetTickCount() >= g_repollAt)
     {
      g_repollAt = 0;
      g_lastPoll = 0;
     }
   if(newDay || g_lastPoll == 0 || TimeLocal() - g_lastPoll >= g_pollSeconds)
      Poll();
   ComputeLive();
   if(g_error == "")
      CheckAlerts();
   if(g_tab == "mercado" && !g_collapsed)
      MkUpdate();
   // Notícias e marcações institucionais valem em qualquer aba (cada uma só refaz quando muda).
   MkNews();
   SmcRefresh();
   SmcLiveCheck();
   SmcDraw();
   DrawPanel();
   if(InpPreview && !g_previewShot && g_hasFeed && (g_tab != "mercado" || g_mkReady) && GetTickCount() - g_startTick > 10000)
     {
      g_previewShot = true;
      int w = (int)ChartGetInteger(0, CHART_WIDTH_IN_PIXELS);
      int h = (int)ChartGetInteger(0, CHART_HEIGHT_IN_PIXELS);
      if(ChartScreenShot(0, "FortifyGuard_preview.png", w, h, ALIGN_RIGHT))
         Print("Fortify Guard: prévia salva em MQL5\\Files\\FortifyGuard_preview.png");
     }
   // Demonstração: um segundo print com o painel rolado até o fim (quando há rolagem).
   else if(InpPreview && g_previewShot && g_previewEnd == 0 && g_scrollMax > 0)
     {
      g_scroll = g_scrollMax;
      g_previewEnd = 1;
     }
   else if(InpPreview && g_previewEnd == 1)
     {
      g_previewEnd = 2;
      ChartScreenShot(0, "FortifyGuard_preview_fim.png", (int)ChartGetInteger(0, CHART_WIDTH_IN_PIXELS),
                      (int)ChartGetInteger(0, CHART_HEIGHT_IN_PIXELS), ALIGN_RIGHT);
      g_scroll = 0; // o print do fim não deixa o painel rolado para quem está usando
     }
  }

void OnTick()
  {
  }

void OnTradeTransaction(const MqlTradeTransaction &trans, const MqlTradeRequest &request, const MqlTradeResult &result)
  {
   // Uma posicao fechada muda o P&L do dia: consulta de novo sem esperar o ciclo.
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD)
     {
      g_lastPoll = 0;
      g_tradesDirty = true;
      g_repollAt = GetTickCount() + 1500;
     }
  }

// Liga/desliga uma regra na aba Configurações. Na conta real, a escolha vai
// para o Fortify na próxima consulta (já na volta do timer).
void ToggleOption(const string key)
  {
   for(int i = 0; i < ArraySize(g_options); i++)
      if(g_options[i].key == key)
        {
         g_options[i].on = !g_options[i].on;
         g_notice = "";
         if(!InpPreview)
           {
            g_pendingSave = true;
            g_lastPoll = 0;
           }
         return;
        }
  }

void HandleAction(const string action)
  {
   if(action == "min")
      g_collapsed = !g_collapsed;
   else if(action == "refresh")
     {
      g_notice = "";
      Poll();
     }
   else if(action == "close")
      CloseAllPositions();
   else if(action == "pos:reset")
     {
      // Painel de volta ao canto padrão.
      g_userPos = false;
      GlobalVariableDel("FG_PANEL_X");
      GlobalVariableDel("FG_PANEL_Y");
     }
   else if(action == "smc:toggle")
     {
      // Só deste MT5: não entra nas opções enviadas ao Fortify.
      g_smcOn = !g_smcOn;
      GlobalVariableSet("FG_SMC_DRAW", g_smcOn ? 1.0 : 0.0);
      g_smcDrawn = false;
      SmcDraw();
     }
   else if(action == "mkbuy")
      MkPlaceOrder(1);
   else if(action == "mksell")
      MkPlaceOrder(-1);
   else if(StringFind(action, "tab:") == 0)
     {
      g_tab = StringSubstr(action, 4);
      g_expanded = "";
      g_scroll = 0;
      if(g_tab == "mercado")
         MkUpdate();
     }
   else if(StringFind(action, "row:") == 0)
     {
      string key = StringSubstr(action, 4);
      g_expanded = (g_expanded == key) ? "" : key;
     }
   else if(StringFind(action, "opt:") == 0)
      ToggleOption(StringSubstr(action, 4));
   else if(action == "pgup")
      g_scroll -= (g_ch / g_s - g_contentTop) * 0.8;
   else if(action == "pgdn")
      g_scroll += (g_ch / g_s - g_contentTop) * 0.8;
   ComputeLive();
   DrawPanel();
  }

void OnChartEvent(const int id, const long &lparam, const double &dparam, const string &sparam)
  {
   if(id == CHARTEVENT_CHART_CHANGE)
     {
      ApplyTheme();
      DrawPanel();
      return;
     }
   if(id == CHARTEVENT_OBJECT_ENDEDIT && sparam == PFX + "sim_stop")
     {
      long typed = StringToInteger(ObjectGetString(0, sparam, OBJPROP_TEXT));
      if(typed > 0 && typed < 1000000)
         g_simStop = (int)typed;
      ObjectSetString(0, sparam, OBJPROP_TEXT, IntegerToString(g_simStop));
      DrawPanel();
      return;
     }
   if(id == CHARTEVENT_OBJECT_ENDEDIT && sparam == PFX + "mk_risk")
     {
      string typed = ObjectGetString(0, sparam, OBJPROP_TEXT);
      StringReplace(typed, CurrencySymbol(), "");
      StringReplace(typed, "$", "");
      StringReplace(typed, " ", "");
      StringReplace(typed, ".", "");     // 1.000 -> 1000
      StringReplace(typed, ",", ".");    // 1000,50 -> 1000.50
      double value = StringToDouble(typed);
      if(value > 0 && value < 1e9)
         g_mkRisk = value;
      ObjectSetString(0, sparam, OBJPROP_TEXT, DoubleToString(g_mkRisk, 0));
      DrawPanel();
      return;
     }
   if(id == CHARTEVENT_MOUSE_MOVE)
     {
      int mx = (int)lparam, my = (int)dparam;
      bool down = (((int)StringToInteger(sparam)) & 1) != 0;
      // Apertou o botão: vira arrasto se foi na faixa do cabeçalho e fora de botão ou aba.
      if(down && !g_mouseDown)
        {
         double px = (mx - g_x0) / g_s, py = (my - g_y0) / g_s;
         g_dragArmed = (px >= 0 && px <= g_cw / g_s && py >= 0 && py <= DRAG_HANDLE_H && !OverHit(px, py));
         g_dragDX = mx - g_x0;
         g_dragDY = my - g_y0;
        }
      if(down && g_dragArmed)
        {
         int nx = mx - g_dragDX, ny = my - g_dragDY;
         if(!g_drag && MathAbs(nx - g_x0) + MathAbs(ny - g_y0) >= 4)
            g_drag = true;
         if(g_drag)
            MovePanel(nx, ny);
        }
      // Soltou: guarda a posição e redesenha tudo no lugar novo.
      if(!down && g_mouseDown)
        {
         if(g_drag)
           {
            g_drag = false;
            g_dragEndTick = GetTickCount();
            SavePanelPos();
            DrawPanel();
           }
         g_dragArmed = false;
        }
      g_mouseDown = down;
      UpdateHover(mx, my);
      return;
     }
   if(id == CHARTEVENT_MOUSE_WHEEL)
     {
      int mx = (int)(short)lparam, my = (int)(short)(lparam >> 16);
      UpdateHover(mx, my);
      if(g_hover && g_scrollMax > 0)
        {
         g_scroll -= dparam / 120.0 * 48.0;
         DrawPanel();
        }
      return;
     }
   // Clique no painel: acha a área tocada (a última desenhada vence).
   if(id == CHARTEVENT_OBJECT_CLICK && sparam == PFX + "panel")
     {
      // O clique que encerra um arrasto não aciona botão.
      if(g_drag || GetTickCount() - g_dragEndTick < 400)
         return;
      double px = ((double)lparam - g_x0) / g_s;
      double py = (dparam - g_y0) / g_s;
      for(int i = ArraySize(g_hits) - 1; i >= 0; i--)
         if(px >= g_hits[i].x1 && px <= g_hits[i].x2 && py >= g_hits[i].y1 && py <= g_hits[i].y2)
           {
            HandleAction(g_hits[i].action);
            break;
           }
     }
  }
//+------------------------------------------------------------------+
