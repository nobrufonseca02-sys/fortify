import { propFirmRulePrograms } from '@/data/propFirmRules';
import type {
  AccountLevelPropFirmRuleProgram,
} from '@/data/prop-firms/accountLevelRules';
import type {
  RuleAccountSize,
  RuleAccountVersion,
} from '@/data/propFirmRules';
import { supabase } from '@/integrations/supabase/client';

export const RULE_BINDING_SCHEMA_VERSION = 'fortify.rule-binding.v1';

export interface RuleBindingDraft {
  propFirmSlug: string;
  programSlug: string;
  accountSizeId: string;
  platform: string;
  ruleVersionId: string;
  manualRuleAcknowledgement: boolean;
}

export interface ResolvedRuleBinding {
  program: AccountLevelPropFirmRuleProgram;
  accountSize: RuleAccountSize;
  version: RuleAccountVersion;
}

export interface RuleBindingSnapshot {
  schemaVersion: typeof RULE_BINDING_SCHEMA_VERSION;
  propFirm: {
    slug: string;
    name: string;
  };
  program: {
    id: string;
    slug: string;
    name: string;
    type: string;
    market: string;
  };
  accountSize: {
    id: string;
    label: string;
    initialBalance: string;
    currency: string;
  };
  platform: string;
  version: {
    id: string;
    label: string;
    effectiveFrom: string | null;
    effectiveTo: string | null;
    condition: string | null;
    notes: string[];
  };
  criticalRules: {
    phases: RuleAccountSize['phases'];
    dailyLoss: string;
    maxLoss: string;
    drawdownType: string;
    drawdownCalculation: string;
    minTradingDays: string;
    consistencyRule: string;
    newsRule: string;
    weekendRule: string;
    overnightRule: string;
    payoutSplit: string;
    firstPayoutTiming: string;
    maxContracts: string;
    maxLots: string;
    leverage: string;
    breachConditions: string[];
  };
  monitorability: {
    automaticMt5: string[];
    manualCheck: string[];
    notSupportedYet: string[];
  };
  evidence: {
    officialSourceUrls: string[];
    confidence: string;
    dataCompleteness: string;
    lastReviewedAt: string;
    conflicts: string[];
  };
}

export interface PreparedRuleBinding {
  resolved: ResolvedRuleBinding;
  snapshot: RuleBindingSnapshot;
  snapshotHash: string;
  ruleProfileId: string;
  automaticMonitoringEnabled: boolean;
}

export interface AccountRuleBindingRow {
  id: string;
  user_id: string;
  trading_account_id: string | null;
  mt5_connection_id: string | null;
  prop_firm_slug: string;
  program_slug: string;
  account_size_id: string;
  platform: string;
  rule_version_id: string;
  rule_profile_id: string;
  rules_last_reviewed_at: string;
  rule_snapshot: RuleBindingSnapshot;
  rule_snapshot_hash: string;
  automatic_monitoring_enabled: boolean;
  manual_rule_acknowledgement: boolean;
  manual_rules_status: 'pending_acknowledgement' | 'acknowledged';
  binding_status: 'active' | 'superseded' | 'revoked';
  created_at: string;
  updated_at: string;
}

export function getAccountRuleBindingStatus(
  binding?: AccountRuleBindingRow | null,
  currentSnapshotHash?: string,
) {
  if (!binding) {
    return {
      code: 'pending' as const,
      label: 'Regra pendente de vínculo',
      actionLabel: 'Vincular regra agora',
    };
  }
  if (currentSnapshotHash && currentSnapshotHash !== binding.rule_snapshot_hash) {
    return {
      code: 'outdated' as const,
      label: 'Regra desatualizada',
      actionLabel: 'Revisar vínculo',
    };
  }
  return {
    code: 'linked' as const,
    label: 'Regra vinculada',
    actionLabel: 'Ver vínculo',
  };
}

export const emptyRuleBindingDraft = (): RuleBindingDraft => ({
  propFirmSlug: '',
  programSlug: '',
  accountSizeId: '',
  platform: '',
  ruleVersionId: '',
  manualRuleAcknowledgement: false,
});

const normalizedPlatform = (value: string) =>
  value.toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g, '');

export function platformMatchesConstraint(platform: string, constraint?: string) {
  if (!constraint) return true;
  return normalizedPlatform(platform).includes(normalizedPlatform(constraint));
}

export function accountCurrencyValue(initialBalance: string, fallbackCurrency: string) {
  if (/R\$/i.test(initialBalance)) return 'BRL';
  if (/US\$|\$/i.test(initialBalance)) return 'USD';
  if (/€/i.test(initialBalance)) return 'EUR';
  if (/£/i.test(initialBalance)) return 'GBP';

  const supportedCurrencies = new Set(['USD', 'EUR', 'GBP', 'BRL']);
  return supportedCurrencies.has(fallbackCurrency) ? fallbackCurrency : 'USD';
}

export function getOperationalRulePrograms(platformConstraint?: string) {
  return propFirmRulePrograms.filter((program): program is AccountLevelPropFirmRuleProgram => {
    if (program.evidenceStatus === 'official_source_unavailable') return false;
    if (!program.officialSourceUrls?.some((url) => url.startsWith('https://'))) return false;
    if (!program.accountLevelRules?.length) return false;
    if (!platformConstraint) return true;

    return program.accountLevelRules.some((account) =>
      account.platforms.some((platform) => platformMatchesConstraint(platform, platformConstraint)),
    );
  });
}

export function resolveRuleBinding(
  draft: Omit<RuleBindingDraft, 'manualRuleAcknowledgement'>,
): ResolvedRuleBinding | null {
  const program = getOperationalRulePrograms().find(
    (item) =>
      item.firmSlug === draft.propFirmSlug &&
      item.programSlug === draft.programSlug,
  );
  if (!program) return null;

  const accountSize = program.accountLevelRules.find(
    (item) => item.id === draft.accountSizeId,
  );
  if (!accountSize || !accountSize.platforms.includes(draft.platform)) return null;

  const version = accountSize.versions.find(
    (item) => item.id === draft.ruleVersionId,
  );
  if (!version) return null;

  return { program, accountSize, version };
}

export function isRuleBindingDraftComplete(draft: RuleBindingDraft) {
  return draft.manualRuleAcknowledgement && Boolean(resolveRuleBinding(draft));
}

export function buildRuleSnapshot(draft: RuleBindingDraft): RuleBindingSnapshot {
  const resolved = resolveRuleBinding(draft);
  if (!resolved) {
    throw new Error('Seleção de regra incompleta ou indisponível.');
  }

  const { program, accountSize, version } = resolved;
  const officialSourceUrls = Array.from(
    new Set([...program.officialSourceUrls, ...accountSize.sourceRefs]),
  ).sort();

  return {
    schemaVersion: RULE_BINDING_SCHEMA_VERSION,
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
      id: accountSize.id,
      label: accountSize.label,
      initialBalance: accountSize.initialBalance,
      currency: accountCurrencyValue(accountSize.initialBalance, accountSize.currency),
    },
    platform: draft.platform,
    version: {
      id: version.id,
      label: version.label,
      effectiveFrom: version.effectiveFrom ?? null,
      effectiveTo: version.effectiveTo ?? null,
      condition: version.condition ?? null,
      notes: [...version.notes],
    },
    criticalRules: {
      phases: accountSize.phases.map((phase) => ({ ...phase })),
      dailyLoss: accountSize.dailyLoss,
      maxLoss: accountSize.maxLoss,
      drawdownType: accountSize.drawdownType,
      drawdownCalculation: accountSize.drawdownCalculation,
      minTradingDays: accountSize.minTradingDays,
      consistencyRule: accountSize.consistencyRule,
      newsRule: accountSize.newsRule,
      weekendRule: accountSize.weekendRule,
      overnightRule: accountSize.overnightRule,
      payoutSplit: accountSize.payoutSplit,
      firstPayoutTiming: accountSize.firstPayoutTiming,
      maxContracts: accountSize.maxContracts,
      maxLots: accountSize.maxLots,
      leverage: accountSize.leverage,
      breachConditions: [...accountSize.breachConditions],
    },
    monitorability: {
      automaticMt5: [...accountSize.monitorability.automatic_mt5],
      manualCheck: [...accountSize.monitorability.manual_check],
      notSupportedYet: [...accountSize.monitorability.not_supported_yet],
    },
    evidence: {
      officialSourceUrls,
      confidence: accountSize.confidence,
      dataCompleteness: accountSize.dataCompleteness,
      lastReviewedAt: accountSize.lastReviewedAt,
      conflicts: [...accountSize.conflicts],
    },
  };
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .filter((key) => record[key] !== undefined)
    .map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`)
    .join(',')}}`;
}

function fallbackSnapshotSignature(input: string) {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (const byte of new TextEncoder().encode(input)) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * prime);
  }
  return `fnv1a64:${hash.toString(16).padStart(16, '0')}`;
}

export async function hashRuleSnapshot(snapshot: RuleBindingSnapshot) {
  const canonicalSnapshot = canonicalize(snapshot);
  if (!globalThis.crypto?.subtle) {
    return fallbackSnapshotSignature(canonicalSnapshot);
  }

  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(canonicalSnapshot),
  );
  const hex = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  return `sha256:${hex}`;
}

export async function prepareRuleBinding(
  draft: RuleBindingDraft,
): Promise<PreparedRuleBinding> {
  if (!draft.manualRuleAcknowledgement) {
    throw new Error('O aceite das regras manuais é obrigatório.');
  }

  const resolved = resolveRuleBinding(draft);
  if (!resolved) {
    throw new Error('Seleção de regra incompleta ou indisponível.');
  }

  const snapshot = buildRuleSnapshot(draft);
  const snapshotHash = await hashRuleSnapshot(snapshot);
  const ruleProfileId = [
    resolved.program.firmSlug,
    resolved.program.programSlug,
    resolved.accountSize.id,
    normalizedPlatform(draft.platform),
    resolved.version.id,
  ].join(':');
  const automaticMonitoringEnabled =
    platformMatchesConstraint(draft.platform, 'MT5') &&
    resolved.accountSize.monitorability.automatic_mt5.length > 0;

  return {
    resolved,
    snapshot,
    snapshotHash,
    ruleProfileId,
    automaticMonitoringEnabled,
  };
}

export async function saveAccountRuleBinding(input: {
  userId: string;
  tradingAccountId?: string | null;
  mt5ConnectionId?: string | null;
  draft: RuleBindingDraft;
}) {
  if (!input.tradingAccountId && !input.mt5ConnectionId) {
    throw new Error('A conta precisa existir antes de salvar o vínculo de regras.');
  }

  const prepared = await prepareRuleBinding(input.draft);
  const insertPayload = buildAccountRuleBindingInsert(input, prepared);
  const { data, error } = await (supabase
    .from('account_rule_bindings' as any)
    .insert(insertPayload)
    .select('*')
    .single() as any);

  if (error) {
    throw new Error(`Não foi possível salvar o vínculo de regras: ${error.message}`);
  }

  return data as AccountRuleBindingRow;
}

export function buildAccountRuleBindingInsert(
  input: {
    userId: string;
    tradingAccountId?: string | null;
    mt5ConnectionId?: string | null;
    draft: RuleBindingDraft;
  },
  prepared: PreparedRuleBinding,
) {
  return {
    user_id: input.userId,
    trading_account_id: input.tradingAccountId ?? null,
    mt5_connection_id: input.mt5ConnectionId ?? null,
    prop_firm_slug: prepared.resolved.program.firmSlug,
    program_slug: prepared.resolved.program.programSlug,
    account_size_id: prepared.resolved.accountSize.id,
    platform: input.draft.platform,
    rule_version_id: prepared.resolved.version.id,
    rule_profile_id: prepared.ruleProfileId,
    rules_last_reviewed_at: prepared.resolved.accountSize.lastReviewedAt,
    rule_snapshot: prepared.snapshot,
    rule_snapshot_hash: prepared.snapshotHash,
    automatic_monitoring_enabled: prepared.automaticMonitoringEnabled,
    manual_rule_acknowledgement: true,
    manual_rules_status: 'acknowledged' as const,
    binding_status: 'active' as const,
  };
}

export async function fetchActiveRuleBinding(input: {
  userId: string;
  tradingAccountId?: string | null;
  mt5ConnectionId?: string | null;
}) {
  let query = (supabase
    .from('account_rule_bindings' as any)
    .select('*')
    .eq('user_id', input.userId)
    .eq('binding_status', 'active') as any);

  if (input.tradingAccountId) {
    query = query.eq('trading_account_id', input.tradingAccountId);
  } else if (input.mt5ConnectionId) {
    query = query.eq('mt5_connection_id', input.mt5ConnectionId);
  } else {
    return null;
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as AccountRuleBindingRow | null;
}

export async function fetchActiveRuleBindings(userId: string) {
  const { data, error } = await (supabase
    .from('account_rule_bindings' as any)
    .select('*')
    .eq('user_id', userId)
    .eq('binding_status', 'active')
    .order('created_at', { ascending: false }) as any);

  if (error) throw error;
  return (data ?? []) as AccountRuleBindingRow[];
}
