import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ClipboardCopy,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

// Splits a formatted currency string into {symbol, digits} so the symbol can be
// rendered lighter/smaller than the value — the "currency mark set lighter than
// the number" convention used by Stripe/Mercury-style financial dashboards,
// instead of a flat string where "US$" carries the same visual weight as "10.000,00".
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

function Money({ value, className }: { value: number; className?: string }) {
  const { symbol, rest } = moneyParts(value);
  return (
    <span className={cn("font-mono tabular-nums", className)}>
      <span className="mr-0.5 align-[0.1em] text-[0.65em] font-normal text-muted-foreground">{symbol}</span>
      {rest}
    </span>
  );
}

const categories: AssetCategory[] = ["Forex", "Metals", "Indices", "Commodities"];

// Status → visual language. Each status also carries an accentClass, used as a
// persistent left-rail on the Decision panel (not just a small icon/label tint) —
// so the trade's risk state reads structurally, not as a decorative touch.
const statusMeta: Record<
  TradeStatus,
  { label: string; Icon: typeof ShieldCheck; textClass: string; softClass: string; accentClass: string }
> = {
  Seguro: {
    label: "Seguro",
    Icon: ShieldCheck,
    textClass: "text-success",
    softClass: "border-success/20 bg-success/5",
    accentClass: "border-l-success",
  },
  Atenção: {
    label: "Atenção",
    Icon: ShieldAlert,
    textClass: "text-warning",
    softClass: "border-warning/20 bg-warning/5",
    accentClass: "border-l-warning",
  },
  Crítico: {
    label: "Crítico",
    Icon: ShieldX,
    textClass: "text-destructive",
    softClass: "border-destructive/20 bg-destructive/5",
    accentClass: "border-l-destructive",
  },
};

function inputClass(extra = "") {
  return `h-10 bg-muted/50 text-sm ${extra}`;
}

// Field label uses the same mono/uppercase/tracked convention as section headers
// and stat labels throughout this page — one consistent "instrument label"
// typographic voice instead of default sans-serif form labels.
function Field({ label, children, helper }: { label: string; children: React.ReactNode; helper?: string }) {
  return (
    <label className="space-y-1.5">
      <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
      {helper ? <span className="block text-[10px] leading-relaxed text-muted-foreground/75">{helper}</span> : null}
    </label>
  );
}

// Lightweight segmented control — used for Direção (buy/sell) and the %/$ risk-mode
// switch. Plain buttons rather than the shared ToggleGroup primitive so the buy/sell
// success/destructive tone can be applied per-option without fighting the primitive's
// default data-state styling.
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
    <div role="group" className={cn("flex h-10 items-center gap-1 rounded-md border border-border bg-muted/40 p-1", className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex h-8 flex-1 items-center justify-center gap-1.5 rounded-sm text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
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

// Plain ledger-style stat readout — no per-tile card/border/background. Three of
// these sit inside one shared bordered strip (see the Risco/Ganho/R:R row below),
// so the "box" is drawn once around the group instead of once per fact.
function StatTile({
  label,
  value,
  sub,
  tone = "text-foreground",
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone?: string;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 font-mono text-lg font-bold tabular-nums ${tone}`}>{value}</p>
      {sub ? <p className="mt-0.5 text-[10px] text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

function LimitGauge({
  label,
  limit,
  remaining,
  impactPercent,
  tradesLeft,
}: {
  label: string;
  limit: number;
  remaining: number;
  impactPercent: number;
  tradesLeft: number | null;
}) {
  const clamped = Math.max(0, Math.min(100, impactPercent));
  const critical = impactPercent > 70;
  const warn = !critical && impactPercent > 35;
  const emphasize = critical || warn;
  const tone = critical ? "destructive" : warn ? "warning" : "success";
  const barClass = { destructive: "bg-destructive", warning: "bg-warning", success: "bg-success" }[tone];
  const textClass = { destructive: "text-destructive", warning: "text-warning", success: "text-success" }[tone];

  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-baseline justify-between gap-2">
        {/* Exception-first: an on-track limit recedes into muted text; only a
            limit actually worth acting on takes the full status color/weight. */}
        <span className={cn("text-xs font-semibold", emphasize ? "text-foreground" : "text-muted-foreground")}>{label}</span>
        <span className={cn("font-mono text-xs font-bold tabular-nums", emphasize ? textClass : "text-muted-foreground")}>
          {pct(clamped)}
        </span>
      </div>
      <div
        className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${pct(clamped)} consumido`}
      >
        <div className={cn("h-full rounded-full transition-all", barClass)} style={{ width: `${clamped}%` }} />
      </div>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
        <span>
          Restam <Money value={remaining} className="text-foreground" /> de <Money value={limit} />
        </span>
        {tradesLeft !== null ? <span>~{tradesLeft} trade{tradesLeft === 1 ? "" : "s"} até o limite</span> : null}
      </div>
    </div>
  );
}

const RiskCalculator = () => {
  const { user } = useAuth();
  const { accounts } = useAccountsStore();
  const { openChart } = useTradingView();
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

  const drawdownBufferAfterStop = drawdownLimitValue - result.lossAtStop;
  const dailyBufferAfterStop = dailyLimitValue - result.lossAtStop;
  const resultMeta = statusMeta[result.status];
  const StatusIcon = resultMeta.Icon;
  const hasManualLot = (toNumber(manualLot) || 0) > 0;
  const advisoryText =
    result.status === "Seguro"
      ? "Risco dentro de uma faixa conservadora."
      : result.status === "Atenção"
        ? "Opere com cautela. Este trade já pressiona seus limites de perda."
        : "Risco elevado para conta prop. Considere reduzir lote ou aumentar qualidade do setup.";

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-primary font-medium">Command center</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground md:text-3xl">Calculadora de Risco</h1>
          <p className="mt-1.5 max-w-md text-xs text-muted-foreground">
            Monte o trade e veja o lote recomendado e o impacto nos limites da conta antes de operar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={reset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Resetar
          </Button>
          <Button type="button" variant="outline" onClick={() => openChart(symbol)} className="gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded bg-[#131722] shrink-0">
              <TradingViewMarkIcon className="h-4 w-4" />
            </span>
            TradingView
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
        {/* Decision panel — first in DOM so mobile sees it right away; pinned to the
            right column and sticky on desktop so it stays visible while inputs are
            adjusted. The left accent rail carries the risk status structurally
            (visible even while scrolled past the header), not just via a small
            icon/label tint. */}
        <aside className="lg:sticky lg:top-6 lg:col-start-2 lg:row-start-1">
          <div className={cn("overflow-hidden rounded-lg border border-l-4 border-border bg-card shadow-lg shadow-background/50", resultMeta.accentClass)}>
            <div className="flex items-start justify-between gap-3 border-b border-border/60 p-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Decisão do trade</p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <StatusIcon className={`h-4 w-4 ${resultMeta.textClass}`} />
                  <span className={`text-base font-bold ${resultMeta.textClass}`}>{resultMeta.label}</span>
                </div>
                <p className="mt-1 max-w-[200px] text-[11px] leading-relaxed text-muted-foreground">{advisoryText}</p>
              </div>
              <span className="text-right font-mono text-xs font-semibold text-muted-foreground">
                {symbol}
                <br />
                {direction === "buy" ? "Compra" : "Venda"}
              </span>
            </div>

            <div className="space-y-4 p-4">
              {result.warnings.length ? (
                <div className="space-y-1 border-l-2 border-destructive py-0.5 pl-3 text-xs text-destructive">
                  {result.warnings.map((warning) => (
                    <p key={warning} className="flex items-start gap-1.5">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {warning}
                    </p>
                  ))}
                </div>
              ) : null}

              <div className={cn("rounded-md border p-4", resultMeta.softClass)}>
                <p className={cn("font-mono text-[10px] uppercase tracking-widest font-medium", resultMeta.textClass)}>Lote recomendado</p>
                <p className="mt-1 font-mono text-4xl font-bold tabular-nums text-foreground">{numberText(result.recommendedLot)}</p>
                {hasManualLot ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Lote manual aplicado: <span className="font-mono tabular-nums text-foreground">{numberText(result.effectiveLot)}</span>
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-3 divide-x divide-border rounded-md border border-border">
                <div className="p-3">
                  <StatTile label="Risco" value={<Money value={result.lossAtStop} />} sub={pct(result.riskPercent)} tone="text-destructive" />
                </div>
                <div className="p-3">
                  <StatTile label="Ganho no alvo" value={<Money value={result.potentialProfit} />} tone="text-success" />
                </div>
                <div className="p-3">
                  <StatTile label="R:R" value={`${numberText(result.riskReward)}R`} />
                </div>
              </div>

              <div>
                <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Impacto nos limites da conta</p>
                <div className="mt-1 divide-y divide-border/60 rounded-md border border-border/60 px-3">
                  <LimitGauge
                    label="Perda diária"
                    limit={dailyLimitValue}
                    remaining={dailyBufferAfterStop}
                    impactPercent={result.dailyLossImpactPercent}
                    tradesLeft={result.tradesUntilDailyLimit}
                  />
                  <LimitGauge
                    label="Drawdown total"
                    limit={drawdownLimitValue}
                    remaining={drawdownBufferAfterStop}
                    impactPercent={result.totalDrawdownImpactPercent}
                    tradesLeft={result.tradesUntilDrawdownLimit}
                  />
                </div>
              </div>

              <Button type="button" onClick={copySummary} className="w-full gap-2">
                <ClipboardCopy className="h-4 w-4" />
                Copiar resumo do trade
              </Button>
            </div>
          </div>
        </aside>

        {/* Input form — one continuous surface with internal dividers, like an
            order ticket, instead of three separately-carded, identically-styled
            blocks competing with the Decision panel for visual weight. */}
        <div className="lg:col-start-1 lg:row-start-1">
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            <div className="p-4">
              <h2 className="font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Conta e risco</h2>
              <div className="mt-3 grid gap-4 md:grid-cols-3">
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
                <Field label="Risco por trade">
                  <div className="grid grid-cols-[84px_1fr] gap-2">
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
              </div>

              {ruleBinding ? (
                <div className="mt-4 border-l-2 border-info py-0.5 pl-3">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-info" />
                    <p className="font-mono text-[10px] uppercase tracking-widest text-info font-medium">Regras aplicadas automaticamente</p>
                  </div>
                  <p className="mt-1.5 text-sm font-semibold text-foreground">
                    {ruleBinding.rule_snapshot.propFirm.name} · {ruleBinding.rule_snapshot.accountSize.label}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-8 gap-y-2">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Perda diária máxima</p>
                      <Money value={dailyLimitValue} className="text-sm font-bold text-foreground" />
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Drawdown máximo</p>
                      <Money value={drawdownLimitValue} className="text-sm font-bold text-foreground" />
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
              <h2 className="font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Trade</h2>
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
                <Field label="Take Profit">
                  <Input className={inputClass()} type="number" value={takeProfit} onChange={(event) => setTakeProfit(event.target.value)} />
                </Field>
              </div>
            </div>

            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
                <span>
                  <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Ajustes avançados</span>
                  <span className="mt-1 block text-xs text-muted-foreground">Overrides manuais de stop, alvo, lote e valor por pip/ponto.</span>
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
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
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <p className="text-[11px] leading-relaxed text-muted-foreground/70">
          Ferramenta de planejamento; não garante precisão para todos os brokers. Confirme lote, valor por pip/ponto e margem no MT5 antes de operar.
        </p>
      </div>
    </div>
  );
};

export default RiskCalculator;
