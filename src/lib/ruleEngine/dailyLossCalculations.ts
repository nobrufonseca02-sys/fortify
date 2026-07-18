import {
  classifyLimitConsumption,
  finiteNumber,
  notMonitorableRule,
  parseRuleLimit,
  type BoundRuleEvaluation,
  type DailyRuleContextInput,
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
  context?: DailyRuleContextInput | null;
  now: Date;
}

function isValidTimezone(value?: string | null) {
  if (!value) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function dateKey(
  value: Date | string | null | undefined,
  timezone?: string | null,
) {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  if (isValidTimezone(timezone)) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(parsed);
      const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
      return `${values.year}-${values.month}-${values.day}`;
    } catch {
      // An invalid timezone must not break the account page.
    }
  }
  return parsed.toISOString().slice(0, 10);
}

function currentDailyLoss(input: DailyLossCalculationInput) {
  const timezone = input.context?.timezone;
  const today = dateKey(input.now, timezone);
  const todaySnapshot = input.snapshots.find(
    (snapshot) =>
      dateKey(snapshot.date ?? snapshot.createdAt, timezone) === today &&
      finiteNumber(snapshot.dailyPnl) !== null,
  );
  if (todaySnapshot) {
    return Math.max(0, -(finiteNumber(todaySnapshot.dailyPnl) ?? 0));
  }

  const explicitLoss = finiteNumber(input.dailyLossUsed);
  const resetDate = dateKey(input.dailyLossResetDate, timezone);
  if (explicitLoss !== null && resetDate === today) {
    return Math.max(0, explicitLoss);
  }

  if (!input.context?.historyComplete) return null;
  if (
    !['closed_pnl', 'closed_and_floating', 'equity'].includes(
      input.context.calculationBasis ?? '',
    )
  ) {
    return null;
  }

  const todayTrades = input.trades.filter(
    (trade) => dateKey(trade.closeTime, timezone) === today,
  );
  const closedPnl = todayTrades.reduce(
    (total, trade) =>
      total +
      (finiteNumber(trade.profit) ?? 0) +
      (finiteNumber(trade.commission) ?? 0) +
      (finiteNumber(trade.swap) ?? 0),
    0,
  );
  const includeFloating =
    input.context.calculationBasis === 'closed_and_floating' ||
    input.context.calculationBasis === 'equity';
  const floatingPnl = includeFloating
    ? input.positions.reduce(
        (total, position) => total + (finiteNumber(position.floatingPnl) ?? 0),
        0,
      )
    : 0;
  return Math.max(0, -(closedPnl + floatingPnl));
}

function dailyWindowDetail(context?: DailyRuleContextInput | null) {
  if (
    !isValidTimezone(context?.timezone) ||
    !/^\d{2}:\d{2}$/.test(context?.resetTime ?? '')
  ) {
    return 'Cálculo usando janela local estimada. Reset diário oficial não configurado.';
  }
  return `Janela diária: ${context.timezone}, reset ${context.resetTime}, base ${context.calculationBasis ?? 'não informada'}.`;
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
      'Histórico diário insuficiente para calcular esta regra com precisão.',
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
    detail: dailyWindowDetail(input.context),
  };
}
