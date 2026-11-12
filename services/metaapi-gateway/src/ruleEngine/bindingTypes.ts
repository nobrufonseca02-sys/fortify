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

/**
 * Consistência estruturada, conferida na fonte oficial da mesa. Substitui a
 * leitura do texto livre `consistencyRule` quando presente (vínculos antigos não
 * têm este campo e seguem pelo texto).
 *
 * - best_day_vs_total_profit: maior dia <= X% do lucro total.
 * - best_day_vs_profit_target: maior dia <= X% da meta de lucro.
 * - largest_trade_vs_net_profit: maior trade <= X% do lucro líquido.
 * - daily_profit_cap: lucro do dia acima de X (valor ou % do saldo inicial) não conta.
 * - profitable_days: N dias com lucro >= Y% do saldo inicial.
 */
export type ConsistencyKind =
  | 'best_day_vs_total_profit'
  | 'best_day_vs_profit_target'
  | 'largest_trade_vs_net_profit'
  | 'daily_profit_cap'
  | 'profitable_days';

export type ConsistencyEffect =
  | 'blocks_pass'
  | 'blocks_payout'
  | 'raises_target'
  | 'soft'
  | 'caps_counted_profit'
  /** Passou do teto, a mesa trava as operações até o dia seguinte. */
  | 'locks_trading';

export interface ConsistencyClause {
  appliesTo: 'evaluation' | 'funded' | 'both';
  kind: ConsistencyKind;
  /** Percentual (40 = 40%). */
  percent: number | null;
  /** Valor fixo na moeda da conta. */
  amount: number | null;
  /** profitable_days: dias exigidos. */
  days: number | null;
  /** profitable_days: lucro mínimo do dia em % do saldo inicial. */
  minDayProfitPercent: number | null;
  effect: ConsistencyEffect;
  /** Condição curta em português (ex.: "só com o add-on de saque on-demand"). */
  condition: string | null;
  /** A fonte oficial não define a fórmula inteira: o Fortify mostra como estimativa. */
  estimated: boolean;
  /** Trecho literal da fonte oficial. */
  officialText: string;
  sourceUrl: string;
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
    /** Ausente em vínculos antigos. Lista vazia = a mesa não tem consistência. */
    consistency?: ConsistencyClause[];
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
