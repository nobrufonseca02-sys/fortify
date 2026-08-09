import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ClipboardCopy, RotateCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "@/lib/riskCalculator";

const money = (value: number) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });

const pct = (value: number) => `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
const numberText = (value: number, digits = 2) => value.toLocaleString("pt-BR", { maximumFractionDigits: digits });

const categories: AssetCategory[] = ["Forex", "Metals", "Indices", "Commodities"];

function inputClass(extra = "") {
  return `h-10 bg-muted/50 text-sm ${extra}`;
}

function Field({ label, children, helper }: { label: string; children: React.ReactNode; helper?: string }) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
      {helper ? <span className="block text-[10px] leading-relaxed text-muted-foreground/75">{helper}</span> : null}
    </label>
  );
}

function ResultCard({ label, value, tone = "text-foreground" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/70 p-4">
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className={`mt-2 font-mono text-lg font-bold ${tone}`}>{value}</p>
    </div>
  );
}

function LimitRow({
  label,
  impactPercent,
  remaining,
  tradesLeft,
}: {
  label: string;
  impactPercent: number;
  remaining: number;
  tradesLeft: number | null;
}) {
  const clamped = Math.max(0, Math.min(100, impactPercent));
  const tone = impactPercent > 70 ? "bg-destructive" : impactPercent > 35 ? "bg-warning" : "bg-success";
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground">
          {pct(impactPercent)} consumido · restam {money(remaining)}
          {tradesLeft !== null ? ` · ~${tradesLeft} trade${tradesLeft === 1 ? "" : "s"} até o limite` : ""}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${clamped}%` }} />
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
  const statusTone =
    result.status === "Seguro" ? "text-success" : result.status === "Atenção" ? "text-warning" : "text-destructive";

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-wide text-primary font-medium">Command center</p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Calculadora de Risco</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={reset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Resetar
          </Button>
          <Button type="button" variant="outline" onClick={() => openChart(symbol)} className="gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-[#131722] shrink-0">
              <TradingViewMarkIcon className="h-3 w-3" />
            </span>
            TradingView
          </Button>
          <Button type="button" onClick={copySummary} className="gap-2">
            <ClipboardCopy className="h-4 w-4" />
            Copiar resumo do trade
          </Button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.85fr)]">
        <div className="space-y-5">
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-sm font-bold text-foreground">Conta e risco</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <Field label="Conta">
                <select value={accountSource} onChange={(event) => setAccountSource(event.target.value)} className={inputClass("w-full rounded-md border border-border px-3")}>
                  <option value="manual">Manual</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.nickname || "Conta Fortify"}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Saldo/equity">
                <Input className={inputClass()} type="number" value={equity} onChange={(event) => setEquity(event.target.value)} min="0" />
              </Field>
              <Field label="Risco por trade">
                <div className="grid grid-cols-[76px_1fr] gap-2">
                  <select value={riskMode} onChange={(event) => setRiskMode(event.target.value as "percent" | "amount")} className={inputClass("rounded-md border border-border px-3")}>
                    <option value="percent">%</option>
                    <option value="amount">$</option>
                  </select>
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
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-info/25 bg-info/5 p-3">
                <ShieldCheck className="h-4 w-4 text-info mt-0.5 shrink-0" />
                <p className="text-xs text-foreground/85 leading-relaxed">
                  Regras de <span className="font-medium">{ruleBinding.rule_snapshot.propFirm.name} · {ruleBinding.rule_snapshot.accountSize.label}</span> aplicadas automaticamente:
                  perda diária até <span className="font-mono">{money(dailyLimitValue)}</span>, drawdown até{" "}
                  <span className="font-mono">{money(drawdownLimitValue)}</span>.
                </p>
              </div>
            ) : (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {accountSource !== "manual" && (
                  <p className="md:col-span-2 text-[11px] text-muted-foreground">
                    Esta conta ainda não tem regras vinculadas — informe os limites manualmente.
                  </p>
                )}
                <Field label="Limite diário de perda (%)">
                  <Input className={inputClass()} type="number" value={dailyLossPercent} onChange={(event) => setDailyLossPercent(event.target.value)} />
                </Field>
                <Field label="Drawdown total máximo (%)">
                  <Input className={inputClass()} type="number" value={drawdownPercent} onChange={(event) => setDrawdownPercent(event.target.value)} />
                </Field>
              </div>
            )}
          </section>

          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-sm font-bold text-foreground">Trade</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Ativo">
                <select value={symbol} onChange={(event) => setSymbol(event.target.value)} className={inputClass("w-full rounded-md border border-border px-3")}>
                  {categories.map((cat) => (
                    <optgroup key={cat} label={cat}>
                      {INSTRUMENT_PRESETS.filter((preset) => preset.category === cat).map((preset) => (
                        <option key={preset.displaySymbol} value={preset.displaySymbol}>
                          {preset.displaySymbol}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </Field>
              <Field label="Direção">
                <select value={direction} onChange={(event) => setDirection(event.target.value as TradeDirection)} className={inputClass("w-full rounded-md border border-border px-3")}>
                  <option value="buy">Compra</option>
                  <option value="sell">Venda</option>
                </select>
              </Field>
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
          </section>

          <details className="group rounded-lg border border-border bg-card p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold text-foreground [&::-webkit-details-marker]:hidden">
              Ajustes avançados
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

        <aside className="space-y-5">
          <section className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-foreground">Resultado</h2>
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusTone}`}>Status: {result.status}</span>
            </div>
            {result.warnings.length ? (
              <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                {result.warnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            ) : null}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <ResultCard label="Lote recomendado" value={numberText(result.recommendedLot)} tone="text-primary" />
              <ResultCard label="Risco por trade" value={`${money(result.lossAtStop)} · ${pct(result.riskPercent)}`} tone="text-destructive" />
              <ResultCard label="Ganho no alvo" value={money(result.potentialProfit)} tone="text-success" />
              <ResultCard label="R:R" value={`${numberText(result.riskReward)}R`} />
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-sm font-bold text-foreground">Impacto nos limites da conta</h2>
            <div className="mt-4 space-y-4">
              <LimitRow label="Perda diária" impactPercent={result.dailyLossImpactPercent} remaining={dailyBufferAfterStop} tradesLeft={result.tradesUntilDailyLimit} />
              <LimitRow label="Drawdown total" impactPercent={result.totalDrawdownImpactPercent} remaining={drawdownBufferAfterStop} tradesLeft={result.tradesUntilDrawdownLimit} />
            </div>
            <div className={`mt-4 rounded-lg border p-3 text-xs ${result.status === "Seguro" ? "border-success/30 bg-success/10 text-success" : result.status === "Atenção" ? "border-warning/30 bg-warning/10 text-warning" : "border-destructive/30 bg-destructive/10 text-destructive"}`}>
              {result.status === "Seguro"
                ? "Risco dentro de uma faixa conservadora."
                : result.status === "Atenção"
                  ? "Opere com cautela. Este trade já pressiona seus limites de perda."
                  : "Risco elevado para conta prop. Considere reduzir lote ou aumentar qualidade do setup."}
            </div>
          </section>
        </aside>
      </div>

      <div className="flex items-start gap-2 px-1">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Ferramenta de planejamento; não garante precisão para todos os brokers. Confirme lote, valor por pip/ponto e margem no MT5 antes de operar.
        </p>
      </div>
    </div>
  );
};

export default RiskCalculator;
