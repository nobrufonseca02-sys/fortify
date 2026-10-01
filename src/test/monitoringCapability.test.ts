import { describe, expect, it } from 'vitest';
import { classifyAccountMonitoring, supportsMt5Monitoring } from '@/lib/monitoringCapability';

const account = (overrides: Record<string, unknown> = {}) => ({
  platforms: ['MT5'],
  drawdownType: 'Static',
  monitorability: {
    automatic_mt5: ['Perda diária', 'Perda máxima', 'Meta de lucro', 'Tempo mínimo por trade'],
    manual_check: ['Regra de notícias'],
    not_supported_yet: ['Copy trading'],
  },
  ...overrides,
});

const levelOf = (items: ReturnType<typeof classifyAccountMonitoring>, label: string) =>
  items.find((item) => item.label === label)?.level;

describe('monitoringCapability', () => {
  it('só MT5 fora de futuros é monitorável', () => {
    expect(supportsMt5Monitoring({ market: 'CFD/Forex', platforms: ['MT5'] })).toBe(true);
    expect(supportsMt5Monitoring({ market: 'Futures', platforms: ['MT5'] })).toBe(false);
    expect(supportsMt5Monitoring({ market: 'CFD/Forex', platforms: ['cTrader'] })).toBe(false);
    expect(supportsMt5Monitoring({ market: 'CFD/Forex', platforms: ['MT5 Hedge'] })).toBe(true);
  });

  it('cruza o dataset com o que o motor realmente calcula', () => {
    const items = classifyAccountMonitoring({ market: 'CFD/Forex' }, account());
    expect(levelOf(items, 'Perda diária')).toBe('partial');
    expect(levelOf(items, 'Perda máxima')).toBe('automatic');
    expect(levelOf(items, 'Meta de lucro')).toBe('automatic');
    // Marcado "automático" no dataset, mas sem cálculo no motor.
    expect(levelOf(items, 'Tempo mínimo por trade')).toBe('unavailable');
    expect(levelOf(items, 'Regra de notícias')).toBe('manual');
    expect(levelOf(items, 'Copy trading')).toBe('unavailable');
  });

  it('drawdown trailing é parcial (pico só nos syncs)', () => {
    const items = classifyAccountMonitoring({ market: 'CFD/Forex' }, account({ drawdownType: 'Trailing' }));
    expect(levelOf(items, 'Perda máxima')).toBe('partial');
  });

  it('futuros: nada é automático', () => {
    const items = classifyAccountMonitoring({ market: 'Futures' }, account({ platforms: ['Rithmic'] }));
    expect(items.some((item) => item.level === 'automatic' || item.level === 'partial')).toBe(false);
  });
});
