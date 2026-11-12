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
//| fechado por dia (UTC) deste terminal. O Fortify roda o motor de    |
//| regras e devolve um valor de referencia por regra (equity minima  |
//| do dia, piso do drawdown, saldo da meta, teto de lucro de hoje).  |
//| Entre consultas o EA compara a equity de agora com esse valor.    |
//+------------------------------------------------------------------+
#property copyright "Fortify"
#property link      "https://fortify-delta.vercel.app"
#property version   "1.43"
#property description "Fortify Guard: acompanhe ao vivo as regras da sua mesa proprietaria."

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

#define GUARD_VERSION "1.43"
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
   string            valueText;    // calculado ao vivo
   string            detailText;   // calculado ao vivo
   double            slack;        // folga em dinheiro ate quebrar (floor e floating)
   bool              hasSlack;
  };

GuardRule g_rules[];
string    g_firm = "", g_program = "", g_size = "", g_currency = "USD", g_overall = "", g_stage = "";
string    g_error = "", g_notice = "";
double    g_warnPct = 70.0, g_critPct = 85.0;
int       g_pollSeconds = 15;
datetime  g_lastPoll = 0, g_lastOk = 0;
string    g_utcDay = "";
bool      g_collapsed = false;
bool      g_hasFeed = false;
double    g_peakEquity = 0.0;
string    g_used[];
bool      g_previewShot = false;
uint      g_startTick = 0;
datetime  g_lastTradesSent = 0;
bool      g_tradesDirty = true;
double    g_todayClosed = 0.0;   // P&L fechado de hoje (UTC), do historico do terminal
double    g_balanceNow = 0.0, g_equityNow = 0.0;
string    g_tab = "account";      // aba ativa: account | payout | reminder
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
   r.slack = 0; r.hasSlack = false;
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
//| Historico do terminal por dia UTC                                 |
//+------------------------------------------------------------------+
string BuildPayload()
  {
   long   login   = AccountInfoInteger(ACCOUNT_LOGIN);
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity  = AccountInfoDouble(ACCOUNT_EQUITY);
   long   offset  = (long)(TimeTradeServer() - TimeGMT()); // servidor - UTC, em segundos

   string dayKeys[];
   double dayPnl[];
   double dayEod[];
   bool   dayTraded[];
   int    days = 0;
   double running = 0.0;

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

         string key = UtcDayKey((datetime)(when - offset));
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
           }
         dayEod[days - 1] = running;
        }
     }

   // Se o terminal nao tem o historico inteiro, os saldos ficam deslocados por uma
   // constante: corrige para o ultimo dia terminar no saldo atual.
   double drift = balance - running;
   string todayKey = UtcDayKey(TimeGMT());
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
   f += "R|min_trading_days|Dias mínimos|counter|safe|3.00|||||||||5.00|3.00|Mínimo de dias operados atingido.|||payout\n";
   f += "R|news|Notícias|note|safe||||||||||||Avaliação livre; Qualified proíbe execução em ±2 minutos de eventos direcionados.|||reminder\n";
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
        }
     }

   ArrayResize(g_rules, n);
   for(int i = 0; i < n; i++)
      g_rules[i] = parsed[i];
   return true;
  }

void Poll()
  {
   g_lastPoll = TimeLocal();
   if(InpPreview)
     {
      string previewError;
      if(ParseFeed(PreviewFeed(), previewError))
        {
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
   if(InpPreview)
     {
      // Conta simulada: equity oscilando para mostrar o painel ao vivo.
      balance = 101500.0;
      equity  = (InpPreviewStress ? 98000.0 : 100950.0) + (InpPreviewStress ? 120.0 : 350.0) * MathSin(GetTickCount() / 2500.0);
      g_todayClosed = -500.0;
     }
   else if(equity > g_peakEquity)
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
   if(InpPreview)
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
         g_rules[i].valueText = (slack > 0) ? "folga " + Money(slack) : "LIMITE ATINGIDO";
         g_rules[i].detailText = "Equity mínima " + Money(g_rules[i].floorValue)
                                 + (g_rules[i].trailing != "" ? " (sobe com o pico)" : "");
        }
      else if(kind == "target" && g_rules[i].hasTarget && g_rules[i].hasLimit && g_rules[i].limit > 0)
        {
         double missing = g_rules[i].targetBalance - balance;
         g_rules[i].pct = MathMin(100.0, MathMax(0.0, (g_rules[i].limit - missing) / g_rules[i].limit * 100.0));
         g_rules[i].valueText = (missing > 0) ? "faltam " + Money(missing) : "META ATINGIDA";
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
            g_rules[i].valueText = (room > 0) ? "pode ganhar +" + Money(room) : "ACIMA DO TETO";
            g_rules[i].detailText = "Hoje " + (today >= 0 ? "+" : "") + Money(today)
                                    + " de teto " + Money(g_rules[i].todayCap);
           }
         else
           {
            g_rules[i].pct = (today > 0) ? 100.0 : 0.0;
            g_rules[i].valueText = "sem folga hoje";
            g_rules[i].detailText = g_rules[i].message;
           }
         g_rules[i].level = LevelFor(g_rules[i].pct);
         if(g_rules[i].hasRegularize && g_rules[i].regularize > 0)
            g_rules[i].detailText += "  |  falta +" + Money(g_rules[i].regularize) + " de lucro total para o melhor dia caber na regra";
        }
      else if(kind == "counter")
        {
         if(g_rules[i].hasCurrent && g_rules[i].hasRequired)
           {
            bool done = g_rules[i].current >= g_rules[i].required;
            g_rules[i].valueText = done ? "cumprido" : DoubleToString(g_rules[i].current, 0) + " de " + DoubleToString(g_rules[i].required, 0) + " dias";
            g_rules[i].pct = (g_rules[i].required > 0) ? MathMin(100.0, g_rules[i].current / g_rules[i].required * 100.0) : 100.0;
            g_rules[i].detailText = DoubleToString(g_rules[i].current, 0) + " dias operados; a mesa exige " + DoubleToString(g_rules[i].required, 0) + ".";
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
            g_rules[i].valueText = (left > 0) ? "faltam " + DoubleToString(left, 0) + " dias" : "LIMITE ATINGIDO";
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
            g_rules[i].valueText = "sem posição aberta";
            g_rules[i].detailText = "Próximo fechamento: " + when + ". " + g_rules[i].message;
           }
         else if(deadline == 0)
           {
            g_rules[i].valueText = "confira o horário";
            g_rules[i].level = 1;
            g_rules[i].detailText = g_rules[i].message;
           }
         else
           {
            long left = (long)(deadline - TimeGMT());
            g_rules[i].pct = (left < 86400) ? (1.0 - left / 86400.0) * 100.0 : 0.0;
            g_rules[i].level = (left <= 0) ? 3 : (left <= 1800) ? 2 : (left <= 7200) ? 1 : 0;
            g_rules[i].valueText = (left > 0) ? "feche em " + FormatDuration(left) : "HORÁRIO PASSOU";
            g_rules[i].detailText = "Fechamento obrigatório " + when + " (seu horário). " + g_rules[i].message;
           }
        }
      else if(kind == "lots" && g_rules[i].hasLimit && g_rules[i].limit > 0)
        {
         bool perOrder = (g_rules[i].mode == "per_order");
         double used = perOrder ? biggestLot : totalLots;
         g_rules[i].pct = used / g_rules[i].limit * 100.0;
         g_rules[i].level = LevelFor(g_rules[i].pct);
         g_rules[i].valueText = FormatLots(used) + " de " + FormatLots(g_rules[i].limit) + " lotes";
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
         g_rules[i].valueText = (slack > 0) ? "folga " + Money(slack) : "LIMITE ATINGIDO";
         g_rules[i].detailText = "Em aberto -" + Money(loss) + " de -" + Money(g_rules[i].limit) + ". " + g_rules[i].message;
        }
      else if(kind == "risk" && g_rules[i].hasLimit && g_rules[i].limit > 0)
        {
         g_rules[i].pct = openRisk / g_rules[i].limit * 100.0;
         g_rules[i].level = (withoutStop > 0) ? MathMax(2, LevelFor(g_rules[i].pct)) : LevelFor(g_rules[i].pct);
         g_rules[i].valueText = (withoutStop > 0) ? IntegerToString(withoutStop) + " sem stop" : "risco " + Money(openRisk);
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
      bool alertable = (kind == "floor" || kind == "daycap" || kind == "idle" || kind == "close"
                        || kind == "lots" || kind == "floating" || kind == "risk");
      if(!alertable)
         continue;
      int level = g_rules[i].level;
      if(level <= g_rules[i].alertLevel)
         continue;
      g_rules[i].alertLevel = level;
      string text;
      if(kind == "daycap")
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
   if(InpPreview)
     {
      g_notice = "Demonstração: o botão não fecha posições. Na sua conta ele pede confirmação antes.";
      return;
     }
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
//| Painel                                                            |
//+------------------------------------------------------------------+
void MarkUsed(const string name)
  {
   int n = ArraySize(g_used);
   ArrayResize(g_used, n + 1);
   g_used[n] = name;
  }

// Logo do Fortify (mesmo desenho do favicon.svg do site): "F" branco num quadrado
// preto de cantos arredondados. Desenhada em pixels com antialias 4x4.
bool LogoInside(const double px, const double py, const double &xs[], const double &ys[])
  {
   bool in = false;
   int n = ArraySize(xs);
   for(int i = 0, j = n - 1; i < n; j = i++)
      if(((ys[i] > py) != (ys[j] > py)) && (px < (xs[j] - xs[i]) * (py - ys[i]) / (ys[j] - ys[i]) + xs[i]))
         in = !in;
   return in;
  }

void Logo(const string name, const int x, const int y, const int size)
  {
   string res = "::fortify_logo_" + IntegerToString(size);
   static int built = 0;
   if(built != size)
     {
      double ax[] = {32, 232, 191, 82, 82, 32}, ay[] = {29, 29, 71, 71, 180, 229};
      double bx[] = {110, 162, 110}, by[] = {100, 100, 152};
      double scale = 0.2473, offX = 16.0, offY = 18.97; // viewBox 275x251 dentro de 68x64
      uint px[];
      ArrayResize(px, size * size);
      for(int j = 0; j < size; j++)
         for(int i = 0; i < size; i++)
           {
            int inSquare = 0, inF = 0;
            for(int sj = 0; sj < 4; sj++)
               for(int si = 0; si < 4; si++)
                 {
                  double u = (i + (si + 0.5) / 4.0) * 100.0 / size;
                  double v = (j + (sj + 0.5) / 4.0) * 100.0 / size;
                  double cx = MathMax(14.0, MathMin(86.0, u)), cy = MathMax(14.0, MathMin(86.0, v));
                  if((u - cx) * (u - cx) + (v - cy) * (v - cy) > 14.0 * 14.0)
                     continue;
                  inSquare++;
                  double sx = (u - offX) / scale, sy = (v - offY) / scale;
                  if(LogoInside(sx, sy, ax, ay) || LogoInside(sx, sy, bx, by))
                     inF++;
                 }
            uint a = (uint)MathRound(255.0 * inSquare / 16.0);
            uint w = inSquare > 0 ? (uint)MathRound(255.0 * inF / inSquare) : 0;
            px[j * size + i] = (a << 24) | (w << 16) | (w << 8) | w;
           }
      ResourceCreate(res, px, size, size, 0, 0, size, COLOR_FORMAT_ARGB_NORMALIZE);
      built = size;
     }
   string id = PFX + name;
   if(ObjectFind(0, id) < 0)
     {
      ObjectCreate(0, id, OBJ_BITMAP_LABEL, 0, 0, 0);
      ObjectSetInteger(0, id, OBJPROP_CORNER, CORNER_LEFT_UPPER);
      ObjectSetInteger(0, id, OBJPROP_SELECTABLE, false);
      ObjectSetInteger(0, id, OBJPROP_HIDDEN, true);
     }
   ObjectSetString(0, id, OBJPROP_BMPFILE, res);
   ObjectSetInteger(0, id, OBJPROP_XDISTANCE, x);
   ObjectSetInteger(0, id, OBJPROP_YDISTANCE, y);
   MarkUsed(id);
  }

void Rect(const string name, const int x, const int y, const int w, const int h, const color bg, const color border)
  {
   string id = PFX + name;
   if(ObjectFind(0, id) < 0)
     {
      ObjectCreate(0, id, OBJ_RECTANGLE_LABEL, 0, 0, 0);
      ObjectSetInteger(0, id, OBJPROP_CORNER, CORNER_LEFT_UPPER);
      ObjectSetInteger(0, id, OBJPROP_BORDER_TYPE, BORDER_FLAT);
      ObjectSetInteger(0, id, OBJPROP_SELECTABLE, false);
      ObjectSetInteger(0, id, OBJPROP_HIDDEN, true);
      ObjectSetInteger(0, id, OBJPROP_BACK, false);
     }
   ObjectSetInteger(0, id, OBJPROP_XDISTANCE, x);
   ObjectSetInteger(0, id, OBJPROP_YDISTANCE, y);
   ObjectSetInteger(0, id, OBJPROP_XSIZE, MathMax(1, w));
   ObjectSetInteger(0, id, OBJPROP_YSIZE, MathMax(1, h));
   ObjectSetInteger(0, id, OBJPROP_BGCOLOR, bg);
   ObjectSetInteger(0, id, OBJPROP_COLOR, border);
   MarkUsed(id);
  }

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

void Button(const string name, const int x, const int y, const int w, const int h, const string text,
            const color bg, const color fg)
  {
   string id = PFX + name;
   if(ObjectFind(0, id) < 0)
     {
      ObjectCreate(0, id, OBJ_BUTTON, 0, 0, 0);
      ObjectSetInteger(0, id, OBJPROP_CORNER, CORNER_LEFT_UPPER);
      ObjectSetInteger(0, id, OBJPROP_SELECTABLE, false);
      ObjectSetInteger(0, id, OBJPROP_HIDDEN, true);
      ObjectSetString(0, id, OBJPROP_FONT, "Segoe UI Semibold");
      ObjectSetInteger(0, id, OBJPROP_FONTSIZE, 8);
     }
   ObjectSetInteger(0, id, OBJPROP_XDISTANCE, x);
   ObjectSetInteger(0, id, OBJPROP_YDISTANCE, y);
   ObjectSetInteger(0, id, OBJPROP_XSIZE, w);
   ObjectSetInteger(0, id, OBJPROP_YSIZE, h);
   ObjectSetString(0, id, OBJPROP_TEXT, text);
   ObjectSetInteger(0, id, OBJPROP_BGCOLOR, bg);
   ObjectSetInteger(0, id, OBJPROP_COLOR, fg);
   ObjectSetInteger(0, id, OBJPROP_BORDER_COLOR, C_BORDER);
   ObjectSetInteger(0, id, OBJPROP_STATE, false);
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
      ObjectSetInteger(0, id, OBJPROP_FONTSIZE, 8);
      ObjectSetInteger(0, id, OBJPROP_ALIGN, ALIGN_CENTER);
      ObjectSetString(0, id, OBJPROP_TEXT, initial); // depois disso o texto e do trader
     }
   ObjectSetInteger(0, id, OBJPROP_XDISTANCE, x);
   ObjectSetInteger(0, id, OBJPROP_YDISTANCE, y);
   ObjectSetInteger(0, id, OBJPROP_XSIZE, w);
   ObjectSetInteger(0, id, OBJPROP_YSIZE, h);
   ObjectSetInteger(0, id, OBJPROP_BGCOLOR, C_TRACK);
   ObjectSetInteger(0, id, OBJPROP_COLOR, C_TEXT);
   ObjectSetInteger(0, id, OBJPROP_BORDER_COLOR, C_BORDER);
   MarkUsed(id);
  }

// Quanto vale 1 ponto de preco para 1 lote do ativo, na moeda da conta.
double PointValuePerLot(const string symbol)
  {
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
   if(InpPreview)
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

// Quebra o texto em linhas de ate `width` caracteres, no maximo `maxLines`.
int WrapText(const string text, const int width, const int maxLines, string &out[])
  {
   ArrayResize(out, 0);
   string words[];
   int count = StringSplit(text, ' ', words);
   string line = "";
   int lines = 0;
   for(int i = 0; i < count; i++)
     {
      string candidate = (line == "") ? words[i] : line + " " + words[i];
      if(StringLen(candidate) > width && line != "")
        {
         lines++;
         ArrayResize(out, lines);
         out[lines - 1] = line;
         line = words[i];
         if(lines == maxLines)
            break;
        }
      else
         line = candidate;
     }
   if(lines < maxLines && line != "")
     {
      lines++;
      ArrayResize(out, lines);
      out[lines - 1] = line;
     }
   else if(lines == maxLines && line != "" && ArraySize(out) > 0)
      out[lines - 1] = StringSubstr(out[lines - 1], 0, MathMax(0, width - 3)) + "...";
   return lines;
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

int g_panelBottom = 0;

// Desenha o painel; se nao couber na altura do grafico, redesenha compacto
// (sem o texto de detalhe das regras que estao no verde).
void DrawPanelPass(const int density);

// 0 = completo; 1 = sem o texto de detalhe das regras no verde; 2 = tambem sem
// as barras das regras no verde e sem os lembretes (grafico baixo).
void DrawPanel()
  {
   int chartH = (int)ChartGetInteger(0, CHART_HEIGHT_IN_PIXELS);
   for(int density = 0; density <= 2; density++)
     {
      DrawPanelPass(density);
      if(g_panelBottom <= chartH - 6)
         break;
     }
  }

void DrawPanelPass(const int density)
  {
   ArrayResize(g_used, 0);
   int chartW = (int)ChartGetInteger(0, CHART_WIDTH_IN_PIXELS);
   // A largura do grafico inclui a escala de preco a direita (~70px).
   int x0 = (InpCorner == GUARD_RIGHT) ? MathMax(8, chartW - PANEL_W - 84) : 12;
   int y0 = 28;
   int inner = PANEL_W - 2 * PAD;
   int y = y0 + PAD;

   // Fundo primeiro: no MT5 o objeto criado antes fica atras dos demais.
   Rect("bg", x0, y0, PANEL_W, 40, C_BG, C_BORDER);

   // Cabecalho
   // Logo no canto superior esquerdo, com o nome ao lado.
   Logo("logo", x0 + PAD, y, 34);
   Label("title", x0 + PAD + 44, y, "Fortify Guard", C_TEXT, 11, "Segoe UI Semibold");
   if(InpPreview)
      Label("demo", x0 + PANEL_W - PAD - 32, y + 2, "DEMONSTRAÇÃO", C_WARN, 7, "Segoe UI Semibold", ANCHOR_RIGHT_UPPER);
   Button("btn_min", x0 + PANEL_W - PAD - 24, y - 2, 24, 18, g_collapsed ? "+" : "-", C_TRACK, C_TEXT);
   y += 20;
   // So o essencial: programa e tamanho (a mesa vem no nome do programa).
   string subtitle = g_hasFeed ? g_program + (g_size != "" ? "  ·  " + g_size : "") : "Conectando...";
   Label("subtitle", x0 + PAD + 44, y, subtitle, C_MUTED, 8);
   y += 26;

   // Regra mais perto do limite: maior nivel; no empate, maior percentual usado.
   int worst = 0, worstIdx = -1;
   double worstPct = -1.0, canLose = 0.0;
   bool hasCanLose = false;
   string canLoseLabel = "";
   for(int i = 0; i < ArraySize(g_rules); i++)
     {
      string k = g_rules[i].kind;
      if(k == "target" || k == "counter" || k == "note")
         continue;
      if(g_rules[i].level > worst || (g_rules[i].level == worst && g_rules[i].pct > worstPct))
        {
         worst = g_rules[i].level;
         worstPct = g_rules[i].pct;
         worstIdx = i;
        }
      if(g_rules[i].hasSlack && (!hasCanLose || g_rules[i].slack < canLose))
        {
         canLose = g_rules[i].slack;
         hasCanLose = true;
         canLoseLabel = g_rules[i].label;
        }
     }

   if(!g_collapsed && g_hasFeed && g_error == "")
     {
      color tone = LevelColor(worst);
      color tint;
      if(g_light)
         tint = (worst >= 3) ? C'253,228,228' : (worst == 2) ? C'254,234,218' : (worst == 1) ? C'253,245,222' : C'230,246,236';
      else
         tint = (worst >= 3) ? C'52,20,22' : (worst == 2) ? C'52,32,14' : (worst == 1) ? C'46,38,14' : C'16,38,28';
      // Critico ou limite: a faixa pisca para chamar o olho do trader.
      if(worst >= 2 && (GetTickCount() / 500) % 2 == 0)
         tint = g_light ? C'250,196,196' : C'96,30,30';
      // Faixa de status: o que importa (status) e o numero que decide (quanto ainda pode perder).
      string headline = "Dentro das regras";
      if(worstIdx >= 0 && worst >= 1)
         headline = g_rules[worstIdx].label + " · " + DoubleToString(MathMin(999.0, g_rules[worstIdx].pct), 0) + "%";
      Rect("hero_bg", x0 + PAD, y, inner, 50, tint, tone);
      Rect("hero_bar", x0 + PAD, y, 3, 50, tone, tone);
      Label("hero_title", x0 + PAD + 12, y + 8, headline, C_TEXT, 10, "Segoe UI Semibold");
      Label("hero_sub", x0 + PAD + 12, y + 28, "pode perder hoje", C_MUTED, 8);
      Label("hero_val", x0 + PANEL_W - PAD - 12, y + 13, hasCanLose ? Money(MathMax(0.0, canLose)) : "-",
            hasCanLose ? tone : C_MUTED, 14, "Segoe UI Semibold", ANCHOR_RIGHT_UPPER);
      y += 60;

      // Simulador: stop em pontos -> lote maximo que cabe na folga de hoje.
      double pointValue = PointValuePerLot(_Symbol);
      Label("sim_cap", x0 + PAD, y + 3, "Stop", C_MUTED, 8);
      Edit("sim_stop", x0 + PAD + 34, y, 52, 20, IntegerToString(g_simStop));
      string simText = "pts";
      if(hasCanLose && pointValue > 0)
         simText = "pts  →  " + FormatLots(SimLots(canLose, g_simStop, pointValue)) + " lotes";
      Label("sim_txt", x0 + PAD + 94, y + 3, simText, C_TEXT, 8, "Segoe UI Semibold");
      y += 30;
      DrawBreakLine(hasCanLose, canLose, canLoseLabel, worst);
     }

   if(!g_collapsed)
     {
      if(g_error != "")
        {
         string lines[];
         int n = WrapText(g_error, 52, 4, lines);
         Rect("err_bg", x0 + PAD, y, inner, 12 + n * 14, C_ERRBG, C_BREACH);
         for(int l = 0; l < n; l++)
            Label("err_" + IntegerToString(l), x0 + PAD + 8, y + 6 + l * 14, lines[l], C_TEXT, 8);
         y += 12 + n * 14 + 10;
        }

      // Abas por grupo: Conta (zera a conta) e Saque (metas e saque). Lembretes/notícias não fazem parte do Guard.
      string groupIds[] = {"account", "payout"};
      string groupTitles[] = {"Conta", "Saque"};
      bool present[2];
      bool alerting[2];
      ArrayInitialize(present, false);
      ArrayInitialize(alerting, false);
      bool grouped = false;
      for(int i = 0; i < ArraySize(g_rules); i++)
        {
         for(int g = 0; g < 2; g++)
           {
            if(g_rules[i].group != groupIds[g])
               continue;
            grouped = true;
            present[g] = true;
            string k = g_rules[i].kind;
            if(g_rules[i].level >= 1 && k != "note" && k != "target" && k != "counter")
               alerting[g] = true;
           }
        }
      if(grouped)
        {
         int tabs = 0;
         bool activeOk = false;
         for(int g = 0; g < 2; g++)
           {
            if(!present[g])
               continue;
            tabs++;
            if(groupIds[g] == g_tab)
               activeOk = true;
           }
         if(!activeOk)
            for(int g = 0; g < 2; g++)
               if(present[g])
                 {
                  g_tab = groupIds[g];
                  break;
                 }
         int tabW = (inner - (tabs - 1) * 6) / tabs;
         int tx = x0 + PAD;
         for(int g = 0; g < 2; g++)
           {
            if(!present[g])
               continue;
            bool on = (g_tab == groupIds[g]);
            string title = groupTitles[g] + (alerting[g] ? "  ●" : "");
            color fg = on ? C_TEXT : (alerting[g] ? C_WARN : C_MUTED);
            Button("tab_" + groupIds[g], tx, y, tabW, 20, title, on ? C_TABON : C_BG, fg);
            tx += tabW + 6;
           }
         y += 28;
        }

      for(int i = 0; i < ArraySize(g_rules); i++)
        {
         string id = "r" + IntegerToString(i) + "_";
         string kind = g_rules[i].kind;
         if(grouped && g_rules[i].group != g_tab)
            continue;
         if(density >= 2 && kind == "note")
            continue;
         bool measured = (kind == "floor" || kind == "daycap" || kind == "target" || kind == "counter"
                          || kind == "idle" || kind == "close" || kind == "lots" || kind == "floating" || kind == "risk");
         color accent = (kind == "target" || kind == "counter") ? C_INFO
                        : (kind == "note") ? C_MUTED
                        : LevelColor(g_rules[i].level);

         Rect(id + "dot", x0 + PAD, y + 5, 6, 6, accent, accent);
         Label(id + "label", x0 + PAD + 12, y, g_rules[i].label, C_TEXT, 9, "Segoe UI Semibold");
         // A explicacao da regra fica no tooltip: passa o mouse em cima para ler.
         ObjectSetString(0, PFX + id + "label", OBJPROP_TOOLTIP, g_rules[i].detailText != "" ? g_rules[i].detailText : g_rules[i].label);
         bool calm = (g_rules[i].level == 0 && kind != "target" && kind != "counter");
         if(g_rules[i].valueText != "")
            Label(id + "value", x0 + PANEL_W - PAD, y, g_rules[i].valueText, calm ? C_TEXT : accent, 9, "Segoe UI Semibold", ANCHOR_RIGHT_UPPER);
         y += 18;

         bool showBar = (measured && kind != "counter") || (kind == "counter" && g_rules[i].hasRequired);
         if(density >= 2 && g_rules[i].level == 0)
            showBar = false;
         if(showBar)
           {
            Rect(id + "track", x0 + PAD, y, inner, 4, C_TRACK, C_TRACK);
            int fill = (int)MathRound(inner * MathMin(100.0, g_rules[i].pct) / 100.0);
            if(fill > 0)
               Rect(id + "fill", x0 + PAD, y, fill, 4, accent, accent);
            y += 4;
           }
         y += (density >= 2) ? 6 : 12;
        }

      if(ArraySize(g_rules) == 0 && g_error == "")
        {
         Label("empty", x0 + PAD, y, g_hasFeed ? "Nenhuma regra escolhida para o EA nesta conta." : "Conectando ao Fortify...", C_MUTED, 8);
         y += 22;
        }

      if(g_notice != "")
        {
         string lines[];
         int n = WrapText(g_notice, 56, 2, lines);
         for(int l = 0; l < n; l++)
            Label("notice" + IntegerToString(l), x0 + PAD, y + l * 13, lines[l], C_WARN, 7);
         y += n * 13 + 6;
        }

      // "Atualizar" so aparece quando algo deu errado; no normal o EA atualiza sozinho.
      if(g_error != "")
        {
         int bw = (inner - 8) / 2;
         Button("btn_close", x0 + PAD, y, bw, 24, "Fechar posições", worst >= 2 ? C_BREACH : C_TRACK, C_TEXT);
         Button("btn_refresh", x0 + PAD + bw + 8, y, bw, 24, "Tentar de novo", C_TRACK, C_TEXT);
        }
      else
         Button("btn_close", x0 + PAD, y, inner, 24, "Fechar posições", worst >= 2 ? C_BREACH : C_TRACK, C_TEXT);
      y += 32;
     }
   else
     {
      string mini = (worstIdx >= 0 && worst >= 1) ? "Atenção · " + g_rules[worstIdx].label : "Dentro das regras";
      if(hasCanLose)
         mini += "  ·  pode perder " + Money(MathMax(0.0, canLose)) + " hoje";
      Label("collapsed", x0 + PAD, y, mini, worst >= 1 ? LevelColor(worst) : C_OK, 8, "Segoe UI Semibold");
      y += 18;
     }

   int h = y - y0 + PAD / 2;
   g_panelBottom = y0 + h;
   color border = (worst >= 2 && !g_collapsed) ? LevelColor(worst) : C_BORDER;
   Rect("bg", x0, y0, PANEL_W, h, C_BG, border);
   // Botoes recebem o clique antes do fundo.
   ObjectSetInteger(0, PFX + "bg", OBJPROP_ZORDER, 0);
   for(int i = 0; i < ArraySize(g_used); i++)
      if(g_used[i] != PFX + "bg")
         ObjectSetInteger(0, g_used[i], OBJPROP_ZORDER, 1);

   // Remove objetos de regras que sairam da lista.
   for(int i = ObjectsTotal(0, 0, -1) - 1; i >= 0; i--)
     {
      string name = ObjectName(0, i, 0, -1);
      if(StringFind(name, PFX) != 0)
         continue;
      bool keep = false;
      for(int j = 0; j < ArraySize(g_used) && !keep; j++)
         keep = (g_used[j] == name);
      if(!keep)
         ObjectDelete(0, name);
     }
   ChartRedraw(0);
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
   g_utcDay = UtcDayKey(TimeGMT());
   g_startTick = GetTickCount();
   if(GlobalVariableCheck(PeakVarName()))
      g_peakEquity = GlobalVariableGet(PeakVarName());
   g_peakEquity = MathMax(g_peakEquity, AccountInfoDouble(ACCOUNT_EQUITY));
   g_currency = AccountInfoString(ACCOUNT_CURRENCY);
   g_trade.SetDeviationInPoints(30);
   g_simStop = MathMax(1, InpSimStopPoints);
   if(InpPreview)
     {
      // Demonstração: aba inicial opcional, lida de MQL5\Files (só para gerar prints).
      int fh = FileOpen("FortifyGuard_preview_tab.txt", FILE_READ | FILE_TXT | FILE_ANSI);
      if(fh != INVALID_HANDLE)
        {
         string tab = FileReadString(fh);
         StringTrimRight(tab);
         StringTrimLeft(tab);
         if(tab != "")
            g_tab = tab;
         FileClose(fh);
        }
      // Demonstração: janela solta de tamanho fixo, para o print sair igual em qualquer perfil.
      ChartSetInteger(0, CHART_IS_DOCKED, false);
      ChartSetInteger(0, CHART_FLOAT_LEFT, 20);
      ChartSetInteger(0, CHART_FLOAT_TOP, 20);
      ChartSetInteger(0, CHART_FLOAT_RIGHT, 1300);
      ChartSetInteger(0, CHART_FLOAT_BOTTOM, 820);
      if(InpTheme == GUARD_THEME_LIGHT)
        {
         ChartSetInteger(0, CHART_COLOR_BACKGROUND, clrWhite);
         ChartSetInteger(0, CHART_COLOR_FOREGROUND, clrBlack);
         ChartSetInteger(0, CHART_COLOR_GRID, C'226,229,236');
        }
     }
   ApplyTheme();
   ObjectsDeleteAll(0, PFX);
   // O painel fica por cima do grafico.
   ChartSetInteger(0, CHART_FOREGROUND, false);
   EventSetMillisecondTimer(500);
   DrawPanel();
   return INIT_SUCCEEDED;
  }

void OnDeinit(const int reason)
  {
   EventKillTimer();
   ObjectsDeleteAll(0, PFX);
   ChartRedraw(0);
  }

void OnTimer()
  {
   string today = UtcDayKey(TimeGMT());
   bool newDay = (today != g_utcDay);
   if(newDay)
     {
      g_utcDay = today;
      for(int i = 0; i < ArraySize(g_rules); i++)
         g_rules[i].alertLevel = 0;
     }
   if(newDay || g_lastPoll == 0 || TimeLocal() - g_lastPoll >= g_pollSeconds)
      Poll();
   ComputeLive();
   if(g_error == "")
      CheckAlerts();
   DrawPanel();
   if(InpPreview && !g_previewShot && g_hasFeed && GetTickCount() - g_startTick > 10000)
     {
      g_previewShot = true;
      int w = (int)ChartGetInteger(0, CHART_WIDTH_IN_PIXELS);
      int h = (int)ChartGetInteger(0, CHART_HEIGHT_IN_PIXELS);
      if(ChartScreenShot(0, "FortifyGuard_preview.png", w, h, ALIGN_RIGHT))
         Print("Fortify Guard: prévia salva em MQL5\\Files\\FortifyGuard_preview.png");
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
     }
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
   if(id != CHARTEVENT_OBJECT_CLICK)
      return;
   if(sparam == PFX + "btn_refresh")
     {
      g_notice = "";
      Poll();
     }
   else if(sparam == PFX + "btn_close")
      CloseAllPositions();
   else if(sparam == PFX + "btn_min")
      g_collapsed = !g_collapsed;
   else if(StringFind(sparam, PFX + "tab_") == 0)
      g_tab = StringSubstr(sparam, StringLen(PFX + "tab_"));
   else
      return;
   ObjectSetInteger(0, sparam, OBJPROP_STATE, false);
   ComputeLive();
   DrawPanel();
  }
//+------------------------------------------------------------------+
