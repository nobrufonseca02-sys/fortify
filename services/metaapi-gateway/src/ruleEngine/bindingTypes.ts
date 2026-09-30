// Contrato do snapshot versionado gravado em `account_rule_bindings`.
// Fica aqui, sem dependências, porque o motor de regras roda no gateway (que é
// implantado sozinho na VM) e também no frontend, que reexporta estes tipos a
// partir de `src/lib/ruleBinding.ts`.

export const RULE_BINDING_SCHEMA_VERSION = 'fortify.rule-binding.v1';

export interface RuleBindingPhase {
  id: string;
  label: string;
  profitTarget: string;
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
    phases: RuleBindingPhase[];
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
