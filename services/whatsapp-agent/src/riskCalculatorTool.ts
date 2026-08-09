import { calculateRisk, INSTRUMENT_PRESETS, toNumber, type RiskCalculationResult } from './riskCalculatorAdapted';

export interface CalculateRiskToolInput {
  instrumentSymbol: string;
  equity: number;
  riskPercent?: number;
  riskAmount?: number;
  entryPrice?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
  manualStopDistance?: number | null;
  manualTargetDistance?: number | null;
  dailyLossLimitAmount?: number | null;
  totalDrawdownLimitAmount?: number | null;
}

export function runCalculateRiskTool(input: CalculateRiskToolInput): RiskCalculationResult {
  const preset =
    INSTRUMENT_PRESETS.find((p) => p.displaySymbol.toLowerCase() === String(input.instrumentSymbol || '').toLowerCase())
    ?? INSTRUMENT_PRESETS[0];

  const unitSize = preset.pipSize || preset.pointSize || 1;
  const valuePerUnit = preset.pipValuePerLot || preset.pointValuePerLot || 0;
  const equity = toNumber(input.equity) || 0;
  const riskAmount = input.riskAmount ?? (equity * ((input.riskPercent ?? 1) / 100));

  return calculateRisk({
    equity,
    riskPercent: equity > 0 ? (riskAmount / equity) * 100 : input.riskPercent ?? 0,
    riskAmount,
    entryPrice: input.entryPrice ?? null,
    stopLoss: input.stopLoss ?? null,
    takeProfit: input.takeProfit ?? null,
    manualStopDistance: input.manualStopDistance ?? null,
    manualTargetDistance: input.manualTargetDistance ?? null,
    manualLot: null,
    valuePerUnit,
    unitSize,
    minLot: preset.minLot,
    maxLot: preset.maxLot,
    lotStep: preset.lotStep,
    dailyLossLimitAmount: input.dailyLossLimitAmount ?? 0,
    totalDrawdownLimitAmount: input.totalDrawdownLimitAmount ?? 0,
  });
}
