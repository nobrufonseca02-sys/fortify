import { describe, expect, it } from 'vitest';
import { evaluateBoundAccountRules } from '../lib/ruleEngine/evaluateAccountRules';
import type { RuleBindingSnapshot } from '../lib/ruleBinding';
import {
  RULE_ENGINE_TEST_NOW as now,
  createRuleBinding as binding,
  createRuleSnapshot as snapshot,
} from './fixtures/ruleEngineFixtures';

function evaluate(dailyPnl: number, currentBalance = 100_000, currentEquity = 100_000) {
  return evaluateBoundAccountRules({
    binding: binding(),
    account: {
      startBalance: 100_000,
      currentBalance,
      currentEquity,
      phase: 'Fase 1',
    },
    snapshots: [
      {
        balance: currentBalance,
        equity: currentEquity,
        dailyPnl,
        date: '2026-07-18',
        createdAt: '2026-07-18T14:00:00.000Z',
      },
    ],
    now,
  });
}

describe('versioned MT5 rule engine', () => {
  it('returns pending_binding when the account has no active binding', () => {
    const result = evaluateBoundAccountRules({ binding: null, now });

    expect(result.overallStatus).toBe('pending_binding');
    expect(result.missingBinding).toBe(true);
    expect(result.automaticRules).toEqual([]);
  });

  it.each([
    // Sem janela oficial de reset, "abaixo do limite" não pode virar "seguro".
    [-1_000, 'partial'],
    [-3_600, 'warning'],
    [-4_500, 'critical'],
    [-5_000, 'breached'],
  ] as const)('classifies daily loss %s as %s', (dailyPnl, expected) => {
    const result = evaluate(dailyPnl);
    expect(result.automaticRules.find((rule) => rule.key === 'daily_loss')?.status).toBe(
      expected,
    );
  });

  it('marks the daily window as estimated when official reset metadata is absent', () => {
    const result = evaluate(-1_000);
    const daily = result.automaticRules.find((rule) => rule.key === 'daily_loss');

    expect(daily?.detail).toContain('Janela diária estimada em UTC');
    expect(daily?.detail).toContain('reset da mesa não está confirmado');
    expect(daily?.message).toContain('Não confirma conta segura');
  });

  describe('perda diária com posições abertas', () => {
    function evaluateWithPositions(dailyPnl: number, floating: number[], context?: Parameters<typeof evaluateBoundAccountRules>[0]['dailyRuleContext']) {
      const floatingTotal = floating.reduce((sum, value) => sum + value, 0);
      return evaluateBoundAccountRules({
        binding: binding(),
        account: { startBalance: 100_000, currentBalance: 100_000, phase: 'Fase 1' },
        snapshots: [
          {
            balance: 100_000,
            equity: 100_000 + floatingTotal,
            dailyPnl,
            floatingPnl: floatingTotal,
            date: '2026-07-18',
            createdAt: '2026-07-18T14:00:00.000Z',
          },
        ],
        positions: floating.map((floatingPnl) => ({ floatingPnl })),
        dailyRuleContext: context,
        now,
      }).automaticRules.find((rule) => rule.key === 'daily_loss');
    }

    it('soma o prejuízo flutuante: perda fechada pequena + flutuante de 6% viola o limite de 5%', () => {
      // Caso da auditoria: antes aparecia como "safe" porque só o P&L fechado contava.
      const daily = evaluateWithPositions(-500, [-6_000]);
      expect(daily?.status).toBe('breached');
      expect(daily?.currentValue).toBe(6_500);
      expect(daily?.detail).toContain('prejuízo flutuante');
    });

    it('usa a fonte de flutuante mais negativa quando posições e snapshot divergem', () => {
      const daily = evaluateBoundAccountRules({
        binding: binding(),
        account: { startBalance: 100_000, phase: 'Fase 1' },
        snapshots: [
          { balance: 100_000, equity: 95_800, dailyPnl: 0, floatingPnl: -4_200, date: '2026-07-18' },
        ],
        positions: [], // leitura de posições vazia não pode esconder o flutuante do snapshot
        now,
      }).automaticRules.find((rule) => rule.key === 'daily_loss');
      expect(daily?.currentValue).toBe(4_200);
      expect(daily?.status).toBe('warning'); // 84% do limite de US$5.000
    });

    it('com base desconhecida, lucro flutuante não abate a perda fechada', () => {
      const daily = evaluateWithPositions(-4_500, [3_000]);
      expect(daily?.currentValue).toBe(4_500);
      expect(daily?.status).toBe('critical');
    });

    it('com base declarada por equity, lucro flutuante abate a perda fechada', () => {
      const daily = evaluateWithPositions(-4_500, [3_000], {
        timezone: 'UTC',
        resetTime: '00:00',
        calculationBasis: 'equity',
      });
      expect(daily?.currentValue).toBe(1_500);
      expect(daily?.status).toBe('safe');
    });

    it('com base declarada por P&L fechado, o flutuante não entra', () => {
      const daily = evaluateWithPositions(-1_000, [-6_000], {
        timezone: 'UTC',
        resetTime: '00:00',
        calculationBasis: 'closed_pnl',
      });
      expect(daily?.currentValue).toBe(1_000);
      expect(daily?.status).toBe('safe');
    });

    it('só conclui "seguro" com janela oficial confirmada e flutuante conhecido', () => {
      const confirmed = evaluateWithPositions(-1_000, [-200], {
        timezone: 'UTC',
        resetTime: '00:00',
        calculationBasis: 'closed_and_floating',
      });
      expect(confirmed?.status).toBe('safe');

      const floatingUnknown = evaluateBoundAccountRules({
        binding: binding(),
        account: { startBalance: 100_000, phase: 'Fase 1' },
        snapshots: [{ dailyPnl: -1_000, date: '2026-07-18' }],
        positions: null,
        dailyRuleContext: { timezone: 'UTC', resetTime: '00:00' },
        now,
      }).automaticRules.find((rule) => rule.key === 'daily_loss');
      expect(floatingUnknown?.status).toBe('partial');
      expect(floatingUnknown?.detail).toContain('flutuante das posições abertas não disponível');
    });

    it('com reset oficial fora da meia-noite UTC, não usa a linha diária UTC e exige histórico', () => {
      const daily = evaluateWithPositions(-4_900, [], {
        timezone: 'Europe/Prague',
        resetTime: '00:00',
        calculationBasis: 'closed_and_floating',
      });
      expect(daily?.status).toBe('not_monitorable');
      expect(daily?.message).toContain('janela diária oficial');
    });

    it('com reset oficial e histórico completo, agrupa os trades pela janela da mesa', () => {
      const daily = evaluateBoundAccountRules({
        binding: binding(),
        account: { startBalance: 100_000, phase: 'Fase 1' },
        snapshots: [{ balance: 100_000, equity: 100_000, floatingPnl: 0, date: '2026-07-18' }],
        positions: [],
        trades: [
          // 23:30 UTC do dia 17 = 01:30 em Praga no dia 18 → conta para o dia 18.
          { profit: -2_000, closeTime: '2026-07-17T23:30:00.000Z' },
          // 21:00 UTC do dia 17 = 23:00 em Praga no dia 17 → dia anterior.
          { profit: -2_500, closeTime: '2026-07-17T21:00:00.000Z' },
        ],
        dailyRuleContext: {
          timezone: 'Europe/Prague',
          resetTime: '00:00',
          calculationBasis: 'closed_and_floating',
          historyComplete: true,
        },
        now,
      }).automaticRules.find((rule) => rule.key === 'daily_loss');
      expect(daily?.currentValue).toBe(2_000);
    });
  });

  it('does not trust daily_loss_used without a compatible reset date', () => {
    const result = evaluateBoundAccountRules({
      binding: binding(),
      account: {
        currentBalance: 99_000,
        currentEquity: 99_000,
        dailyLossUsed: 1_000,
        phase: 'Fase 1',
      },
      snapshots: [],
      trades: [],
      positions: [],
      now,
    });
    const daily = result.automaticRules.find((rule) => rule.key === 'daily_loss');

    expect(daily?.status).toBe('not_monitorable');
    expect(daily?.message).toBe(
      'Histórico diário insuficiente para calcular esta regra com precisão.',
    );
  });

  it('accepts a complete controlled daily history and configured reset context', () => {
    const result = evaluateBoundAccountRules({
      binding: binding(),
      account: {
        currentBalance: 99_000,
        currentEquity: 99_000,
        phase: 'Fase 1',
      },
      snapshots: [],
      trades: [
        {
          profit: -1_000,
          commission: -10,
          swap: 0,
          closeTime: '2026-07-18T14:00:00.000Z',
        },
      ],
      positions: [{ floatingPnl: -200 }],
      dailyRuleContext: {
        timezone: 'UTC',
        resetTime: '00:00',
        calculationBasis: 'closed_and_floating',
        historyComplete: true,
      },
      now,
    });
    const daily = result.automaticRules.find((rule) => rule.key === 'daily_loss');

    expect(daily?.currentValue).toBe(1_210);
    expect(daily?.detail).toContain('UTC');
    expect(daily?.detail).toContain('reset 00:00');
  });

  it('keeps static max drawdown safe below the consumption thresholds', () => {
    const result = evaluate(-500, 98_000, 97_000);
    const drawdown = result.automaticRules.find(
      (rule) => rule.key === 'max_drawdown',
    );

    expect(drawdown?.status).toBe('safe');
    expect(drawdown?.currentValue).toBe(3_000);
  });

  it('marks static max drawdown as breached at the limit', () => {
    const result = evaluate(-500, 90_000, 89_000);
    expect(
      result.automaticRules.find((rule) => rule.key === 'max_drawdown')?.status,
    ).toBe('breached');
  });

  it('applies an explicit trailing lock at the initial balance', () => {
    const ruleSnapshot = snapshot();
    const result = evaluateBoundAccountRules({
      binding: binding({
        criticalRules: {
          ...ruleSnapshot.criticalRules,
          drawdownType: 'Trailing',
          drawdownCalculation:
            'Segue o maior saldo fechado e trava no saldo inicial.',
        },
      }),
      account: {
        currentBalance: 101_000,
        currentEquity: 101_000,
        phase: 'Fase 1',
      },
      snapshots: [
        {
          balance: 101_000,
          equity: 101_000,
          maxBalance: 110_000,
          dailyPnl: 0,
          date: '2026-07-18',
        },
        {
          balance: 110_000,
          equity: 110_000,
          maxBalance: 110_000,
          dailyPnl: 0,
          date: '2026-07-17',
        },
      ],
      now,
    });
    const drawdown = result.automaticRules.find(
      (rule) => rule.key === 'max_drawdown',
    );

    expect(drawdown?.currentValue).toBe(9_000);
    expect(drawdown?.status).toBe('critical');
    expect(drawdown?.detail).toContain('trava explícita');
  });

  it('calculates partial profit target progress for the current phase', () => {
    const result = evaluate(1_000, 104_000, 104_000);
    const target = result.automaticRules.find(
      (rule) => rule.key === 'profit_target',
    );

    expect(target?.status).toBe('safe');
    expect(target?.percentage).toBe(50);
    expect(target?.remainingValue).toBe(4_000);
  });

  it('reports when the current phase profit target was attained', () => {
    const result = evaluate(1_000, 108_000, 108_000);
    expect(
      result.automaticRules.find((rule) => rule.key === 'profit_target')?.message,
    ).toContain('atingida');
  });

  it('requires the account phase when the snapshot has multiple phases', () => {
    const result = evaluateBoundAccountRules({
      binding: binding(),
      account: {
        startBalance: 100_000,
        currentBalance: 104_000,
        currentEquity: 104_000,
      },
      snapshots: [{ balance: 104_000, equity: 104_000, dailyPnl: 0, date: '2026-07-18' }],
      now,
    });
    const target = result.automaticRules.find(
      (rule) => rule.key === 'profit_target',
    );

    expect(target?.status).toBe('not_monitorable');
    expect(target?.message).toBe('Fase da conta não informada.');
  });

  it('keeps snapshot rules classified as manual out of automatic conclusions', () => {
    const ruleSnapshot = snapshot();
    const result = evaluateBoundAccountRules({
      binding: binding({
        monitorability: {
          ...ruleSnapshot.monitorability,
          automaticMt5: ['Meta de lucro', 'Perda máxima'],
          manualCheck: ['Perda diária', 'Notícias'],
        },
      }),
      account: { currentBalance: 100_000, currentEquity: 100_000, phase: 'Fase 1' },
      snapshots: [{ balance: 100_000, equity: 100_000, dailyPnl: -6_000, date: '2026-07-18' }],
      now,
    });
    const daily = result.automaticRules.find((rule) => rule.key === 'daily_loss');

    expect(daily?.status).toBe('not_monitorable');
    expect(daily?.monitorability).toBe('manual_check');
    expect(result.manualRules.map((rule) => rule.label)).toContain('Perda diária');
  });

  it('keeps unsupported snapshot rules explicit', () => {
    const ruleSnapshot = snapshot();
    const result = evaluateBoundAccountRules({
      binding: binding({
        monitorability: {
          ...ruleSnapshot.monitorability,
          automaticMt5: ['Meta de lucro', 'Perda diária'],
          notSupportedYet: ['Perda máxima'],
        },
      }),
      account: { currentBalance: 100_000, currentEquity: 100_000, phase: 'Fase 1' },
      snapshots: [{ balance: 100_000, equity: 100_000, dailyPnl: 0, date: '2026-07-18' }],
      now,
    });

    expect(
      result.automaticRules.find((rule) => rule.key === 'max_drawdown')
        ?.monitorability,
    ).toBe('not_supported_yet');
  });

  it.each([
    [{ program: { ...snapshot().program, market: 'Futures' } }, 'Futures'],
    [{ platform: 'BlackArrow' }, 'BlackArrow'],
  ] as const)(
    'does not calculate MT5 limits automatically for %s',
    (snapshotOverride, _label) => {
      const ruleBinding = binding(snapshotOverride as Partial<RuleBindingSnapshot>);
      ruleBinding.automatic_monitoring_enabled = true;
      const result = evaluateBoundAccountRules({
        binding: ruleBinding,
        account: { currentBalance: 80_000, currentEquity: 80_000, phase: 'Fase 1' },
        snapshots: [{ balance: 80_000, equity: 80_000, dailyPnl: -20_000, date: '2026-07-18' }],
        now,
      });

      expect(
        result.automaticRules.every((rule) => rule.status === 'not_monitorable'),
      ).toBe(true);
    },
  );

  it('marks a missing critical limit as not_monitorable instead of safe', () => {
    const ruleSnapshot = snapshot();
    const result = evaluateBoundAccountRules({
      binding: binding({
        criticalRules: {
          ...ruleSnapshot.criticalRules,
          dailyLoss: 'Não informado publicamente',
        },
      }),
      account: { currentBalance: 100_000, currentEquity: 100_000, phase: 'Fase 1' },
      snapshots: [{ balance: 100_000, equity: 100_000, dailyPnl: 0, date: '2026-07-18' }],
      now,
    });

    expect(
      result.automaticRules.find((rule) => rule.key === 'daily_loss')?.status,
    ).toBe('not_monitorable');
  });

  it('preserves binding hash, version and official source in the evaluation', () => {
    const result = evaluate(0);

    expect(result.source.snapshotHash).toBe('sha256:abc123');
    expect(result.source.ruleVersionId).toBe('rules-v1');
    expect(result.source.officialSourceUrls).toEqual(['https://example.com/rules']);
  });

  it('uses the worst automatic rule status as the overall status', () => {
    const result = evaluate(-4_500, 99_000, 99_000);

    expect(result.overallStatus).toBe('critical');
    expect(result.overallMessage).toContain('crítica');
  });
});
