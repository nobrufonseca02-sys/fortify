import { describe, expect, it } from 'vitest';
import { calculateRisk, INSTRUMENT_PRESETS } from '@/lib/riskCalculator';

describe('risk calculator crypto instruments', () => {
  it('makes BTC/USD and ETH/USD available as crypto presets', () => {
    const cryptoPresets = INSTRUMENT_PRESETS.filter((preset) => preset.category === 'Cripto');

    expect(cryptoPresets.map((preset) => preset.displaySymbol)).toEqual(['BTC/USD', 'ETH/USD']);
  });

  it('calculates a BTC/USD trade from its price distance and lot value', () => {
    const result = calculateRisk({
      equity: 10_000,
      riskPercent: 0.5,
      riskAmount: 50,
      entryPrice: 100_000,
      stopLoss: 99_500,
      takeProfit: 101_000,
      manualStopDistance: null,
      manualTargetDistance: null,
      manualLot: null,
      valuePerUnit: 1,
      unitSize: 1,
      minLot: 0.01,
      maxLot: 10,
      lotStep: 0.01,
      dailyLossLimitAmount: 500,
      totalDrawdownLimitAmount: 1_000,
    });

    expect(result.stopDistance).toBe(500);
    expect(result.recommendedLot).toBe(0.1);
    expect(result.lossAtStop).toBe(50);
    expect(result.valid).toBe(true);
  });
});
