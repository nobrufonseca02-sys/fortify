export type AssetCategory = "Forex" | "Metals" | "Indices" | "Commodities";
export type CalculationMode = "pip" | "point" | "price";
export type TradeDirection = "buy" | "sell";
export type TradeStatus = "Seguro" | "Atenção" | "Crítico";

export type InstrumentPreset = {
  displaySymbol: string;
  category: AssetCategory;
  calculationMode: CalculationMode;
  pipSize?: number;
  pointSize?: number;
  pipValuePerLot?: number;
  pointValuePerLot?: number;
  minLot: number;
  maxLot: number;
  lotStep: number;
  notes: string;
};

export type RiskCalculationInput = {
  equity: number;
  riskPercent: number;
  riskAmount: number;
  entryPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  manualStopDistance: number | null;
  manualTargetDistance: number | null;
  manualLot: number | null;
  valuePerUnit: number;
  unitSize: number;
  minLot: number;
  maxLot: number;
  lotStep: number;
  dailyLossLimitAmount: number;
  totalDrawdownLimitAmount: number;
};

export type RiskCalculationResult = {
  stopDistance: number;
  targetDistance: number;
  recommendedLot: number;
  effectiveLot: number;
  riskAmount: number;
  riskPercent: number;
  lossAtStop: number;
  potentialProfit: number;
  riskReward: number;
  dailyLossImpactPercent: number;
  totalDrawdownImpactPercent: number;
  tradesUntilDailyLimit: number | null;
  tradesUntilDrawdownLimit: number | null;
  status: TradeStatus;
  warnings: string[];
  valid: boolean;
};

export const INSTRUMENT_PRESETS: InstrumentPreset[] = [
  { displaySymbol: "EUR/USD", category: "Forex", calculationMode: "pip", pipSize: 0.0001, pipValuePerLot: 10, minLot: 0.01, maxLot: 100, lotStep: 0.01, notes: "Par forex principal. Valor aproximado por pip em lote padrão." },
  { displaySymbol: "GBP/USD", category: "Forex", calculationMode: "pip", pipSize: 0.0001, pipValuePerLot: 10, minLot: 0.01, maxLot: 100, lotStep: 0.01, notes: "Par forex principal. Confirme valor de pip no MT5." },
  { displaySymbol: "USD/JPY", category: "Forex", calculationMode: "pip", pipSize: 0.01, pipValuePerLot: 9.2, minLot: 0.01, maxLot: 100, lotStep: 0.01, notes: "Pip em pares JPY costuma usar 0.01; valor varia com câmbio." },
  { displaySymbol: "USD/CHF", category: "Forex", calculationMode: "pip", pipSize: 0.0001, pipValuePerLot: 11, minLot: 0.01, maxLot: 100, lotStep: 0.01, notes: "Valor de pip aproximado; ajuste conforme contrato." },
  { displaySymbol: "AUD/USD", category: "Forex", calculationMode: "pip", pipSize: 0.0001, pipValuePerLot: 10, minLot: 0.01, maxLot: 100, lotStep: 0.01, notes: "Par forex principal. Valor inicial conservador." },
  { displaySymbol: "USD/CAD", category: "Forex", calculationMode: "pip", pipSize: 0.0001, pipValuePerLot: 7.5, minLot: 0.01, maxLot: 100, lotStep: 0.01, notes: "Valor de pip aproximado; depende da cotação USD/CAD." },
  { displaySymbol: "NZD/USD", category: "Forex", calculationMode: "pip", pipSize: 0.0001, pipValuePerLot: 10, minLot: 0.01, maxLot: 100, lotStep: 0.01, notes: "Par forex principal. Confirme no servidor MT5." },
  { displaySymbol: "XAU/USD", category: "Metals", calculationMode: "point", pointSize: 0.1, pointValuePerLot: 10, minLot: 0.01, maxLot: 50, lotStep: 0.01, notes: "Ouro CFD varia muito entre corretoras; ajuste valor por ponto." },
  { displaySymbol: "XAG/USD", category: "Metals", calculationMode: "point", pointSize: 0.01, pointValuePerLot: 50, minLot: 0.01, maxLot: 50, lotStep: 0.01, notes: "Prata CFD. Use especificação do contrato para sizing final." },
  { displaySymbol: "US100", category: "Indices", calculationMode: "point", pointSize: 1, pointValuePerLot: 1, minLot: 0.01, maxLot: 100, lotStep: 0.01, notes: "CFD de índice. Valor por ponto depende do provedor." },
  { displaySymbol: "US500", category: "Indices", calculationMode: "point", pointSize: 1, pointValuePerLot: 1, minLot: 0.01, maxLot: 100, lotStep: 0.01, notes: "CFD de índice. Confirme multiplicador no MT5." },
  { displaySymbol: "US30", category: "Indices", calculationMode: "point", pointSize: 1, pointValuePerLot: 1, minLot: 0.01, maxLot: 100, lotStep: 0.01, notes: "CFD de índice. Ajuste para seu contrato." },
  { displaySymbol: "GER40", category: "Indices", calculationMode: "point", pointSize: 1, pointValuePerLot: 1, minLot: 0.01, maxLot: 100, lotStep: 0.01, notes: "DAX CFD. Valor por ponto pode variar." },
  { displaySymbol: "UK100", category: "Indices", calculationMode: "point", pointSize: 1, pointValuePerLot: 1, minLot: 0.01, maxLot: 100, lotStep: 0.01, notes: "FTSE CFD. Confirme no contrato." },
  { displaySymbol: "HK50", category: "Indices", calculationMode: "point", pointSize: 1, pointValuePerLot: 1, minLot: 0.01, maxLot: 100, lotStep: 0.01, notes: "Hang Seng CFD. Ajuste conforme servidor." },
  { displaySymbol: "JP225", category: "Indices", calculationMode: "point", pointSize: 1, pointValuePerLot: 1, minLot: 0.01, maxLot: 100, lotStep: 0.01, notes: "Nikkei CFD. Verifique especificação." },
  { displaySymbol: "WTI", category: "Commodities", calculationMode: "point", pointSize: 0.01, pointValuePerLot: 10, minLot: 0.01, maxLot: 50, lotStep: 0.01, notes: "Petróleo WTI CFD. Contrato varia por broker." },
  { displaySymbol: "BRENT", category: "Commodities", calculationMode: "point", pointSize: 0.01, pointValuePerLot: 10, minLot: 0.01, maxLot: 50, lotStep: 0.01, notes: "Brent CFD. Confirme valor por ponto." },
  { displaySymbol: "NATGAS", category: "Commodities", calculationMode: "point", pointSize: 0.001, pointValuePerLot: 10, minLot: 0.01, maxLot: 50, lotStep: 0.01, notes: "Gás Natural CFD. Alta variação de contrato." },
];

export const PROP_ACCOUNT_SIZES = [5000, 10000, 25000, 50000, 100000, 200000];

export function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function roundToStep(value: number, step: number) {
  if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) return value;
  const precision = Math.max(0, String(step).split(".")[1]?.length || 0);
  return Number((Math.floor(value / step) * step).toFixed(precision));
}

export function calculateDistanceFromPrices(entry: number | null, exit: number | null, unitSize: number) {
  if (!entry || !exit || !unitSize || unitSize <= 0) return null;
  return Math.abs(entry - exit) / unitSize;
}

export function calculateRisk(input: RiskCalculationInput): RiskCalculationResult {
  const warnings: string[] = [];
  const stopDistance = input.manualStopDistance && input.manualStopDistance > 0
    ? input.manualStopDistance
    : calculateDistanceFromPrices(input.entryPrice, input.stopLoss, input.unitSize) || 0;
  const targetDistance = input.manualTargetDistance && input.manualTargetDistance > 0
    ? input.manualTargetDistance
    : calculateDistanceFromPrices(input.entryPrice, input.takeProfit, input.unitSize) || 0;

  if (stopDistance <= 0) warnings.push("Informe entrada e stop ou a distância do stop.");
  if (input.valuePerUnit <= 0) warnings.push("Informe o valor por pip/ponto.");

  const lossPerLot = stopDistance * input.valuePerUnit;
  const rawLot = lossPerLot > 0 ? input.riskAmount / lossPerLot : 0;
  const recommendedLot = Math.min(input.maxLot, Math.max(0, roundToStep(rawLot, input.lotStep)));
  const effectiveLot = input.manualLot && input.manualLot > 0 ? roundToStep(input.manualLot, input.lotStep) : recommendedLot;
  const lossAtStop = effectiveLot * lossPerLot;
  const potentialProfit = effectiveLot * targetDistance * input.valuePerUnit;
  const riskReward = lossAtStop > 0 ? potentialProfit / lossAtStop : 0;
  const riskPercent = input.equity > 0 ? (lossAtStop / input.equity) * 100 : input.riskPercent;
  const dailyLossImpactPercent = input.dailyLossLimitAmount > 0 ? (lossAtStop / input.dailyLossLimitAmount) * 100 : 0;
  const totalDrawdownImpactPercent = input.totalDrawdownLimitAmount > 0 ? (lossAtStop / input.totalDrawdownLimitAmount) * 100 : 0;
  const tradesUntilDailyLimit = lossAtStop > 0 && input.dailyLossLimitAmount > 0 ? Math.floor(input.dailyLossLimitAmount / lossAtStop) : null;
  const tradesUntilDrawdownLimit = lossAtStop > 0 && input.totalDrawdownLimitAmount > 0 ? Math.floor(input.totalDrawdownLimitAmount / lossAtStop) : null;

  if (rawLot > input.maxLot) warnings.push("O lote calculado fica acima do máximo configurado para o ativo.");
  if (rawLot > 0 && rawLot < input.minLot) warnings.push("O lote calculado fica abaixo do mínimo configurado para o ativo.");
  if (effectiveLot <= 0) warnings.push("Lote inválido para os parâmetros informados.");

  let status: TradeStatus = "Seguro";
  if (riskPercent > 2 || dailyLossImpactPercent > 70 || warnings.length > 0) status = "Crítico";
  else if (riskPercent > 1 || dailyLossImpactPercent > 35) status = "Atenção";

  return {
    stopDistance,
    targetDistance,
    recommendedLot,
    effectiveLot,
    riskAmount: input.riskAmount,
    riskPercent,
    lossAtStop,
    potentialProfit,
    riskReward,
    dailyLossImpactPercent,
    totalDrawdownImpactPercent,
    tradesUntilDailyLimit,
    tradesUntilDrawdownLimit,
    status,
    warnings,
    valid: warnings.length === 0,
  };
}
