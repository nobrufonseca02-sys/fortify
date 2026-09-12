import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ClipboardCopy,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useAccountsStore } from "@/hooks/useAccountsStore";
import { supabase } from "@/integrations/supabase/client";
import type { AccountRuleBindingRow } from "@/lib/ruleBinding";
import { parseRuleLimit } from "@/lib/ruleEngine/ruleEngineTypes";
import { TradingViewMarkIcon, useTradingView } from "@/components/tradingview/TradingViewProvider";
import {
  INSTRUMENT_PRESETS,
  calculateRisk,
  toNumber,
  type AssetCategory,
  type InstrumentPreset,
  type TradeDirection,
  type TradeStatus,
} from "@/lib/riskCalculator";

const money = (value: number) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });

const pct = (value: number) => `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
const numberText = (value: number, digits = 2) => value.toLocaleString("pt-BR", { maximumFractionDigits: digits });

// Arredondamento conservador, só na exibição — o motor de cálculo não é tocado.
// Folga sempre para baixo, perda sempre para cima: a tela nunca promete mais
// espaço nem menos risco do que o cálculo entregou.
const floorMoney = (value: number) => Math.floor(value * 100) / 100;
const ceilMoney = (value: number) => Math.ceil(value * 100) / 100;

// Separa a string formatada em {símbolo, dígitos} para o "US$" entrar menor e
// mais claro que o número — convenção de painel financeiro —, em vez de uma
// string plana onde a moeda pesa igual ao valor.
function moneyParts(value: number) {
  const parts = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).formatToParts(value);
  let symbol = "";
  let rest = "";
  for (const part of parts) {
    if (part.type === "currency") symbol += part.value;
    else rest += part.value;
  }
  return { symbol: symbol.trim(), rest: rest.trim() };
}

/** Dinheiro na voz de apoio (mono tabular, peso travado em 600 — ver .numeral-ledger). */
function Money({ value, className }: { value: number; className?: string }) {
  const { symbol, rest } = moneyParts(value);
  return (
    <span className={cn("numeral-ledger", className)}>
      <span className="mr-0.5 align-[0.1em] text-[0.68em] font-normal text-muted-foreground">{symbol}</span>
      {rest}
    </span>
  );
}

/** Dinheiro na voz de decisão (Inter tabular — ver .numeral-hero). */
function MoneyLead({ value, className }: { value: number; className?: string }) {
  const { symbol, rest } = moneyParts(value);
  return (
    <span className={cn("numeral-hero", className)}>
      <span className="mr-1 align-[0.15em] text-[0.42em] font-semibold tracking-normal text-muted-foreground">
        {symbol}
      </span>
      {rest}
    </span>
  );
}

const categories: AssetCategory[] = ["Forex", "Metals", "Indices", "Commodities"];

type PanelState = TradeStatus | "Repouso";

// Estado → linguagem visual. "Repouso" existe porque formulário vazio é
// formulário vazio, não risco crítico: o motor devolve "Crítico" enquanto
// faltar entrada/stop (status = Crítico se warnings.length > 0), e a
// apresentação deixa de repetir isso. Cada estado carrega ícone + texto + cor
// juntos, nunca cor sozinha, e a cor entra pelo trilho (--rail-color), então o
// estado sobrevive à rolagem.
const statusMeta: Record<
  PanelState,
  { label: string; Icon: typeof ShieldCheck; chipClass: string; railClass: string }
> = {
  Repouso: {
    label: "Aguardando trade",
    Icon: Shield,
    chipClass: "border-border bg-muted/40 text-muted-foreground",
    railClass: "[--rail-color:hsl(var(--border))]",
  },
  Seguro: {
    label: "Seguro",
    Icon: ShieldCheck,
    chipClass: "border-success/30 bg-success/10 text-success",
    railClass: "[--rail-color:hsl(var(--success))]",
  },
  Atenção: {
    label: "Atenção",
    Icon: ShieldAlert,
    chipClass: "border-warning/30 bg-warning/10 text-warning",
    railClass: "[--rail-color:hsl(var(--warning))]",
  },
  Crítico: {
    label: "Crítico",
    Icon: ShieldX,
    chipClass: "border-destructive/30 bg-destructive/10 text-destructive",
    railClass: "[--rail-color:hsl(var(--destructive))]",
  },
};

function inputClass(extra = "") {
  return `h-11 bg-muted/50 text-sm ${extra}`;
}

/** Rótulo de campo na mesma voz tipográfica dos rótulos de valor (.instrument-label). */
function Field({ label, children, helper }: { label: string; children: React.ReactNode; helper?: string }) {
  return (
    <label className="space-y-1.5">
      <span className="instrument-label block text-[10px] text-muted-foreground">{label}</span>
      {children}
      {helper ? <span className="block text-[10px] leading-relaxed text-muted-foreground/75">{helper}</span> : null}
    </label>
  );
}

// Controle segmentado leve — direção (compra/venda) e modo de risco (%/$).
// Botões simples em vez do ToggleGroup compartilhado para tonalizar
// compra/venda por opção sem brigar com o data-state do primitivo.
type SegmentOption<T extends string> = { value: T; label: string; icon?: React.ReactNode; activeClass?: string };

function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    // p-[3px] em vez de p-1: o alvo de toque interno sobe de 36px para 38px
    // sem quebrar o alinhamento com os inputs de 44px ao lado no mesmo grid.
    <div role="group" className={cn("flex h-11 items-center gap-1 rounded-md border border-border bg-muted/40 p-[3px]", className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              // O botão desenha 36px de alto para caber no trilho de 44px do
              // grid. O ::after estica só na vertical (inset-x-0), levando o
              // alvo de toque a 44px sem invadir o segmento vizinho.
              "relative flex h-full flex-1 items-center justify-center gap-1.5 rounded-sm text-xs font-semibold transition-colors after:absolute after:-inset-y-1 after:inset-x-0 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              active ? (option.activeClass ?? "bg-background text-foreground shadow-sm") : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

// Os DOIS insights da tela. Cada um responde a uma pergunta de sobrevivência:
// "o que me tira do dia" e "o que me tira da conta". A barra mostra a FOLGA que
// resta e drena conforme o risco sobe, não o consumo — o trader decide com o
// que sobra. O estado também é texto ("Folga apertada"), então a leitura não
// depende de enxergar a cor.
function BufferInsight({
  label,
  remaining,
  limit,
  consumedPercent,
  tradesLeft,
  note,
  ready,
}: {
  label: string;
  remaining: number;
  limit: number;
  consumedPercent: number;
  tradesLeft: number | null;
  note?: string;
  ready: boolean;
}) {
  const consumed = Math.max(0, Math.min(100, consumedPercent));
  const freePercent = 100 - consumed;
  const breached = ready && remaining <= 0;
  const tone = breached || consumed > 70 ? "destructive" : consumed > 35 ? "warning" : "success";
  const toneText = breached
    ? "Estoura o limite"
    : consumed > 70
      ? "Folga crítica"
      : consumed > 35
        ? "Folga apertada"
        : "Folga confortável";
  const barClass = { destructive: "bg-destructive", warning: "bg-warning", success: "bg-success" }[tone];
  const textClass = { destructive: "text-destructive", warning: "text-warning", success: "text-success" }[tone];
  const shownValue = floorMoney(Math.max(0, ready ? remaining : limit));

  return (
    <div className="px-4 py-3.5">
      <p className="instrument-label text-[10px] text-muted-foreground">{label}</p>
      <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <MoneyLead value={shownValue} className="text-[26px] text-foreground" />
        <span className={cn("shrink-0 text-[11px] font-semibold", ready ? textClass : "text-muted-foreground")}>
          {ready ? toneText : "Limite intacto"}
        </span>
      </div>
      <div
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={Math.round(ready ? freePercent : 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${pct(ready ? freePercent : 100)} de folga`}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-300", ready ? barClass : "bg-muted-foreground/30")}
          style={{ width: `${ready ? freePercent : 100}%` }}
        />
      </div>
      <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
        de <Money value={limit} className="text-[11px]" />
        {ready && tradesLeft !== null ? ` · cabem ~${tradesLeft} trade${tradesLeft === 1 ? "" : "s"} desse tamanho` : ""}
        {note ? ` · ${note}` : ""}
      </p>
    </div>
  );
}

const RiskCalculator = () => {
  const { user } = useAuth();
  const { accounts } = useAccountsStore();
  const { openChart } = useTradingView();
  const reduceMotion = useReducedMotion();
  const [accountSource, setAccountSource] = useState("manual");
  const [equity, setEquity] = useState("10000");
  const [dailyLossPercent, setDailyLossPercent] = useState("5");
  const [drawdownPercent, setDrawdownPercent] = useState("10");
  const [riskMode, setRiskMode] = useState<"percent" | "amount">("percent");
  const [riskPercent, setRiskPercent] = useState("0.5");
  const [riskAmount, setRiskAmount] = useState("50");
  const [symbol, setSymbol] = useState("EUR/USD");
  const [direction, setDirection] = useState<TradeDirection>("buy");
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [manualStopDistance, setManualStopDistance] = useState("");
  const [manualTargetDistance, setManualTargetDistance] = useState("");
  const [manualLot, setManualLot] = useState("");
  const [valueOverride, setValueOverride] = useState("10");
  const [ruleBinding, setRuleBinding] = useState<AccountRuleBindingRow | null>(null);

  const selectedPreset = useMemo<InstrumentPreset>(
    () => INSTRUMENT_PRESETS.find((preset) => preset.displaySymbol === symbol) || INSTRUMENT_PRESETS[0],
    [symbol],
  );
  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === accountSource) || null,
    [accounts, accountSource],
  );
  const equityValue = toNumber(equity) || 0;
  const baseAmount = selectedAccount?.startBalance || equityValue;

  const dailyDerived = ruleBinding ? parseRuleLimit(ruleBinding.rule_snapshot.criticalRules.dailyLoss, baseAmount) : null;
  const drawdownDerived = ruleBinding ? parseRuleLimit(ruleBinding.rule_snapshot.criticalRules.maxLoss, baseAmount) : null;
  const dailyLimitValue = dailyDerived ? dailyDerived.amount : (equityValue * (toNumber(dailyLossPercent) || 0)) / 100;
  const drawdownLimitValue = drawdownDerived ? drawdownDerived.amount : (equityValue * (toNumber(drawdownPercent) || 0)) / 100;

  const unitSize = selectedPreset.pipSize || selectedPreset.pointSize || 1;
  const valuePerUnit = toNumber(valueOverride) || selectedPreset.pipValuePerLot || selectedPreset.pointValuePerLot || 0;
  const currentRiskAmount = riskMode === "percent" ? equityValue * ((toNumber(riskPercent) || 0) / 100) : toNumber(riskAmount) || 0;
  const currentRiskPercent = equityValue > 0 ? (currentRiskAmount / equityValue) * 100 : 0;

  const result = useMemo(
    () =>
      calculateRisk({
        equity: equityValue,
        riskPercent: currentRiskPercent,
        riskAmount: currentRiskAmount,
        entryPrice: toNumber(entryPrice),
        stopLoss: toNumber(stopLoss),
        takeProfit: toNumber(takeProfit),
        manualStopDistance: toNumber(manualStopDistance),
        manualTargetDistance: toNumber(manualTargetDistance),
        manualLot: toNumber(manualLot),
        valuePerUnit,
        unitSize,
        minLot: selectedPreset.minLot,
        maxLot: selectedPreset.maxLot,
        lotStep: selectedPreset.lotStep,
        dailyLossLimitAmount: dailyLimitValue,
        totalDrawdownLimitAmount: drawdownLimitValue,
      }),
    [
      currentRiskAmount,
      currentRiskPercent,
      dailyLimitValue,
      drawdownLimitValue,
      entryPrice,
      equityValue,
      manualLot,
      manualStopDistance,
      manualTargetDistance,
      selectedPreset.lotStep,
      selectedPreset.maxLot,
      selectedPreset.minLot,
      stopLoss,
      takeProfit,
      unitSize,
      valuePerUnit,
    ],
  );

  useEffect(() => {
    setValueOverride(String(selectedPreset.pipValuePerLot || selectedPreset.pointValuePerLot || 1));
  }, [selectedPreset]);

  useEffect(() => {
    if (!selectedAccount) return;
    const nextEquity = Number(selectedAccount.currentEquity || selectedAccount.startBalance || 0);
    if (Number.isFinite(nextEquity) && nextEquity > 0) setEquity(String(Math.round(nextEquity * 100) / 100));
  }, [selectedAccount]);

  useEffect(() => {
    if (accountSource === "manual" || !user?.id) {
      setRuleBinding(null);
      return;
    }
    let cancelled = false;
    (supabase
      .from("account_rule_bindings" as any)
      .select("*")
      .eq("trading_account_id", accountSource)
      .eq("user_id", user.id)
      .eq("binding_status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle() as any
    ).then(({ data }: any) => {
      if (!cancelled) setRuleBinding((data as AccountRuleBindingRow) ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [accountSource, user?.id]);

  useEffect(() => {
    if (riskMode !== "percent") return;
    setRiskAmount(String(Math.round(currentRiskAmount * 100) / 100));
  }, [currentRiskAmount, riskMode]);

  useEffect(() => {
    if (riskMode !== "amount") return;
    setRiskPercent(equityValue > 0 ? String(Math.round(currentRiskPercent * 100) / 100) : "0");
  }, [currentRiskPercent, equityValue, riskMode]);

  const reset = () => {
    setAccountSource("manual");
    setEquity("10000");
    setDailyLossPercent("5");
    setDrawdownPercent("10");
    setRiskMode("percent");
    setRiskPercent("0.5");
    setSymbol("EUR/USD");
    setDirection("buy");
    setEntryPrice("");
    setStopLoss("");
    setTakeProfit("");
    setManualStopDistance("");
    setManualTargetDistance("");
    setManualLot("");
  };

  const copySummary = async () => {
    const summary = [
      `Ativo: ${symbol}`,
      `Direção: ${direction === "buy" ? "Compra" : "Venda"}`,
      `Entrada: ${entryPrice || "não informada"}`,
      `Stop: ${stopLoss || `${numberText(result.stopDistance)} pips/pontos`}`,
      `TP: ${takeProfit || `${numberText(result.targetDistance)} pips/pontos`}`,
      `Lote: ${numberText(result.effectiveLot)}`,
      `Risco: ${money(result.lossAtStop)} (${pct(result.riskPercent)})`,
      `Ganho potencial: ${money(result.potentialProfit)}`,
      `R:R: ${numberText(result.riskReward)}R`,
      `Status prop: ${result.status}`,
    ].join("\n");
    await navigator.clipboard.writeText(summary);
    toast({ title: "Resumo copiado", description: "Resumo do trade enviado para a área de transferência." });
  };

  // Estado de repouso ≠ estado de erro. Enquanto o motor não tem distância de
  // stop, valor por pip/ponto, saldo e risco, não existe trade para julgar —
  // então a tela não mostra status, não mostra alerta vermelho e não mostra
  // "lote 0". Mostra um traço e o limite ainda intacto da conta.
  const hasTradeInput = result.stopDistance > 0 && valuePerUnit > 0 && equityValue > 0 && currentRiskAmount > 0;

  const panelState: PanelState = hasTradeInput ? result.status : "Repouso";
  const resultMeta = statusMeta[panelState];
  const StatusIcon = resultMeta.Icon;
  const visibleWarnings = hasTradeInput ? result.warnings : [];

  const dailyBufferAfterStop = dailyLimitValue - result.lossAtStop;
  const drawdownBufferAfterStop = drawdownLimitValue - result.lossAtStop;
  const hasManualLot = (toNumber(manualLot) || 0) > 0;
  const hasTarget = hasTradeInput && result.targetDistance > 0 && result.riskReward > 0;
  const lotDigits = Math.max(0, String(selectedPreset.lotStep).split(".")[1]?.length || 0);
  const lotText = result.recommendedLot.toLocaleString("pt-BR", {
    minimumFractionDigits: lotDigits,
    maximumFractionDigits: lotDigits,
  });
  const advisoryText = !hasTradeInput
    ? "Informe entrada e stop (ou a distância do stop) para calcular o lote."
    : result.status === "Seguro"
      ? "Risco dentro de uma faixa conservadora."
      : result.status === "Atenção"
        ? "Opere com cautela. Este trade já pressiona seus limites de perda."
        : "Risco elevado para conta prop. Considere reduzir lote ou aumentar a qualidade do setup.";

  const riskPercentValue = Math.min(3, Math.max(0.1, toNumber(riskPercent) || 0.1));

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <div className="hero-surface p-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:p-6">
        <div>
          <p className="eyebrow">Command center</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground md:text-3xl">Calculadora de Risco</h1>
          <p className="mt-1.5 max-w-md text-xs text-muted-foreground">
            Quanto abrir agora — e quanto isso consome do que ainda te sobra até quebrar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={reset} className="pill-btn">
            <RotateCcw className="h-4 w-4" />
            Resetar
          </button>
          <button type="button" onClick={() => openChart(symbol)} className="pill-btn">
            <span className="flex h-7 w-7 items-center justify-center rounded bg-[#131722] shrink-0">
              <TradingViewMarkIcon className="h-4 w-4" />
            </span>
            TradingView
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
        {/* Painel de decisão — primeiro no DOM para o celular abrir nele, fixo à
            direita no desktop para continuar visível enquanto os campos mudam.
            O trilho de estado na borda esquerda carrega o estado de forma
            estrutural: segue legível depois que o rótulo já saiu da tela. */}
        <aside className="lg:sticky lg:top-6 lg:col-start-2 lg:row-start-1">
          <div
            className={cn(
              "state-rail overflow-hidden rounded-lg border border-border bg-card shadow-lg shadow-background/50",
              resultMeta.railClass,
            )}
          >
            <div className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-3">
              <div>
                <p className="instrument-label text-[10px] text-muted-foreground">Decisão do trade</p>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={panelState}
                    initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -4 }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    className={cn(
                      "mt-1.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
                      resultMeta.chipClass,
                    )}
                  >
                    <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    {resultMeta.label}
                  </motion.span>
                </AnimatePresence>
              </div>
              <span className="numeral-ledger shrink-0 text-right text-xs text-muted-foreground">
                {symbol}
                <br />
                {direction === "buy" ? "Compra" : "Venda"}
              </span>
            </div>

            {/* Número herói — a única coisa desta tela com permissão de gritar.
                Inter tabular (.numeral-hero): largura de dígito fixa, então o
                valor não dança enquanto o trader digita. Em repouso é um traço,
                não um zero: zero é um resultado, traço é a ausência dele. */}
            <div className="border-b border-border/60 px-4 py-5">
              <p className="instrument-label text-[10px] text-muted-foreground">Lote recomendado</p>
              <p
                className="numeral-hero mt-1 text-[clamp(2.75rem,9vw,4rem)] text-foreground"
                aria-label={hasTradeInput ? `Lote recomendado ${lotText}` : "Lote recomendado indisponível"}
              >
                {hasTradeInput ? (
                  lotText
                ) : (
                  // Traço leve e menor: ausência de valor, não um bloco sólido
                  // que o olho lê como barra de carregamento.
                  <span className="align-middle text-[0.6em] font-light text-muted-foreground/35">—</span>
                )}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {hasTradeInput ? (
                  <>
                    arriscando <Money value={ceilMoney(result.lossAtStop)} className="text-[13px] text-foreground" /> ·{" "}
                    {pct(result.riskPercent)} do saldo
                  </>
                ) : (
                  advisoryText
                )}
              </p>
              {hasTradeInput && hasManualLot ? (
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Lote manual aplicado:{" "}
                  <span className="numeral-ledger text-foreground">{numberText(result.effectiveLot)}</span>
                </p>
              ) : null}
            </div>

            {visibleWarnings.length ? (
              <div className="space-y-1 border-b border-border/60 bg-destructive/5 px-4 py-3 text-xs text-destructive">
                {visibleWarnings.map((warning) => (
                  <p key={warning} className="flex items-start gap-1.5">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {warning}
                  </p>
                ))}
              </div>
            ) : null}

            {/* Os DOIS insights. Um responde "o que me tira do dia", o outro
                "o que me tira da conta". Tudo o mais aqui é apoio. */}
            <div className="divide-y divide-border/60">
              <BufferInsight
                label="Se bater o stop, sobra hoje"
                limit={dailyLimitValue}
                remaining={dailyBufferAfterStop}
                consumedPercent={result.dailyLossImpactPercent}
                tradesLeft={result.tradesUntilDailyLimit}
                // A folga do dia parte do limite cheio: a calculadora não
                // desconta o que já foi perdido hoje. Dito na tela, porque
                // número de risco sem essa ressalva engana.
                note={hasTradeInput ? "sem perda realizada hoje" : undefined}
                ready={hasTradeInput}
              />
              <BufferInsight
                label="Até quebrar a conta"
                limit={drawdownLimitValue}
                remaining={drawdownBufferAfterStop}
                consumedPercent={result.totalDrawdownImpactPercent}
                tradesLeft={result.tradesUntilDrawdownLimit}
                ready={hasTradeInput}
              />
            </div>

            {/* Referência, não insight: o ganho no alvo fica deliberadamente sem
                peso visual. Em tela de risco o número que salta é o da perda; o
                do ganho potencial não pode competir com ele. */}
            <div className="space-y-3 border-t border-border/60 px-4 py-3.5">
              {hasTarget ? (
                <p className="text-[11px] text-muted-foreground">
                  Alvo <Money value={result.potentialProfit} className="text-[11px]" /> ·{" "}
                  <span className="numeral-ledger">{numberText(result.riskReward, 1)}R</span>
                </p>
              ) : null}
              <button type="button" onClick={copySummary} className="pill-btn w-full justify-center">
                <ClipboardCopy className="h-4 w-4" />
                Copiar resumo do trade
              </button>
            </div>
          </div>
        </aside>

        {/* Formulário — uma superfície contínua com divisores internos, como uma
            boleta, em vez de três cards idênticos disputando peso com o painel
            de decisão. */}
        <div className="lg:col-start-1 lg:row-start-1">
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            <div className="p-4">
              <h2 className="instrument-label text-[10px] text-muted-foreground">Conta e risco</h2>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <Field label="Conta">
                  <Select value={accountSource} onValueChange={setAccountSource}>
                    <SelectTrigger className={inputClass("w-full")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.nickname || "Conta Fortify"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Saldo/equity">
                  <Input className={inputClass()} type="number" value={equity} onChange={(event) => setEquity(event.target.value)} min="0" />
                </Field>
              </div>

              {/* Risco por operação ganha slider: é a alavanca que o trader de
                  fato mexe para ver lote e folga se moverem juntos. Preço
                  continua campo numérico — ali ele sabe o valor exato e
                  arrastar seria pior. */}
              <div className="mt-4">
                <Field label="Risco por operação">
                  <div className="grid grid-cols-[88px_1fr] gap-2">
                    <Segmented<"percent" | "amount">
                      value={riskMode}
                      onChange={setRiskMode}
                      options={[
                        { value: "percent", label: "%" },
                        { value: "amount", label: "$" },
                      ]}
                    />
                    <Input
                      className={inputClass()}
                      type="number"
                      value={riskMode === "percent" ? riskPercent : riskAmount}
                      onChange={(event) => (riskMode === "percent" ? setRiskPercent(event.target.value) : setRiskAmount(event.target.value))}
                    />
                  </div>
                </Field>
                {riskMode === "percent" ? (
                  <div className="mt-2">
                    {/* O polegar do Slider do shadcn tem 20px — metade do alvo
                        de toque mínimo. O ::after invisível de -inset-3 leva a
                        área de toque a 44px sem engordar o desenho, e o py-2
                        no wrapper dá margem para o polegar no celular. */}
                    <Slider
                      value={[riskPercentValue]}
                      min={0.1}
                      max={3}
                      step={0.05}
                      onValueChange={([next]) => setRiskPercent(String(next))}
                      aria-label="Risco por operação em percentual do saldo"
                      className="py-2 [&_[role=slider]]:relative [&_[role=slider]]:after:absolute [&_[role=slider]]:after:-inset-3 [&_[role=slider]]:after:content-['']"
                    />
                    <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                      <span>0,1%</span>
                      <span>3%</span>
                    </div>
                  </div>
                ) : null}
              </div>

              {ruleBinding ? (
                <div className="mt-4 border-l-2 border-info py-0.5 pl-3">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-info" aria-hidden="true" />
                    <p className="instrument-label text-[10px] text-info">Regras aplicadas automaticamente</p>
                  </div>
                  <p className="mt-1.5 text-sm font-semibold text-foreground">
                    {ruleBinding.rule_snapshot.propFirm.name} · {ruleBinding.rule_snapshot.accountSize.label}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-8 gap-y-2">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Perda diária máxima</p>
                      <Money value={dailyLimitValue} className="text-sm text-foreground" />
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Drawdown máximo</p>
                      <Money value={drawdownLimitValue} className="text-sm text-foreground" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {accountSource !== "manual" && (
                    <p className="text-[11px] text-muted-foreground">
                      Esta conta ainda não tem regras vinculadas — informe os limites manualmente.
                    </p>
                  )}
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Limite diário de perda (%)">
                      <Input className={inputClass()} type="number" value={dailyLossPercent} onChange={(event) => setDailyLossPercent(event.target.value)} />
                    </Field>
                    <Field label="Drawdown total máximo (%)">
                      <Input className={inputClass()} type="number" value={drawdownPercent} onChange={(event) => setDrawdownPercent(event.target.value)} />
                    </Field>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4">
              <h2 className="instrument-label text-[10px] text-muted-foreground">Trade</h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Field label="Ativo">
                  <Select value={symbol} onValueChange={setSymbol}>
                    <SelectTrigger className={inputClass("w-full")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectGroup key={cat}>
                          <SelectLabel>{cat}</SelectLabel>
                          {INSTRUMENT_PRESETS.filter((preset) => preset.category === cat).map((preset) => (
                            <SelectItem key={preset.displaySymbol} value={preset.displaySymbol}>
                              {preset.displaySymbol}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Direção">
                  <Segmented<TradeDirection>
                    value={direction}
                    onChange={setDirection}
                    options={[
                      { value: "buy", label: "Compra", icon: <TrendingUp className="h-3.5 w-3.5" />, activeClass: "bg-success/15 text-success shadow-sm" },
                      { value: "sell", label: "Venda", icon: <TrendingDown className="h-3.5 w-3.5" />, activeClass: "bg-destructive/15 text-destructive shadow-sm" },
                    ]}
                  />
                </Field>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <Field label="Entrada">
                  <Input className={inputClass()} type="number" value={entryPrice} onChange={(event) => setEntryPrice(event.target.value)} />
                </Field>
                <Field label="Stop Loss">
                  <Input className={inputClass()} type="number" value={stopLoss} onChange={(event) => setStopLoss(event.target.value)} />
                </Field>
                <Field label="Take Profit" helper="Opcional.">
                  <Input className={inputClass()} type="number" value={takeProfit} onChange={(event) => setTakeProfit(event.target.value)} />
                </Field>
              </div>
            </div>

            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
                <span>
                  <span className="instrument-label block text-[10px] text-muted-foreground">Ajustes avançados</span>
                  <span className="mt-1 block text-xs text-muted-foreground">Overrides manuais de stop, alvo, lote e valor por pip/ponto.</span>
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="grid gap-4 border-t border-border/60 p-4 md:grid-cols-2 xl:grid-cols-4">
                <Field label="Stop em pips/pontos" helper="Usado se entrada/stop não forem informados.">
                  <Input className={inputClass()} type="number" value={manualStopDistance} onChange={(event) => setManualStopDistance(event.target.value)} placeholder="Opcional" />
                </Field>
                <Field label="Alvo em pips/pontos" helper="Usado se entrada/TP não forem informados.">
                  <Input className={inputClass()} type="number" value={manualTargetDistance} onChange={(event) => setManualTargetDistance(event.target.value)} placeholder="Opcional" />
                </Field>
                <Field label="Lote manual override">
                  <Input className={inputClass()} type="number" value={manualLot} onChange={(event) => setManualLot(event.target.value)} placeholder="Opcional" />
                </Field>
                <Field label="Valor por pip/ponto" helper={selectedPreset.notes}>
                  <Input className={inputClass()} type="number" value={valueOverride} onChange={(event) => setValueOverride(event.target.value)} />
                </Field>
              </div>
            </details>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 border-t border-border/30 pt-4">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
        <p className="text-[11px] leading-relaxed text-muted-foreground/70">
          Ferramenta de planejamento; não garante precisão para todos os brokers. Confirme lote, valor por pip/ponto e margem no MT5 antes de operar.
        </p>
      </div>
    </div>
  );
};

export default RiskCalculator;
