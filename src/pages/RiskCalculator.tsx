import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BarChart3, Calculator, ClipboardCopy, RotateCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useAccountsStore } from "@/hooks/useAccountsStore";
import { useTradingView } from "@/components/tradingview/TradingViewProvider";
import {
  INSTRUMENT_PRESETS,
  PROP_ACCOUNT_SIZES,
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
      <p className={`mt-2 font-mono text-lg font-black ${tone}`}>{value}</p>
    </div>
  );
}

const RiskCalculator = () => {
  const { accounts } = useAccountsStore();
  const { openChart } = useTradingView();
  const [accountSource, setAccountSource] = useState("manual");
  const [equity, setEquity] = useState("10000");
  const [currency, setCurrency] = useState("USD");
  const [propSize, setPropSize] = useState("10000");
  const [dailyLossPercent, setDailyLossPercent] = useState("5");
  const [dailyLossAmount, setDailyLossAmount] = useState("500");
  const [drawdownPercent, setDrawdownPercent] = useState("10");
  const [drawdownAmount, setDrawdownAmount] = useState("1000");
  const [profitTargetPercent, setProfitTargetPercent] = useState("8");
  const [profitTargetAmount, setProfitTargetAmount] = useState("800");
  const [riskMode, setRiskMode] = useState<"percent" | "amount">("percent");
  const [riskPercent, setRiskPercent] = useState("0.5");
  const [riskAmount, setRiskAmount] = useState("50");
  const [category, setCategory] = useState<AssetCategory>("Forex");
  const [symbol, setSymbol] = useState("EUR/USD");
  const [direction, setDirection] = useState<TradeDirection>("buy");
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [manualStopDistance, setManualStopDistance] = useState("20");
  const [manualTargetDistance, setManualTargetDistance] = useState("40");
  const [desiredRR, setDesiredRR] = useState("2");
  const [manualLot, setManualLot] = useState("");
  const [valueOverride, setValueOverride] = useState("10");

  const selectedPreset = useMemo<InstrumentPreset>(
    () => INSTRUMENT_PRESETS.find((preset) => preset.displaySymbol === symbol) || INSTRUMENT_PRESETS[0],
    [symbol],
  );
  const filteredPresets = useMemo(() => INSTRUMENT_PRESETS.filter((preset) => preset.category === category), [category]);
  const equityValue = toNumber(equity) || 0;
  const dailyLimitValue = toNumber(dailyLossAmount) || 0;
  const drawdownLimitValue = toNumber(drawdownAmount) || 0;
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
    const preset = INSTRUMENT_PRESETS.find((item) => item.category === category);
    if (preset && !INSTRUMENT_PRESETS.some((item) => item.category === category && item.displaySymbol === symbol)) {
      setSymbol(preset.displaySymbol);
    }
  }, [category, symbol]);

  useEffect(() => {
    setValueOverride(String(selectedPreset.pipValuePerLot || selectedPreset.pointValuePerLot || 1));
  }, [selectedPreset]);

  useEffect(() => {
    const selectedAccount = accounts.find((account) => account.id === accountSource);
    if (!selectedAccount) return;
    const nextEquity = Number(selectedAccount.currentEquity || selectedAccount.startBalance || 0);
    if (Number.isFinite(nextEquity) && nextEquity > 0) setEquity(String(Math.round(nextEquity * 100) / 100));
  }, [accountSource, accounts]);

  useEffect(() => {
    const base = toNumber(propSize) || equityValue;
    if (!base) return;
    setDailyLossAmount(String(Math.round(base * ((toNumber(dailyLossPercent) || 0) / 100) * 100) / 100));
  }, [dailyLossPercent, propSize, equityValue]);

  useEffect(() => {
    const base = toNumber(propSize) || equityValue;
    if (!base) return;
    setDrawdownAmount(String(Math.round(base * ((toNumber(drawdownPercent) || 0) / 100) * 100) / 100));
  }, [drawdownPercent, propSize, equityValue]);

  useEffect(() => {
    const base = toNumber(propSize) || equityValue;
    if (!base) return;
    setProfitTargetAmount(String(Math.round(base * ((toNumber(profitTargetPercent) || 0) / 100) * 100) / 100));
  }, [profitTargetPercent, propSize, equityValue]);

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
    setCurrency("USD");
    setPropSize("10000");
    setDailyLossPercent("5");
    setDrawdownPercent("10");
    setProfitTargetPercent("8");
    setRiskMode("percent");
    setRiskPercent("0.5");
    setCategory("Forex");
    setSymbol("EUR/USD");
    setDirection("buy");
    setEntryPrice("");
    setStopLoss("");
    setTakeProfit("");
    setManualStopDistance("20");
    setManualTargetDistance("40");
    setDesiredRR("2");
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

  const scenarioRows = [0.25, 0.5, 1].map((risk) => {
    const scenario = calculateRisk({
      equity: equityValue,
      riskPercent: risk,
      riskAmount: equityValue * (risk / 100),
      entryPrice: toNumber(entryPrice),
      stopLoss: toNumber(stopLoss),
      takeProfit: toNumber(takeProfit),
      manualStopDistance: toNumber(manualStopDistance),
      manualTargetDistance: result.targetDistance || (toNumber(manualStopDistance) || 0) * (toNumber(desiredRR) || 2),
      manualLot: null,
      valuePerUnit,
      unitSize,
      minLot: selectedPreset.minLot,
      maxLot: selectedPreset.maxLot,
      lotStep: selectedPreset.lotStep,
      dailyLossLimitAmount: dailyLimitValue,
      totalDrawdownLimitAmount: drawdownLimitValue,
    });
    return {
      label: risk === 0.25 ? "Conservador" : risk === 0.5 ? "Padrão" : "Agressivo",
      risk,
      scenario,
    };
  });

  const dailyBufferAfterStop = dailyLimitValue - result.lossAtStop;
  const statusTone =
    result.status === "Seguro" ? "text-success" : result.status === "Atenção" ? "text-warning" : "text-destructive";

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-[10px] font-mono uppercase tracking-[0.18em] text-primary">Command center</p>
          <h1 className="text-2xl font-black tracking-tight text-foreground md:text-3xl">Calculadora de Risco</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Mapeie lote, risco, stop, alvo e impacto na conta antes de abrir uma operação.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={reset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Resetar
          </Button>
          <Button type="button" variant="outline" onClick={() => openChart(symbol)} className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Abrir gráfico no TradingView
          </Button>
          <Button type="button" onClick={copySummary} className="gap-2">
            <ClipboardCopy className="h-4 w-4" />
            Copiar resumo do trade
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 text-xs text-warning">
        Os valores de pip/point podem variar por corretora/servidor MT5. Confirme as especificações do contrato antes de operar.
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <div className="space-y-5">
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-sm font-bold text-foreground">Conta e limites</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Conta / tipo de conta">
                <select value={accountSource} onChange={(event) => setAccountSource(event.target.value)} className={inputClass("w-full rounded-md border border-border px-3")}>
                  <option value="manual">Manual</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.nickname || "Conta Fortify"}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Saldo/equity da conta">
                <Input className={inputClass()} type="number" value={equity} onChange={(event) => setEquity(event.target.value)} min="0" />
              </Field>
              <Field label="Moeda da conta">
                <select value={currency} onChange={(event) => setCurrency(event.target.value)} className={inputClass("w-full rounded-md border border-border px-3")}>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="BRL">BRL</option>
                </select>
              </Field>
              <Field label="Tamanho da conta prop">
                <select value={propSize} onChange={(event) => setPropSize(event.target.value)} className={inputClass("w-full rounded-md border border-border px-3")}>
                  {PROP_ACCOUNT_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {money(size)}
                    </option>
                  ))}
                  <option value={equity}>Custom</option>
                </select>
              </Field>
              <Field label="Limite diário de perda">
                <div className="grid grid-cols-2 gap-2">
                  <Input className={inputClass()} type="number" value={dailyLossPercent} onChange={(event) => setDailyLossPercent(event.target.value)} />
                  <Input className={inputClass()} type="number" value={dailyLossAmount} onChange={(event) => setDailyLossAmount(event.target.value)} />
                </div>
              </Field>
              <Field label="Drawdown total máximo">
                <div className="grid grid-cols-2 gap-2">
                  <Input className={inputClass()} type="number" value={drawdownPercent} onChange={(event) => setDrawdownPercent(event.target.value)} />
                  <Input className={inputClass()} type="number" value={drawdownAmount} onChange={(event) => setDrawdownAmount(event.target.value)} />
                </div>
              </Field>
              <Field label="Meta de lucro">
                <div className="grid grid-cols-2 gap-2">
                  <Input className={inputClass()} type="number" value={profitTargetPercent} onChange={(event) => setProfitTargetPercent(event.target.value)} />
                  <Input className={inputClass()} type="number" value={profitTargetAmount} onChange={(event) => setProfitTargetAmount(event.target.value)} />
                </div>
              </Field>
              <Field label="Risco por trade">
                <div className="grid grid-cols-[92px_1fr] gap-2">
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
          </section>

          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-sm font-bold text-foreground">Ativo e operação</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Categoria">
                <select value={category} onChange={(event) => setCategory(event.target.value as AssetCategory)} className={inputClass("w-full rounded-md border border-border px-3")}>
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Ativo">
                <select value={symbol} onChange={(event) => setSymbol(event.target.value)} className={inputClass("w-full rounded-md border border-border px-3")}>
                  {filteredPresets.map((preset) => (
                    <option key={preset.displaySymbol} value={preset.displaySymbol}>
                      {preset.displaySymbol}
                    </option>
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
              <Field label="Stop em pips/pontos">
                <Input className={inputClass()} type="number" value={manualStopDistance} onChange={(event) => setManualStopDistance(event.target.value)} />
              </Field>
              <Field label="Alvo em pips/pontos">
                <Input className={inputClass()} type="number" value={manualTargetDistance} onChange={(event) => setManualTargetDistance(event.target.value)} />
              </Field>
              <Field label="Risco/retorno desejado">
                <Input className={inputClass()} type="number" value={desiredRR} onChange={(event) => setDesiredRR(event.target.value)} />
              </Field>
              <Field label="Lote manual override">
                <Input className={inputClass()} type="number" value={manualLot} onChange={(event) => setManualLot(event.target.value)} placeholder="Opcional" />
              </Field>
              <Field label="Valor por pip/ponto" helper={selectedPreset.notes}>
                <Input className={inputClass()} type="number" value={valueOverride} onChange={(event) => setValueOverride(event.target.value)} />
              </Field>
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-foreground">Resultado principal</h2>
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusTone}`}>Status: {result.status}</span>
            </div>
            {result.warnings.length ? (
              <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                {result.warnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            ) : null}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <ResultCard label="Lote recomendado" value={numberText(result.recommendedLot)} tone="text-primary" />
              <ResultCard label="Risco financeiro" value={money(result.lossAtStop)} />
              <ResultCard label="Risco percentual" value={pct(result.riskPercent)} />
              <ResultCard label="Perda no stop" value={money(result.lossAtStop)} tone="text-destructive" />
              <ResultCard label="Ganho no alvo" value={money(result.potentialProfit)} tone="text-success" />
              <ResultCard label="R:R" value={`${numberText(result.riskReward)}R`} />
              <ResultCard label="Stop" value={numberText(result.stopDistance)} />
              <ResultCard label="Alvo" value={numberText(result.targetDistance)} />
              <ResultCard label="Impacto diário" value={pct(result.dailyLossImpactPercent)} />
              <ResultCard label="Impacto drawdown" value={pct(result.totalDrawdownImpactPercent)} />
              <ResultCard label="Trades até limite diário" value={result.tradesUntilDailyLimit === null ? "Sem dados" : String(result.tradesUntilDailyLimit)} />
              <ResultCard label="Trades até drawdown" value={result.tradesUntilDrawdownLimit === null ? "Sem dados" : String(result.tradesUntilDrawdownLimit)} />
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-sm font-bold text-foreground">Proteção de conta prop firm</h2>
            <div className="mt-4 space-y-3 text-sm">
              <p>Limite diário informado: <span className="font-mono text-foreground">{money(dailyLimitValue)}</span></p>
              <p>Drawdown total informado: <span className="font-mono text-foreground">{money(drawdownLimitValue)}</span></p>
              <p>Este trade consome <span className={statusTone}>{pct(result.dailyLossImpactPercent)}</span> do limite diário.</p>
              <p>Após o stop, restariam <span className={dailyBufferAfterStop < 0 ? "text-destructive" : "text-success"}>{money(dailyBufferAfterStop)}</span> de limite diário.</p>
              <div className={`rounded-lg border p-3 text-xs ${result.status === "Seguro" ? "border-success/30 bg-success/10 text-success" : result.status === "Atenção" ? "border-warning/30 bg-warning/10 text-warning" : "border-destructive/30 bg-destructive/10 text-destructive"}`}>
                {result.status === "Seguro"
                  ? "Risco dentro de uma faixa conservadora."
                  : result.status === "Atenção"
                    ? "Opere com cautela. Este trade já pressiona seus limites de perda."
                    : "Risco elevado para conta prop. Considere reduzir lote ou aumentar qualidade do setup."}
              </div>
            </div>
          </section>
        </aside>
      </div>

      <section className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Cenários sugeridos</h2>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-3">Perfil</th>
                <th>Risco</th>
                <th>Valor em risco</th>
                <th>Lote sugerido</th>
                <th>Stop</th>
                <th>Alvo</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {scenarioRows.map(({ label, risk, scenario }) => (
                <tr key={label} className="border-b border-border/60">
                  <td className="py-3 font-semibold text-foreground">{label}</td>
                  <td>{pct(risk)}</td>
                  <td>{money(scenario.lossAtStop)}</td>
                  <td className="font-mono">{numberText(scenario.recommendedLot)}</td>
                  <td>{numberText(scenario.stopDistance)}</td>
                  <td>{numberText(scenario.targetDistance)}</td>
                  <td>{scenario.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          {result.status === "Seguro" ? <ShieldCheck className="mt-0.5 h-5 w-5 text-success" /> : <AlertTriangle className="mt-0.5 h-5 w-5 text-warning" />}
          <div>
            <h2 className="text-sm font-bold text-foreground">Aviso educacional</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Esta calculadora ajuda no planejamento de risco, mas não garante precisão para todos os brokers. Confirme lote, valor por pip/ponto, margem e especificações do contrato diretamente no MT5 antes de operar.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default RiskCalculator;
