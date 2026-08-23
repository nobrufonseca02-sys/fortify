import type { RuleEvaluationRow } from '@/hooks/useRuleEvaluations';
import type { Rule, RuleEvaluation, RuleType, TradingAccount } from '@/types/fortify';

// A rule key we cannot map to a known RuleType is NOT a daily-loss rule. It used
// to be silently coerced into 'MAX_DAILY_LOSS', which fed a foreign rule's
// current/limit values into the daily-loss and drawdown numbers on Dashboard and
// Performance. 'UNKNOWN' is deliberately outside RuleType so no `=== 'MAX_...'`
// lookup can ever match it: the row still shows up (its status is real and must
// not be hidden) but never supplies a number attributed to a category we did not
// actually recognise.
export type MappedRuleType = RuleType | 'UNKNOWN';

export interface MappedRuleEvaluation extends Omit<RuleEvaluation, 'rule'> {
  rule: Omit<Rule, 'type'> & { type: MappedRuleType };
  /** Raw rule_definitions.key, kept so callers can show what was unrecognised. */
  ruleKey: string;
}

export function isRecognizedRuleType(type: MappedRuleType): type is RuleType {
  return type !== 'UNKNOWN';
}

const RULE_KEY_TO_TYPE: Record<string, RuleType> = {
  max_daily_loss: 'MAX_DAILY_LOSS',
  daily_loss_percent: 'MAX_DAILY_LOSS',
  daily_loss_fixed: 'MAX_DAILY_LOSS',
  max_total_loss: 'MAX_TOTAL_LOSS',
  total_loss_percent: 'MAX_TOTAL_LOSS',
  total_loss_fixed: 'MAX_TOTAL_LOSS',
  static_drawdown: 'MAX_TOTAL_LOSS',
  trailing_drawdown: 'TRAILING_MAX_LOSS',
  end_of_day_trailing_drawdown: 'TRAILING_MAX_LOSS',
  intraday_equity_drawdown: 'TRAILING_MAX_LOSS',
  floating_loss_limit: 'MAX_TOTAL_LOSS',
  profit_target: 'PROFIT_TARGET',
  profit_target_percent: 'PROFIT_TARGET',
  profit_target_fixed: 'PROFIT_TARGET',
  min_trading_days: 'MIN_TRADING_DAYS',
  payout_min_days: 'MIN_TRADING_DAYS',
  profitable_days: 'MIN_TRADING_DAYS',
  min_profitable_days: 'MIN_TRADING_DAYS',
  consistency_best_day_cap: 'CONSISTENCY_BEST_DAY_CAP',
  consistency_percent: 'CONSISTENCY_BEST_DAY_CAP',
  trade_value_score_max_percent: 'CONSISTENCY_BEST_DAY_CAP',
  average_lot_limit: 'MAX_STACKING_TRADES',
  max_lot: 'MAX_STACKING_TRADES',
  stop_loss_required: 'MAX_STACKING_TRADES',
  inactivity_limit: 'INACTIVITY_LIMIT',
  inactivity_limit_days: 'INACTIVITY_LIMIT',
  news_restriction: 'NEWS_RESTRICTION_WINDOW',
  news_trading_block: 'NEWS_RESTRICTION_WINDOW',
  scalping_restriction: 'SCALPING_RULE',
  weekend_holding_block: 'SCALPING_RULE',
};

export function mapRuleEvaluationRow(row: RuleEvaluationRow): MappedRuleEvaluation {
  const definition = row.rule_instances?.rule_definitions || {};
  const ruleKey = String(definition.key || '');
  // No fallback category: an unmapped key stays 'UNKNOWN'. This happens for any
  // row without a matching rule_instances/rule_definitions record — including
  // every future binding-derived row.
  const type: MappedRuleType = RULE_KEY_TO_TYPE[ruleKey] || 'UNKNOWN';

  return {
    ruleKey,
    id: row.id,
    tradingAccountId: row.trading_account_id,
    ruleId: row.rule_instance_id,
    rule: {
      id: row.rule_instance_id,
      ruleSetId: row.rule_instances?.rule_set_version_id || '',
      type,
      name: definition.name || ruleKey || 'Regra',
      severity: row.rule_instances?.severity === 'soft' ? 'soft' : 'hard',
      params: row.rule_instances?.params || {},
      enabled: row.rule_instances?.enabled !== false,
      evaluationScope: row.computation_window,
    },
    status: row.status,
    progressPct: row.progress_pct ?? 0,
    currentValue: row.current_value ?? 0,
    limitValue: row.limit_value ?? 0,
    message: row.explanation || row.recommended_action || row.message || '',
    computedAt: row.computed_at,
  };
}

export function mapRowsForAccount(rows: RuleEvaluationRow[], accountId: string): MappedRuleEvaluation[] {
  return rows
    .filter(row => row.trading_account_id === accountId)
    .map(mapRuleEvaluationRow);
}

export function getAccountEvaluationSummary(account: TradingAccount, rows: RuleEvaluationRow[]) {
  const evals = mapRowsForAccount(rows, account.id);
  const dailyLoss = evals.find(e => e.rule.type === 'MAX_DAILY_LOSS');
  const totalLoss = evals.find(e => e.rule.type === 'MAX_TOTAL_LOSS') || evals.find(e => e.rule.type === 'TRAILING_MAX_LOSS');
  const profitTarget = evals.find(e => e.rule.type === 'PROFIT_TARGET');
  const dailyRemaining = dailyLoss ? Math.max(0, dailyLoss.limitValue - dailyLoss.currentValue) : 0;
  const maxLossRemaining = totalLoss ? Math.max(0, totalLoss.limitValue - totalLoss.currentValue) : 0;
  // Only recognised risk categories feed the risk aggregates. An 'UNKNOWN' row
  // has no trustworthy category, so it must not move healthScore/avgRisk.
  const riskEvals = evals.filter(e => ['MAX_DAILY_LOSS', 'MAX_TOTAL_LOSS', 'TRAILING_MAX_LOSS'].includes(e.rule.type));
  // ...but it is still a real evaluation, so it is surfaced here rather than
  // dropped, and its VIOLATED/WARNING status below still counts.
  const unrecognizedEvals = evals.filter(e => !isRecognizedRuleType(e.rule.type));
  const closestRule = riskEvals.length > 0 ? riskEvals.reduce((a, b) => a.progressPct > b.progressPct ? a : b) : null;
  const hasViolation = evals.some(e => e.status === 'VIOLATED');
  const hasWarning = evals.some(e => e.status === 'WARNING');
  const status = hasViolation ? 'VIOLATED' as const : hasWarning ? 'WARNING' as const : 'SAFE' as const;
  const avgRisk = riskEvals.length > 0 ? riskEvals.reduce((s, e) => s + e.progressPct, 0) / riskEvals.length : 0;
  const healthScore = Math.max(0, Math.round(100 - avgRisk));

  return {
    evals,
    dailyLoss,
    totalLoss,
    profitTarget,
    unrecognizedEvals,
    dailyRemaining,
    maxLossRemaining,
    closestRule,
    status,
    healthScore,
    avgRisk,
  };
}
