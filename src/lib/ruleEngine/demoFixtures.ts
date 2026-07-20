import { propFirmRulePrograms } from '@/data/propFirmRules';
import type { AccountLevelPropFirmRuleProgram } from '@/data/prop-firms/accountLevelRules';
import type {
  RuleAccountSize,
  RuleAccountVersion,
} from '@/data/propFirmRules';
import type {
  AccountRuleBindingRow,
  RuleBindingSnapshot,
} from '@/lib/ruleBinding';
import { evaluateBoundAccountRules } from './evaluateAccountRules';
import {
  normalizeRuleText,
  parseInitialBalance,
  type BoundAccountRuleEvaluation,
  type EvaluateBoundAccountRulesInput,
  type RuleEvaluationStatus,
} from './ruleEngineTypes';

export type RuleEngineDemoScenarioId =
  | 'safe'
  | 'warning'
  | 'critical'
  | 'breached'
  | 'profit_target_near'
  | 'profit_target_reached'
  | 'insufficient_daily_history'
  | 'manual_rule'
  | 'unsupported_rule'
  | 'futures_blackarrow';

export interface RuleEngineDemoScenario {
  id: RuleEngineDemoScenarioId;
  label: string;
  description: string;
  expectedStatus: RuleEvaluationStatus;
  binding: AccountRuleBindingRow;
  input: EvaluateBoundAccountRulesInput;
  evaluation: BoundAccountRuleEvaluation;
}

const DEMO_NOW = new Date('2026-07-18T15:00:00.000Z');
const DEMO_DATE = '2026-07-18';

function operationalProgram(
  predicate: (program: AccountLevelPropFirmRuleProgram) => boolean,
) {
  const program = propFirmRulePrograms.find(
    (candidate): candidate is AccountLevelPropFirmRuleProgram =>
      candidate.evidenceStatus !== 'official_source_unavailable' &&
      Boolean(candidate.accountLevelRules?.length) &&
      predicate(candidate as AccountLevelPropFirmRuleProgram),
  );

  if (!program) {
    throw new Error('Programa oficial indisponível para o modo demonstração.');
  }

  return program;
}

function accountForPlatform(
  program: AccountLevelPropFirmRuleProgram,
  platformName: string,
  preferredLabel?: string,
) {
  const candidates = program.accountLevelRules.filter((account) =>
    account.platforms.some(
      (platform) => normalizeRuleText(platform) === normalizeRuleText(platformName),
    ),
  );
  const account =
    candidates.find((candidate) =>
      preferredLabel
        ? normalizeRuleText(candidate.label).includes(
            normalizeRuleText(preferredLabel),
          )
        : false,
    ) ?? candidates[0];

  if (!account) {
    throw new Error('Tamanho de conta indisponível para o modo demonstração.');
  }

  return account;
}

function versionFor(account: RuleAccountSize) {
  const version = account.versions[0];
  if (!version) {
    throw new Error('Versão oficial indisponível para o modo demonstração.');
  }
  return version;
}

function platformFor(account: RuleAccountSize, platformName: string) {
  const platform = account.platforms.find(
    (candidate) =>
      normalizeRuleText(candidate) === normalizeRuleText(platformName),
  );
  if (!platform) {
    throw new Error('Plataforma indisponível para o modo demonstração.');
  }
  return platform;
}

function buildDemoSnapshot(
  program: AccountLevelPropFirmRuleProgram,
  account: RuleAccountSize,
  platform: string,
  version: RuleAccountVersion,
): RuleBindingSnapshot {
  const officialSourceUrls = Array.from(
    new Set([...program.officialSourceUrls, ...account.sourceRefs]),
  )
    .filter((url) => url.startsWith('https://'))
    .sort();

  return {
    schemaVersion: 'fortify.rule-binding.v1',
    propFirm: {
      slug: program.firmSlug,
      name: program.firm,
    },
    program: {
      id: program.id,
      slug: program.programSlug,
      name: program.programName,
      type: program.programType,
      market: program.market,
    },
    accountSize: {
      id: account.id,
      label: account.label,
      initialBalance: account.initialBalance,
      currency: account.currency,
    },
    platform,
    version: {
      id: version.id,
      label: version.label,
      effectiveFrom: version.effectiveFrom ?? null,
      effectiveTo: version.effectiveTo ?? null,
      condition: version.condition ?? null,
      notes: [...version.notes],
    },
    criticalRules: {
      phases: account.phases.map((phase) => ({ ...phase })),
      dailyLoss: account.dailyLoss,
      maxLoss: account.maxLoss,
      drawdownType: account.drawdownType,
      drawdownCalculation: account.drawdownCalculation,
      minTradingDays: account.minTradingDays,
      consistencyRule: account.consistencyRule,
      newsRule: account.newsRule,
      weekendRule: account.weekendRule,
      overnightRule: account.overnightRule,
      payoutSplit: account.payoutSplit,
      firstPayoutTiming: account.firstPayoutTiming,
      maxContracts: account.maxContracts,
      maxLots: account.maxLots,
      leverage: account.leverage,
      breachConditions: [...account.breachConditions],
    },
    monitorability: {
      automaticMt5: [...account.monitorability.automatic_mt5],
      manualCheck: [...account.monitorability.manual_check],
      notSupportedYet: [...account.monitorability.not_supported_yet],
    },
    evidence: {
      officialSourceUrls,
      confidence: account.confidence,
      dataCompleteness: account.dataCompleteness,
      lastReviewedAt: account.lastReviewedAt,
      conflicts: [...account.conflicts],
    },
  };
}

function demoSnapshotSignature(snapshot: RuleBindingSnapshot) {
  const encoded = new TextEncoder().encode(JSON.stringify(snapshot));
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;

  for (const byte of encoded) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * prime);
  }

  return `demo-fnv1a64:${hash.toString(16).padStart(16, '0')}`;
}

function demoBinding(
  snapshot: RuleBindingSnapshot,
  suffix: string,
): AccountRuleBindingRow {
  return {
    id: `demo-binding-${suffix}`,
    user_id: 'demo-user-local',
    trading_account_id: `demo-account-${suffix}`,
    mt5_connection_id: null,
    prop_firm_slug: snapshot.propFirm.slug,
    program_slug: snapshot.program.slug,
    account_size_id: snapshot.accountSize.id,
    platform: snapshot.platform,
    rule_version_id: snapshot.version.id,
    rule_profile_id: [
      'demo',
      snapshot.propFirm.slug,
      snapshot.program.slug,
      snapshot.accountSize.id,
      snapshot.platform,
      snapshot.version.id,
    ].join(':'),
    rules_last_reviewed_at: snapshot.evidence.lastReviewedAt,
    rule_snapshot: snapshot,
    rule_snapshot_hash: demoSnapshotSignature(snapshot),
    automatic_monitoring_enabled:
      normalizeRuleText(snapshot.platform).includes('mt5') &&
      snapshot.monitorability.automaticMt5.length > 0,
    manual_rule_acknowledgement: true,
    manual_rules_status: 'acknowledged',
    binding_status: 'active',
    created_at: '2026-07-18T12:00:00.000Z',
    updated_at: '2026-07-18T12:00:00.000Z',
  };
}

function withMonitorability(
  snapshot: RuleBindingSnapshot,
  monitorability: RuleBindingSnapshot['monitorability'],
): RuleBindingSnapshot {
  return {
    ...snapshot,
    monitorability: {
      automaticMt5: [...monitorability.automaticMt5],
      manualCheck: [...monitorability.manualCheck],
      notSupportedYet: [...monitorability.notSupportedYet],
    },
  };
}

function createScenario(input: {
  id: RuleEngineDemoScenarioId;
  label: string;
  description: string;
  expectedStatus: RuleEvaluationStatus;
  binding: AccountRuleBindingRow;
  account: NonNullable<EvaluateBoundAccountRulesInput['account']>;
  dailyPnl?: number;
  includeDailyHistory?: boolean;
}) {
  const startBalance =
    parseInitialBalance(input.binding.rule_snapshot.accountSize.initialBalance) ??
    input.account.startBalance ??
    100_000;
  const currentBalance = input.account.currentBalance ?? startBalance;
  const currentEquity = input.account.currentEquity ?? currentBalance;
  const includeDailyHistory = input.includeDailyHistory ?? true;
  const engineInput: EvaluateBoundAccountRulesInput = {
    binding: input.binding,
    account: {
      startBalance,
      ...input.account,
    },
    snapshots: includeDailyHistory
      ? [
          {
            balance: currentBalance,
            equity: currentEquity,
            dailyPnl: input.dailyPnl ?? 0,
            floatingPnl: Math.min(0, currentEquity - currentBalance),
            maxBalance: Math.max(startBalance, currentBalance),
            date: DEMO_DATE,
            createdAt: '2026-07-18T14:00:00.000Z',
          },
        ]
      : [],
    trades: [],
    positions:
      currentEquity < currentBalance
        ? [{ floatingPnl: currentEquity - currentBalance }]
        : [],
    now: DEMO_NOW,
  };

  return {
    id: input.id,
    label: input.label,
    description: input.description,
    expectedStatus: input.expectedStatus,
    binding: input.binding,
    input: engineInput,
    evaluation: evaluateBoundAccountRules(engineInput),
  } satisfies RuleEngineDemoScenario;
}

const ftmoProgram = operationalProgram(
  (program) => program.firmSlug === 'ftmo' && program.programType === '2-Step',
);
const ftmoAccount = accountForPlatform(ftmoProgram, 'MT5', '$100K');
const ftmoPlatform = platformFor(ftmoAccount, 'MT5');
const ftmoSnapshot = buildDemoSnapshot(
  ftmoProgram,
  ftmoAccount,
  ftmoPlatform,
  versionFor(ftmoAccount),
);

const manualSnapshot = withMonitorability(ftmoSnapshot, {
  automaticMt5: ftmoSnapshot.monitorability.automaticMt5.filter(
    (rule) => !normalizeRuleText(rule).includes('perda diaria'),
  ),
  manualCheck: [...ftmoSnapshot.monitorability.manualCheck, 'Perda diária'],
  notSupportedYet: ftmoSnapshot.monitorability.notSupportedYet,
});

const unsupportedSnapshot = withMonitorability(ftmoSnapshot, {
  automaticMt5: ftmoSnapshot.monitorability.automaticMt5.filter(
    (rule) => !normalizeRuleText(rule).includes('perda maxima'),
  ),
  manualCheck: ftmoSnapshot.monitorability.manualCheck,
  notSupportedYet: [
    ...ftmoSnapshot.monitorability.notSupportedYet,
    'Perda máxima',
  ],
});

const blackArrowProgram = operationalProgram(
  (program) =>
    program.firmSlug === 'np-future' &&
    program.programName === 'Standard - BlackArrow',
);
const blackArrowAccount = accountForPlatform(blackArrowProgram, 'BlackArrow');
const blackArrowPlatform = platformFor(blackArrowAccount, 'BlackArrow');
const blackArrowSnapshot = buildDemoSnapshot(
  blackArrowProgram,
  blackArrowAccount,
  blackArrowPlatform,
  versionFor(blackArrowAccount),
);
const blackArrowBalance =
  parseInitialBalance(blackArrowSnapshot.accountSize.initialBalance) ?? 25_000;

export const ruleEngineDemoScenarios: RuleEngineDemoScenario[] = [
  createScenario({
    id: 'safe',
    label: 'Conta segura',
    description: 'Limites automáticos com ampla margem operacional.',
    expectedStatus: 'safe',
    binding: demoBinding(ftmoSnapshot, 'safe'),
    account: {
      currentBalance: 102_000,
      currentEquity: 101_500,
      highestEquity: 102_000,
      phase: 'Fase 1',
    },
    dailyPnl: -1_000,
  }),
  createScenario({
    id: 'warning',
    label: 'Conta em atenção',
    description: 'Perda diária acima de 70% do limite permitido.',
    expectedStatus: 'warning',
    binding: demoBinding(ftmoSnapshot, 'warning'),
    account: {
      currentBalance: 100_500,
      currentEquity: 100_000,
      highestEquity: 101_000,
      phase: 'Fase 1',
    },
    dailyPnl: -3_750,
  }),
  createScenario({
    id: 'critical',
    label: 'Conta crítica',
    description: 'Perda diária acima de 85% do limite permitido.',
    expectedStatus: 'critical',
    binding: demoBinding(ftmoSnapshot, 'critical'),
    account: {
      currentBalance: 100_200,
      currentEquity: 99_000,
      highestEquity: 101_000,
      phase: 'Fase 1',
    },
    dailyPnl: -4_500,
  }),
  createScenario({
    id: 'breached',
    label: 'Conta violada',
    description: 'Perda diária e drawdown ultrapassam os limites oficiais.',
    expectedStatus: 'breached',
    binding: demoBinding(ftmoSnapshot, 'breached'),
    account: {
      currentBalance: 89_500,
      currentEquity: 89_000,
      highestEquity: 100_000,
      phase: 'Fase 1',
    },
    dailyPnl: -5_200,
  }),
  createScenario({
    id: 'profit_target_near',
    label: 'Meta quase atingida',
    description: 'Progresso controlado próximo da meta da Fase 1.',
    expectedStatus: 'safe',
    binding: demoBinding(ftmoSnapshot, 'target-near'),
    account: {
      currentBalance: 109_500,
      currentEquity: 109_300,
      highestEquity: 109_500,
      phase: 'Fase 1',
    },
    dailyPnl: 1_000,
  }),
  createScenario({
    id: 'profit_target_reached',
    label: 'Meta atingida',
    description: 'Saldo simulado supera a meta oficial da Fase 1.',
    expectedStatus: 'safe',
    binding: demoBinding(ftmoSnapshot, 'target-reached'),
    account: {
      currentBalance: 110_500,
      currentEquity: 110_500,
      highestEquity: 110_500,
      phase: 'Fase 1',
    },
    dailyPnl: 1_500,
  }),
  createScenario({
    id: 'insufficient_daily_history',
    label: 'Histórico diário insuficiente',
    description: 'O motor se recusa a inferir perda diária sem histórico.',
    expectedStatus: 'not_monitorable',
    binding: demoBinding(ftmoSnapshot, 'insufficient-history'),
    account: {
      currentBalance: 100_000,
      currentEquity: 100_000,
      highestEquity: 100_000,
      phase: 'Fase 1',
    },
    includeDailyHistory: false,
  }),
  createScenario({
    id: 'manual_rule',
    label: 'Regra manual',
    description: 'Perda diária classificada para validação humana.',
    expectedStatus: 'not_monitorable',
    binding: demoBinding(manualSnapshot, 'manual-rule'),
    account: {
      currentBalance: 100_000,
      currentEquity: 100_000,
      highestEquity: 100_000,
      phase: 'Fase 1',
    },
    dailyPnl: -2_000,
  }),
  createScenario({
    id: 'unsupported_rule',
    label: 'Regra não suportada',
    description: 'Drawdown permanece explícito sem conclusão automática.',
    expectedStatus: 'not_monitorable',
    binding: demoBinding(unsupportedSnapshot, 'unsupported-rule'),
    account: {
      currentBalance: 99_000,
      currentEquity: 99_000,
      highestEquity: 100_000,
      phase: 'Fase 1',
    },
    dailyPnl: -500,
  }),
  createScenario({
    id: 'futures_blackarrow',
    label: 'Futures / BlackArrow',
    description: 'Proteção contra cálculo MT5 em plataforma não integrada.',
    expectedStatus: 'not_monitorable',
    binding: demoBinding(blackArrowSnapshot, 'blackarrow'),
    account: {
      startBalance: blackArrowBalance,
      currentBalance: blackArrowBalance,
      currentEquity: blackArrowBalance,
      highestEquity: blackArrowBalance,
      phase: 'Fase 1',
    },
    dailyPnl: 0,
  }),
];

export function getRuleEngineDemoScenario(id: RuleEngineDemoScenarioId) {
  return (
    ruleEngineDemoScenarios.find((scenario) => scenario.id === id) ??
    ruleEngineDemoScenarios[0]
  );
}
