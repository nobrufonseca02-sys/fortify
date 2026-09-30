import type {
  BoundRuleEvaluation,
  BoundRuleListItem,
  RuleEvaluationStatus,
} from '@/lib/ruleEngine/ruleEngineTypes';

/** Linha de `account_rule_evaluations` / `latest_account_rule_evaluations`. */
export interface CanonicalRuleEvaluationRow {
  id: string;
  user_id: string;
  trading_account_id: string;
  mt5_connection_id: string | null;
  binding_id: string;
  rule_snapshot_hash: string;
  rule_version_id: string;
  engine_version: string;
  overall_status: RuleEvaluationStatus;
  overall_message: string;
  automatic_rules: BoundRuleEvaluation[];
  manual_rules: BoundRuleListItem[];
  unsupported_rules: BoundRuleListItem[];
  not_calculated_rules: BoundRuleListItem[];
  alerts: string[];
  input_summary: Record<string, unknown>;
  evaluated_at: string;
}

/**
 * A avaliação só vale se foi calculada com o binding ativo agora. Depois de uma
 * troca de versão, a última linha ainda aponta para o snapshot antigo até o
 * próximo sync — nesse intervalo a conta fica "sem dados", não com o status velho.
 */
export function currentCanonicalEvaluation(
  row: CanonicalRuleEvaluationRow | null | undefined,
  activeBindingId: string | null | undefined,
) {
  if (!row || !activeBindingId) return null;
  return row.binding_id === activeBindingId ? row : null;
}

export interface CanonicalEvaluationSummary {
  overallStatus: RuleEvaluationStatus;
  dailyLoss: BoundRuleEvaluation | null;
  maxDrawdown: BoundRuleEvaluation | null;
  profitTarget: BoundRuleEvaluation | null;
  /** Maior consumo entre os limites de perda calculados (0-100+), ou null. */
  worstLossPercentage: number | null;
  evaluatedAt: string;
}

export function summarizeCanonicalEvaluation(row: CanonicalRuleEvaluationRow): CanonicalEvaluationSummary {
  const rules = Array.isArray(row.automatic_rules) ? row.automatic_rules : [];
  const byKey = (key: BoundRuleEvaluation['key']) => rules.find((rule) => rule.key === key) ?? null;
  const dailyLoss = byKey('daily_loss');
  const maxDrawdown = byKey('max_drawdown');
  const lossPercentages = [dailyLoss, maxDrawdown]
    .map((rule) => (rule && Number.isFinite(Number(rule.percentage)) ? Number(rule.percentage) : null))
    .filter((value): value is number => value !== null);
  return {
    overallStatus: row.overall_status,
    dailyLoss,
    maxDrawdown,
    profitTarget: byKey('profit_target'),
    worstLossPercentage: lossPercentages.length > 0 ? Math.max(...lossPercentages) : null,
    evaluatedAt: row.evaluated_at,
  };
}
