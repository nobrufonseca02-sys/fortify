import { describe, expect, it } from 'vitest';
import { evaluateBoundAccountRules } from '../lib/ruleEngine/evaluateAccountRules';
import type {
  AccountRuleBindingRow,
  RuleBindingSnapshot,
} from '../lib/ruleBinding';

const now = new Date('2026-07-18T15:00:00.000Z');

function snapshot(
  overrides: Partial<RuleBindingSnapshot> = {},
): RuleBindingSnapshot {
  return {
    schemaVersion: 'fortify.rule-binding.v1',
    propFirm: { slug: 'mesa-teste', name: 'Mesa Teste' },
    program: {
      id: 'programa-teste',
      slug: 'programa-teste',
      name: 'Programa Teste',
      type: '2-Step',
      market: 'CFDs',
    },
    accountSize: {
      id: 'programa-teste-100k',
      label: '$100K',
      initialBalance: '$100K',
      currency: 'USD',
    },
    platform: 'MT5',
    version: {
      id: 'rules-v1',
      label: 'Regras vigentes',
      effectiveFrom: '2026-07-01',
      effectiveTo: null,
      condition: null,
      notes: [],
    },
    criticalRules: {
      phases: [
        { id: 'phase-1', label: 'Fase 1', profitTarget: '8%' },
        { id: 'phase-2', label: 'Fase 2', profitTarget: '5%' },
      ],
      dailyLoss: '5%',
      maxLoss: '10%',
      drawdownType: 'Static',
      drawdownCalculation: 'Estático sobre saldo inicial, considerando equity.',
      minTradingDays: '4 dias',
      consistencyRule: 'Não aplicável',
      newsRule: 'Validação manual',
      weekendRule: 'Validação manual',
      overnightRule: 'Validação manual',
      payoutSplit: '80%',
      firstPayoutTiming: '14 dias',
      maxContracts: 'Não aplicável',
      maxLots: 'Não informado publicamente',
      leverage: '1:100',
      breachConditions: ['Atingir o limite diário ou máximo.'],
    },
    monitorability: {
      automaticMt5: ['Meta de lucro', 'Perda diária', 'Perda máxima'],
      manualCheck: ['Notícias', 'Fim de semana'],
      notSupportedYet: ['Detecção de copy trading'],
    },
    evidence: {
      officialSourceUrls: ['https://example.com/rules'],
      confidence: 'high',
      dataCompleteness: 'complete',
      lastReviewedAt: '2026-07-18',
      conflicts: [],
    },
    ...overrides,
  };
}

function binding(
  snapshotOverrides: Partial<RuleBindingSnapshot> = {},
): AccountRuleBindingRow {
  const ruleSnapshot = snapshot(snapshotOverrides);
  return {
    id: 'binding-1',
    user_id: 'user-1',
    trading_account_id: 'account-1',
    mt5_connection_id: 'connection-1',
    prop_firm_slug: ruleSnapshot.propFirm.slug,
    program_slug: ruleSnapshot.program.slug,
    account_size_id: ruleSnapshot.accountSize.id,
    platform: ruleSnapshot.platform,
    rule_version_id: ruleSnapshot.version.id,
    rule_profile_id: 'mesa-teste:programa-teste:100k:mt5:rules-v1',
    rules_last_reviewed_at: '2026-07-18',
    rule_snapshot: ruleSnapshot,
    rule_snapshot_hash: 'sha256:abc123',
    automatic_monitoring_enabled: true,
    manual_rule_acknowledgement: true,
    manual_rules_status: 'acknowledged',
    binding_status: 'active',
    created_at: '2026-07-18T12:00:00.000Z',
    updated_at: '2026-07-18T12:00:00.000Z',
  };
}

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
    [-1_000, 'safe'],
    [-3_600, 'warning'],
    [-4_500, 'critical'],
    [-5_000, 'breached'],
  ] as const)('classifies daily loss %s as %s', (dailyPnl, expected) => {
    const result = evaluate(dailyPnl);
    expect(result.automaticRules.find((rule) => rule.key === 'daily_loss')?.status).toBe(
      expected,
    );
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
    (snapshotOverride) => {
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
