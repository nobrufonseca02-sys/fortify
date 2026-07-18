import {
  classifyLimitConsumption,
  finiteNumber,
  notMonitorableRule,
  parseRuleLimit,
  type BoundRuleEvaluation,
  type RuleEnginePositionInput,
  type RuleEngineSnapshotInput,
  type RuleEngineTradeInput,
} from './ruleEngineTypes';

interface DailyLossCalculationInput {
  ruleText: string;
  initialBalance: number | null;
  currency: string;
  dailyLossUsed?: number | null;
  dailyLossResetDate?: string | null;
  snapshots: RuleEngineSnapshotInput[];
  trades: RuleEngineTradeInput[];
  positions: RuleEnginePositionInput[];
  now: Date;
}

function dateKey(value: Date | string | null | undefined) {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function currentDailyLoss(input: DailyLossCalculationInput) {
  const today = dateKey(input.now);
  const todaySnapshot = input.snapshots.find(
    (snapshot) =>
      dateKey(snapshot.date ?? snapshot.createdAt) === today &&
      finiteNumber(snapshot.dailyPnl) !== null,
  );
  if (todaySnapshot) {
    return Math.max(0, -(finiteNumber(todaySnapshot.dailyPnl) ?? 0));
  }

  const explicitLoss = finiteNumber(input.dailyLossUsed);
  const resetDate = dateKey(input.dailyLossResetDate);
  if (explicitLoss !== null && (!resetDate || resetDate === today)) {
    return Math.max(0, explicitLoss);
  }

  const todayTrades = input.trades.filter(
    (trade) => dateKey(trade.closeTime) === today,
  );
  if (todayTrades.length === 0 && input.positions.length === 0) return null;

  const closedPnl = todayTrades.reduce(
    (total, trade) =>
      total +
      (finiteNumber(trade.profit) ?? 0) +
      (finiteNumber(trade.commission) ?? 0) +
      (finiteNumber(trade.swap) ?? 0),
    0,
  );
  const floatingPnl = input.positions.reduce(
    (total, position) => total + (finiteNumber(position.floatingPnl) ?? 0),
    0,
  );
  return Math.max(0, -(closedPnl + floatingPnl));
}

export function evaluateDailyLoss(
  input: DailyLossCalculationInput,
): BoundRuleEvaluation {
  const limit = parseRuleLimit(input.ruleText, input.initialBalance);
  if (!limit) {
    return notMonitorableRule(
      'daily_loss',
      'Perda diária',
      input.ruleText,
      input.currency,
      'O snapshot não informa um limite diário numérico confiável.',
    );
  }

  const currentValue = currentDailyLoss(input);
  if (currentValue === null) {
    return notMonitorableRule(
      'daily_loss',
      'Perda diária',
      input.ruleText,
      input.currency,
      'Não há P&L diário sincronizado para calcular o consumo do limite.',
    );
  }

  const status = classifyLimitConsumption(currentValue, limit.amount);
  const percentage = (currentValue / limit.amount) * 100;
  return {
    key: 'daily_loss',
    label: 'Perda diária',
    status,
    monitorability: 'automatic_mt5',
    sourceRule: input.ruleText,
    currentValue,
    limitValue: limit.amount,
    remainingValue: Math.max(0, limit.amount - currentValue),
    percentage,
    currency: input.currency,
    message:
      status === 'breached'
        ? 'O limite de perda diária foi atingido ou ultrapassado.'
        : `${percentage.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% do limite diário consumido.`,
  };
}
