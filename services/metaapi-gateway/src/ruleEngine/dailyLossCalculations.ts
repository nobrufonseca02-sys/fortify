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
  // `null` = posições não carregadas (desconhecidas); `[]` = sem posição aberta.
  positions: RuleEnginePositionInput[] | null;
  context?: DailyRuleContextInput | null;
  now: Date;
}

interface DailyWindow {
  timezone: string | null;
  resetMinutes: number;
  // Só é confirmada quando timezone e horário de reset oficiais vieram no contexto.
  confirmed: boolean;
}

function isValidTimezone(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function resolveWindow(context: DailyRuleContextInput | null | undefined): DailyWindow {
  const timezone = isValidTimezone(context?.timezone) ? context?.timezone ?? null : null;
  const match = /^(\d{2}):(\d{2})$/.exec(context?.resetTime ?? '');
  const hours = match ? Number(match[1]) : NaN;
  const minutes = match ? Number(match[2]) : NaN;
  const validReset = match !== null && hours < 24 && minutes < 60;
  return {
    timezone,
    resetMinutes: validReset ? hours * 60 + minutes : 0,
    confirmed: timezone !== null && validReset,
  };
}

// Dia regulatório de um instante: data no fuso da janela, recuada um dia quando
// o horário local ainda não chegou no reset.
function windowDateKey(value: Date | string | null | undefined, window: DailyWindow) {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  let year = parsed.getUTCFullYear();
  let month = parsed.getUTCMonth() + 1;
  let day = parsed.getUTCDate();
  let minuteOfDay = parsed.getUTCHours() * 60 + parsed.getUTCMinutes();
  if (window.timezone) {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-US', {
        timeZone: window.timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      })
        .formatToParts(parsed)
        .map((part) => [part.type, part.value]),
    );
    year = Number(parts.year);
    month = Number(parts.month);
    day = Number(parts.day);
    minuteOfDay = Number(parts.hour) * 60 + Number(parts.minute);
  }

  const shifted = new Date(Date.UTC(year, month - 1, minuteOfDay < window.resetMinutes ? day - 1 : day));
  return shifted.toISOString().slice(0, 10);
}

// A linha diária de `mt5_account_snapshots` é agregada por dia UTC (00:00).
// Só coincide com a janela da mesa quando ela também é UTC com reset à meia-noite.
function snapshotMatchesWindow(window: DailyWindow) {
  if (!window.confirmed) return true; // estimativa — o resultado sai como parcial
  return window.resetMinutes === 0 && (window.timezone === 'UTC' || window.timezone === 'Etc/UTC');
}

interface DailyLossMeasurement {
  loss: number;
  includesFloating: boolean;
  floatingKnown: boolean;
}

function measureDailyLoss(input: DailyLossCalculationInput, window: DailyWindow): DailyLossMeasurement | null {
  const today = windowDateKey(input.now, window);
  const latestSnapshot = input.snapshots[0] ?? null;

  let closedPnl: number | null = null;
  if (snapshotMatchesWindow(window)) {
    const todaySnapshot = input.snapshots.find(
      (snapshot) =>
        windowDateKey(snapshot.date ?? snapshot.createdAt, window) === today &&
        finiteNumber(snapshot.dailyPnl) !== null,
    );
    if (todaySnapshot) closedPnl = finiteNumber(todaySnapshot.dailyPnl);
  }

  if (closedPnl === null) {
    const explicitLoss = finiteNumber(input.dailyLossUsed);
    const resetDate = windowDateKey(input.dailyLossResetDate, window);
    if (explicitLoss !== null && resetDate === today) closedPnl = -Math.max(0, explicitLoss);
  }

  if (closedPnl === null && input.context?.historyComplete) {
    closedPnl = input.trades
      .filter((trade) => windowDateKey(trade.closeTime, window) === today)
      .reduce(
        (total, trade) =>
          total +
          (finiteNumber(trade.profit) ?? 0) +
          (finiteNumber(trade.commission) ?? 0) +
          (finiteNumber(trade.swap) ?? 0),
        0,
      );
  }

  if (closedPnl === null) return null;

  const basis = input.context?.calculationBasis ?? 'unknown';
  if (basis === 'closed_pnl' || basis === 'balance') {
    return { loss: Math.max(0, -closedPnl), includesFloating: false, floatingKnown: true };
  }

  // Várias fontes para o flutuante; fica a mais negativa (pior caso).
  const floatingCandidates: number[] = [];
  if (input.positions && input.positions.length > 0) {
    floatingCandidates.push(
      input.positions.reduce((total, position) => total + (finiteNumber(position.floatingPnl) ?? 0), 0),
    );
  }
  const snapshotFloating = finiteNumber(latestSnapshot?.floatingPnl);
  if (snapshotFloating !== null) floatingCandidates.push(snapshotFloating);
  const latestEquity = finiteNumber(latestSnapshot?.equity);
  const latestBalance = finiteNumber(latestSnapshot?.balance);
  if (latestEquity !== null && latestBalance !== null) floatingCandidates.push(latestEquity - latestBalance);

  let floating: number | null = floatingCandidates.length > 0 ? Math.min(...floatingCandidates) : null;
  if (floating === null && input.positions !== null && input.positions.length === 0) floating = 0;

  if (floating === null) {
    return { loss: Math.max(0, -closedPnl), includesFloating: false, floatingKnown: false };
  }

  // Base declarada por equity: o flutuante positivo compensa. Base desconhecida:
  // só o prejuízo flutuante entra (critério conservador), nunca o lucro aberto.
  const counted = basis === 'equity' || basis === 'closed_and_floating' ? floating : Math.min(0, floating);
  return { loss: Math.max(0, -(closedPnl + counted)), includesFloating: true, floatingKnown: true };
}

function windowDetail(window: DailyWindow, measurement: DailyLossMeasurement, basis: string) {
  const parts: string[] = [];
  parts.push(
    window.confirmed
      ? `Janela diária: ${window.timezone}, reset ${String(Math.floor(window.resetMinutes / 60)).padStart(2, '0')}:${String(window.resetMinutes % 60).padStart(2, '0')}.`
      : 'Janela diária estimada em UTC: o horário oficial de reset da mesa não está confirmado no snapshot.',
  );
  if (!measurement.floatingKnown) {
    parts.push('Prejuízo flutuante das posições abertas não disponível.');
  } else if (measurement.includesFloating) {
    parts.push(
      basis === 'equity' || basis === 'closed_and_floating'
        ? 'Inclui o P&L flutuante das posições abertas (base por equity).'
        : 'Inclui o prejuízo flutuante das posições abertas (critério conservador).',
    );
  } else {
    parts.push('Considera apenas o P&L fechado (base declarada pela regra).');
  }
  return parts.join(' ');
}

export function evaluateDailyLoss(input: DailyLossCalculationInput): BoundRuleEvaluation {
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

  const window = resolveWindow(input.context);
  const measurement = measureDailyLoss(input, window);
  if (measurement === null) {
    return notMonitorableRule(
      'daily_loss',
      'Perda diária',
      input.ruleText,
      input.currency,
      window.confirmed && !snapshotMatchesWindow(window)
        ? 'Histórico insuficiente para calcular a perda na janela diária oficial da mesa.'
        : 'Histórico diário insuficiente para calcular esta regra com precisão.',
    );
  }

  const currentValue = measurement.loss;
  const consumption = classifyLimitConsumption(currentValue, limit.amount);
  const percentage = (currentValue / limit.amount) * 100;
  const basis = input.context?.calculationBasis ?? 'unknown';
  const confirmed = window.confirmed && measurement.floatingKnown;
  // Alertas valem mesmo com premissa incerta; só a conclusão "seguro" exige
  // janela e flutuante confirmados.
  const status = consumption === 'safe' && !confirmed ? 'partial' : consumption;
  const percentText = `${percentage.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% do limite diário consumido`;

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
        : status === 'partial'
          ? `Verificação parcial: ${percentText}. Não confirma conta segura.`
          : `${percentText}.`,
    detail: windowDetail(window, measurement, basis),
  };
}
