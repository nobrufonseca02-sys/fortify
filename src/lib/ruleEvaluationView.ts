import type { RuleEvaluationRow } from '@/hooks/useRuleEvaluations';
import type { RuleEvaluation, RuleType, TradingAccount } from '@/types/fortify';

const RULE_KEY_TO_TYPE: Record<string, RuleType> = {
  max_daily_loss: 'MAX_DAILY_LOSS',
  max_total_loss: 'MAX_TOTAL_LOSS',
  trailing_drawdown: 'TRAILING_MAX_LOSS',
  profit_target: 'PROFIT_TARGET',
  min_trading_days: 'MIN_TRADING_DAYS',
  profitable_days: 'MIN_TRADING_DAYS',
  consistency_best_day_cap: 'CONSISTENCY_BEST_DAY_CAP',
  inactivity_limit: 'INACTIVITY_LIMIT',
  news_restriction: 'NEWS_RESTRICTION_WINDOW',
  scalping_restriction: 'SCALPING_RULE',
};

export function mapRuleEvaluationRow(row: RuleEvaluationRow): RuleEvaluation {
  const definition = row.rule_instances?.rule_definitions || {};
  const ruleKey = String(definition.key || '');
  const type = RULE_KEY_TO_TYPE[ruleKey] || 'MAX_DAILY_LOSS';

  return {
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
    message: row.message || '',
    computedAt: row.computed_at,
  };
}

export function mapRowsForAccount(rows: RuleEvaluationRow[], accountId: string): RuleEvaluation[] {
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
  const riskEvals = evals.filter(e => ['MAX_DAILY_LOSS', 'MAX_TOTAL_LOSS', 'TRAILING_MAX_LOSS'].includes(e.rule.type));
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
    dailyRemaining,
    maxLossRemaining,
    closestRule,
    status,
    healthScore,
    avgRisk,
  };
}
