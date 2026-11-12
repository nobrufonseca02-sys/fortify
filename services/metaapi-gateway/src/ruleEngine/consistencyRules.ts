// Consistência das mesas, num só lugar para o site e para o EA.
//
// A regra vem estruturada do catálogo (criticalRules.consistency, conferida na
// fonte oficial). Vínculo antigo, sem o campo, cai na leitura do texto livre
// (consistencyForStage), que só entende "melhor dia sobre o lucro total".
//
// Cada tipo vira um número que o trader acompanha ao vivo:
// - teto de lucro de HOJE (melhor dia, teto diário);
// - teto de lucro do PRÓXIMO TRADE (maior trade);
// - contador de dias lucrativos.

import type { ConsistencyClause } from './bindingTypes';
import type { RuleEvaluationStatus } from './ruleEngineTypes';
export { consistencyClausesForStage } from './guardRules';

export interface ConsistencyData {
  initialBalance: number;
  /** Saldo fechado agora. */
  balance: number;
  /** P&L fechado por dia, incluindo hoje. */
  days: Array<{ date: string; pnl: number }>;
  /** Chave do dia de hoje no mesmo calendário de `days`. */
  today: string;
  /** Meta de lucro da fase, em dinheiro. */
  profitTargetAmount: number | null;
  /** Maior resultado de um trade fechado (null = desconhecido). */
  bestClosedTrade: number | null;
}

export type ConsistencyDisplay = 'daycap' | 'tradecap' | 'counter';

export interface ConsistencyResult {
  clause: ConsistencyClause;
  display: ConsistencyDisplay;
  status: RuleEvaluationStatus;
  /** daycap: lucro máximo de hoje. tradecap: lucro máximo do próximo trade. */
  cap: number | null;
  dayStartBalance: number | null;
  /** Lucro total que ainda falta para o melhor dia/trade caber na regra. */
  regularize: number | null;
  /** counter: dias cumpridos e exigidos. tradecap: maior trade até agora. */
  current: number | null;
  required: number | null;
  /** Para o site: valor medido e limite atual. */
  currentValue: number | null;
  limitValue: number | null;
  message: string;
}

const round2 = (value: number) => Math.round(value * 100) / 100;
const pct = (value: number) => `${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
const money = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function effectNote(clause: ConsistencyClause) {
  const parts = [
    clause.effect === 'blocks_payout' ? 'Trava o saque.' : '',
    clause.effect === 'blocks_pass' ? 'Trava a aprovação.' : '',
    clause.effect === 'soft' ? 'Não reprova, mas obriga a seguir operando.' : '',
    clause.effect === 'raises_target' ? 'Se passar, a meta sobe.' : '',
    clause.effect === 'caps_counted_profit' ? 'O excesso não conta para a meta.' : '',
    clause.condition ?? '',
    clause.estimated ? 'Estimativa: a mesa não detalha a fórmula.' : '',
  ];
  return parts.filter(Boolean).join(' ');
}

function todayParts(data: ConsistencyData) {
  const todayPnl = data.days.find((day) => day.date === data.today)?.pnl ?? 0;
  const dayStartBalance = data.balance - todayPnl;
  const bestPrevious = Math.max(0, ...data.days.filter((day) => day.date < data.today).map((day) => day.pnl));
  return { todayPnl, dayStartBalance, bestPrevious };
}

function bestDayVsTotal(clause: ConsistencyClause, data: ConsistencyData): ConsistencyResult | null {
  if (!clause.percent || clause.percent <= 0 || clause.percent >= 100) return null;
  const c = clause.percent / 100;
  const { dayStartBalance, bestPrevious } = todayParts(data);
  const profitBeforeToday = Math.max(0, dayStartBalance - data.initialBalance);
  // Hoje (P) cabe se P <= c * (lucro anterior + P)  =>  P <= c/(1-c) * lucro anterior.
  const cap = round2((c / (1 - c)) * profitBeforeToday);
  const totalNow = Math.max(0, data.balance - data.initialBalance);
  // Melhor dia anterior <= c * lucro total  =>  lucro total >= melhor dia / c.
  const regularize = bestPrevious > 0 && bestPrevious > c * totalNow ? round2(bestPrevious / c - totalNow) : null;
  const bestDay = Math.max(0, ...data.days.map((day) => day.pnl));
  return {
    clause,
    display: 'daycap',
    status: regularize ? 'warning' : 'safe',
    cap,
    dayStartBalance: round2(dayStartBalance),
    regularize,
    current: null,
    required: null,
    currentValue: round2(bestDay),
    limitValue: round2(c * totalNow),
    message: `Maior dia até ${pct(clause.percent)} do lucro total. ${effectNote(clause)}`.trim(),
  };
}

function bestDayVsTarget(clause: ConsistencyClause, data: ConsistencyData): ConsistencyResult | null {
  if (!clause.percent || !data.profitTargetAmount || data.profitTargetAmount <= 0) return null;
  const c = clause.percent / 100;
  const cap = round2(c * data.profitTargetAmount);
  const { dayStartBalance, bestPrevious } = todayParts(data);
  // Passou do teto: a meta vira melhor dia / c (ex.: Topstep).
  const raisedTarget = bestPrevious > cap ? round2(bestPrevious / c) : null;
  const bestDay = Math.max(0, ...data.days.map((day) => day.pnl));
  return {
    clause,
    display: 'daycap',
    status: raisedTarget ? 'warning' : 'safe',
    cap,
    dayStartBalance: round2(dayStartBalance),
    regularize: raisedTarget ? round2(raisedTarget - data.profitTargetAmount) : null,
    current: null,
    required: null,
    currentValue: round2(bestDay),
    limitValue: cap,
    message: `Maior dia até ${pct(clause.percent)} da meta (${money(cap)}). ${effectNote(clause)}`.trim(),
  };
}

function dailyProfitCap(clause: ConsistencyClause, data: ConsistencyData): ConsistencyResult | null {
  const cap =
    clause.amount && clause.amount > 0
      ? clause.amount
      : clause.percent && clause.percent > 0
        ? (clause.percent / 100) * data.initialBalance
        : null;
  if (!cap) return null;
  const { todayPnl, dayStartBalance } = todayParts(data);
  return {
    clause,
    display: 'daycap',
    status: todayPnl >= cap ? 'warning' : 'safe',
    cap: round2(cap),
    dayStartBalance: round2(dayStartBalance),
    regularize: null,
    current: null,
    required: null,
    currentValue: round2(Math.max(0, todayPnl)),
    limitValue: round2(cap),
    message: `Lucro do dia acima de ${money(cap)} não conta. ${effectNote(clause)}`.trim(),
  };
}

function profitableDays(clause: ConsistencyClause, data: ConsistencyData): ConsistencyResult | null {
  if (!clause.days || clause.days <= 0) return null;
  const threshold = clause.minDayProfitPercent ? (clause.minDayProfitPercent / 100) * data.initialBalance : 0;
  const count = data.days.filter((day) => day.pnl > 0 && day.pnl >= threshold).length;
  const thresholdText = threshold > 0 ? ` com lucro de ${pct(clause.minDayProfitPercent!)} ou mais` : ' com lucro';
  return {
    clause,
    display: 'counter',
    status: count >= clause.days ? 'safe' : 'partial',
    cap: null,
    dayStartBalance: null,
    regularize: null,
    current: count,
    required: clause.days,
    currentValue: count,
    limitValue: clause.days,
    message: `${clause.days} dias${thresholdText}. ${effectNote(clause)}`.trim(),
  };
}

function largestTrade(clause: ConsistencyClause, data: ConsistencyData): ConsistencyResult | null {
  if (!clause.percent || clause.percent <= 0 || clause.percent >= 100) return null;
  const c = clause.percent / 100;
  const net = Math.max(0, data.balance - data.initialBalance);
  // Próximo trade (T) cabe se T <= c * (lucro líquido + T)  =>  T <= c/(1-c) * lucro líquido.
  const cap = round2((c / (1 - c)) * net);
  const best = data.bestClosedTrade;
  const regularize = best !== null && best > 0 && best > c * net ? round2(best / c - net) : null;
  return {
    clause,
    display: 'tradecap',
    status: regularize ? 'warning' : 'safe',
    cap,
    dayStartBalance: null,
    regularize,
    current: best,
    required: null,
    currentValue: best,
    limitValue: round2(c * net),
    message: `Maior trade até ${pct(clause.percent)} do lucro líquido. ${effectNote(clause)}`.trim(),
  };
}

export function computeConsistency(clause: ConsistencyClause, data: ConsistencyData): ConsistencyResult | null {
  switch (clause.kind) {
    case 'best_day_vs_total_profit':
      return bestDayVsTotal(clause, data);
    case 'best_day_vs_profit_target':
      return bestDayVsTarget(clause, data);
    case 'daily_profit_cap':
      return dailyProfitCap(clause, data);
    case 'profitable_days':
      return profitableDays(clause, data);
    case 'largest_trade_vs_net_profit':
      return largestTrade(clause, data);
    default:
      return null;
  }
}

/**
 * A regra principal da fase (a que o trader acompanha ao vivo) e as demais como
 * texto curto. Ordem: o que trava o saque/aprovação vem antes do teto diário.
 */
export function primaryConsistency(clauses: ConsistencyClause[], data: ConsistencyData) {
  const order: Record<string, number> = {
    best_day_vs_total_profit: 0,
    largest_trade_vs_net_profit: 1,
    best_day_vs_profit_target: 2,
    daily_profit_cap: 3,
    profitable_days: 4,
  };
  const results = [...clauses]
    .sort((a, b) => (order[a.kind] ?? 9) - (order[b.kind] ?? 9))
    .map((clause) => computeConsistency(clause, data))
    .filter((result): result is ConsistencyResult => result !== null);
  if (results.length === 0) return null;
  const [main, ...rest] = results;
  const extra = rest.map((result) => result.message).join(' ');
  return { ...main, message: extra ? `${main.message} ${extra}` : main.message };
}
