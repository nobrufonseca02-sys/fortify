import type {
  AccountRuleBindingRow,
  RuleBindingSnapshot,
} from '../../lib/ruleBinding';
import type { EvaluateBoundAccountRulesInput } from '../../lib/ruleEngine/ruleEngineTypes';

export const RULE_ENGINE_TEST_NOW = new Date('2026-07-18T15:00:00.000Z');

export function createRuleSnapshot(
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

export function createRuleBinding(
  snapshotOverrides: Partial<RuleBindingSnapshot> = {},
): AccountRuleBindingRow {
  const ruleSnapshot = createRuleSnapshot(snapshotOverrides);
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

export function createLinkedRuleEngineInput(
  overrides: Partial<EvaluateBoundAccountRulesInput> = {},
): EvaluateBoundAccountRulesInput {
  return {
    binding: createRuleBinding(),
    account: {
      startBalance: 100_000,
      currentBalance: 98_000,
      currentEquity: 97_000,
      highestEquity: 100_000,
      phase: 'Fase 1',
    },
    snapshots: [
      {
        balance: 98_000,
        equity: 97_000,
        dailyPnl: -1_000,
        floatingPnl: -250,
        maxBalance: 100_000,
        date: '2026-07-18',
        createdAt: '2026-07-18T14:00:00.000Z',
      },
    ],
    trades: [],
    positions: [{ floatingPnl: -250 }],
    now: RULE_ENGINE_TEST_NOW,
    ...overrides,
  };
}
