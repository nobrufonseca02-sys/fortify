// Fortify Guard: o EA do MetaTrader 5 que mostra, ao vivo na tela do trader, as
// regras da mesa vinculadas à conta no Fortify.
//
// O EA manda o que o terminal sabe na hora (saldo, equity, P&L fechado por dia).
// O gateway roda o MESMO motor de regras do Fortify sobre esses números e devolve,
// para cada regra, um valor de referência fixo (a equity mínima do dia, o piso do
// drawdown, o saldo da meta, o teto de lucro de hoje). Entre uma consulta e outra o
// EA só compara o equity do tick com esse valor, sem refazer a regra.
//
// Regra que o motor não calcula com segurança para a mesa vira lembrete de texto,
// nunca um número chutado (mesma disciplina de consistencyCalculations.ts).

import { evaluateBoundAccountRules } from './ruleEngine/evaluateAccountRules';
import type { AccountRuleBindingRow } from './ruleEngine/bindingTypes';
import {
  finiteNumber,
  isExplicitRuleValue,
  normalizeRuleText,
  parseInitialBalance,
  type BoundAccountRuleEvaluation,
  type BoundRuleEvaluation,
  type EvaluateBoundAccountRulesInput,
  type RuleEvaluationStatus,
} from './ruleEngine/ruleEngineTypes';
import { consistencyClausesForStage, primaryConsistency } from './ruleEngine/consistencyRules';
import { applyDrawdownLocks, drawdownLockFloor, payoutStateOf } from './ruleEngine/drawdownCalculations';
import { resolveEaDay, zoneTransitions } from './eaDayBoundary';
import {
  defaultGuardRuleKeys,
  floatingLossPercent,
  forcedCloseForStage,
  guardRuleOptions,
  inactivityDays,
  inferStage,
  isGuardRuleKey,
  lotLimitFor,
  openRiskPercent,
  type AccountStage,
  type GuardGroup,
  type GuardRuleKey,
  type GuardRuleOption,
} from './ruleEngine/guardRules';

export const EA_PROTOCOL_VERSION = 1;
export const EA_POLL_SECONDS = 15;

export type EaRuleKey = GuardRuleKey;
export const isEaRuleKey = isGuardRuleKey;

export interface EaDayInput {
  /** Dia UTC, AAAA-MM-DD. */
  date: string;
  /** P&L fechado do dia (lucro + comissão + swap). */
  pnl: number;
  /** Saldo no fim do dia (ou o saldo atual, para hoje). */
  eodBalance: number;
  /** Houve negociação no dia. */
  traded: boolean;
}

export interface EaLiveInput {
  balance: number;
  equity: number;
  /** Histórico diário do terminal, incluindo hoje. */
  days: EaDayInput[];
  /** Maior equity que o EA já viu nesta conta (pico intradiário para trailing). */
  peakEquity?: number | null;
  /** Maior resultado de um trade fechado no histórico do terminal (EA 1.50+). */
  bestTrade?: number | null;
  /** EA 1.72+: calendário em que o EA agrupou os dias e o dia de hoje nesse calendário. */
  dayBasis?: string | null;
  dayToday?: string | null;
  /** EA 1.72+: saques no histórico do terminal e o dia do último. */
  payouts?: number | null;
  lastPayoutDate?: string | null;
  now: Date;
}

export interface EaAccountContext {
  startBalance: number | null;
  highestEquity: number | null;
  phase: string | null;
  /** Fase escolhida pelo trader no Fortify Guard (consistência por fase). */
  stage?: AccountStage | null;
}

export interface EaPreferences {
  /** null = padrão: tudo que zera a conta ou trava o saque, sem os lembretes. */
  ruleKeys: EaRuleKey[] | null;
  /** null = deduz pelo programa (instant/funded já começa em funded). */
  stage: AccountStage | null;
  warningPct: number;
  criticalPct: number;
}

export type EaRuleKind = 'floor' | 'target' | 'daycap' | 'tradecap' | 'counter' | 'idle' | 'close' | 'lots' | 'floating' | 'risk' | 'note';
export type EaMetric = 'equity' | 'balance' | 'min' | 'utc' | 'server';

export interface EaRule {
  key: EaRuleKey;
  label: string;
  kind: EaRuleKind;
  status: RuleEvaluationStatus;
  message: string;
  /** Limite em dinheiro (ou em dias, para `counter`). */
  limit: number | null;
  /** floor: valor da métrica em que a regra quebra. */
  floor?: number;
  metric?: EaMetric;
  /** floor trailing: o piso sobe junto com o pico desta métrica. */
  trailing?: 'equity' | 'balance' | null;
  /** Teto do piso trailing (trava no saldo inicial). */
  floorMax?: number | null;
  /** target: saldo em que a meta é batida. */
  targetBalance?: number;
  /** daycap: saldo no início do dia e lucro máximo de hoje. */
  dayStartBalance?: number;
  todayCap?: number;
  /** daycap: lucro total que ainda falta para o melhor dia anterior caber na regra. */
  regularizeProfit?: number | null;
  /** counter / idle: valor atual e exigido. */
  current?: number | null;
  required?: number | null;
  /** close: weekly | daily. lots: total | per_order. */
  mode?: string;
  /** close: minuto do dia do fechamento (UTC ou servidor, ver `metric`). */
  param1?: number | null;
  group?: GuardGroup;
}

export interface EaFeed {
  firmName: string;
  programName: string;
  accountSizeLabel: string;
  currency: string;
  overallStatus: RuleEvaluationStatus;
  stage: AccountStage;
  warningPct: number;
  criticalPct: number;
  pollSeconds: number;
  /** Hora em que esta mesa vira o dia: o EA agrupa o histórico por ela. */
  dayBoundary?: { token: string; resetMinutes: number; exact: boolean; transitions: Array<[number, number]> };
  rules: EaRule[];
  /** Todas as regras da mesa para a aba Configurações do EA, com o que está ligado. */
  options: EaOption[];
  /** Aviso curto para o painel (ex.: a escolha feita no MT5 não foi salva). */
  notice?: string;
}

export interface EaOption {
  key: EaRuleKey;
  label: string;
  group: GuardGroup;
  live: boolean;
  on: boolean;
  /** O valor exato da regra nesta conta, já calculado. Ex.: "6% ($6.000)". */
  detail: string;
}

const MAX_DAYS = 400;

/** Valida e limpa o histórico vindo do terminal (entrada não confiável). */
export function sanitizeEaDays(raw: unknown): EaDayInput[] {
  if (!Array.isArray(raw)) return [];
  const byDate = new Map<string, EaDayInput>();
  for (const item of raw.slice(0, MAX_DAYS * 2)) {
    const date = String((item as any)?.date ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const pnl = finiteNumber((item as any)?.pnl);
    const eodBalance = finiteNumber((item as any)?.eodBalance);
    if (pnl === null || eodBalance === null) continue;
    byDate.set(date, { date, pnl, eodBalance, traded: Boolean((item as any)?.traded) });
  }
  return [...byDate.values()].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, MAX_DAYS);
}

/** Dados de calendário e saque enviados pelo EA 1.72+ (entrada não confiável). */
export function sanitizeEaDayInfo(body: Record<string, unknown>) {
  const payouts = Number(body.payouts);
  const lastPayout = String(body.lastPayout ?? '');
  return {
    dayBasis: typeof body.dayBasis === 'string' ? body.dayBasis.slice(0, 64) : null,
    dayToday: typeof body.dayToday === 'string' ? body.dayToday.slice(0, 10) : null,
    payouts: body.payouts !== undefined && body.payouts !== null && Number.isInteger(payouts) && payouts >= 0 ? payouts : null,
    lastPayoutDate: /^\d{4}-\d{2}-\d{2}$/.test(lastPayout) ? lastPayout : null,
  };
}

function eaDay(binding: AccountRuleBindingRow, live: EaLiveInput) {
  return resolveEaDay(binding.rule_snapshot.propFirm?.slug, live);
}

/**
 * Monta a entrada do motor só com dados do terminal: snapshots[0] é hoje, ao vivo.
 * Assim o EA funciona mesmo em conta sem conexão MetaApi.
 */
export function buildEaEngineInput(
  binding: AccountRuleBindingRow,
  account: EaAccountContext,
  live: EaLiveInput,
): EvaluateBoundAccountRulesInput {
  const day = eaDay(binding, live);
  const today = day.today;
  const history = live.days.filter((item) => item.date < today);
  const todayDay = live.days.find((item) => item.date === today);
  const floating = live.equity - live.balance;

  const snapshots = [
    {
      date: today,
      balance: live.balance,
      equity: live.equity,
      dailyPnl: todayDay?.pnl ?? 0,
      floatingPnl: floating,
      maxBalance: null,
    },
    ...history.map((item) => ({
      date: item.date,
      balance: item.eodBalance,
      equity: item.eodBalance,
      dailyPnl: item.pnl,
      floatingPnl: 0,
      maxBalance: null,
    })),
  ];

  const trades = live.days
    .filter((item) => item.traded)
    .map((item) => ({ profit: item.pnl, commission: 0, swap: 0, closeTime: `${item.date}T12:00:00.000Z` }));

  const knownPeaks = [account.highestEquity, live.peakEquity, live.equity, ...history.map((item) => item.eodBalance)]
    .map((value) => finiteNumber(value))
    .filter((value): value is number => value !== null && value > 0);

  return {
    binding,
    account: {
      startBalance: account.startBalance,
      currentBalance: live.balance,
      currentEquity: live.equity,
      highestEquity: knownPeaks.length > 0 ? Math.max(...knownPeaks) : null,
      phase: account.phase,
      // O EA sempre sabe a fase: escolhida pelo trader ou deduzida do programa.
      stage: account.stage ?? inferStage(binding.rule_snapshot),
      // Explícito (mesmo null): os "trades" abaixo são somas por dia, não servem para o maior trade.
      bestClosedTrade: finiteNumber(live.bestTrade ?? null),
      payoutsMade: live.payouts ?? null,
      lastPayoutDate: live.lastPayoutDate ?? null,
    },
    snapshots,
    trades,
    positions: [{ floatingPnl: floating }],
    // Os dias já vêm no calendário da mesa: o motor só precisa saber qual é o dia de hoje.
    now: day.aligned ? new Date(`${today}T12:00:00.000Z`) : live.now,
    dailyRuleContext: day.aligned && day.boundary.exact ? { timezone: 'UTC', resetTime: '00:00' } : undefined,
  };
}

export function evaluateForEa(
  binding: AccountRuleBindingRow,
  account: EaAccountContext,
  live: EaLiveInput,
): BoundAccountRuleEvaluation {
  return evaluateBoundAccountRules(buildEaEngineInput(binding, account, live));
}

const round2 = (value: number) => Math.round(value * 100) / 100;

const NO_RULE_MARKERS = ['sem regra', 'sem consistencia', 'nao possui', 'sem minimo', 'nao exige'];

function noteFromEngine(key: EaRuleKey, rule: BoundRuleEvaluation): EaRule {
  // Mesa sem a regra nesta fase: diz isso direto, sem o texto de "não calculável".
  if (NO_RULE_MARKERS.some((marker) => normalizeRuleText(rule.sourceRule).includes(marker))) {
    return { key, label: rule.label, kind: 'note', status: 'safe', message: rule.sourceRule, limit: null };
  }
  return {
    key,
    label: rule.label,
    kind: 'note',
    status: rule.status,
    message: `${rule.message} Regra oficial: ${rule.sourceRule || 'não informada'}.`,
    limit: null,
  };
}

function trailingSource(binding: AccountRuleBindingRow): 'equity' | 'balance' | null {
  const type = normalizeRuleText(binding.rule_snapshot.criticalRules.drawdownType);
  const calculation = normalizeRuleText(binding.rule_snapshot.criticalRules.drawdownCalculation);
  // Mesma classificação de drawdownCalculations.ts. EOD só sobe no fechamento do
  // dia, então para o EA o piso fica parado até a próxima consulta do dia seguinte.
  const isTrailing =
    type === 'trailing' || type === 'intraday' || calculation.includes('high-water') || calculation.includes('high water');
  if (!isTrailing) return null;
  return type === 'intraday' || calculation.includes('equity') || calculation.includes('intraday') ? 'equity' : 'balance';
}

// Referência do drawdown com a mesma escolha de drawdownCalculations.ts. Só é usada
// quando a conta está acima da referência: aí o motor zera o consumo e a folga dele
// não diz onde fica o piso.
function drawdownReference(
  binding: AccountRuleBindingRow,
  engineInput: EvaluateBoundAccountRulesInput,
  initialBalance: number | null,
  limit: number,
): number | null {
  const type = normalizeRuleText(binding.rule_snapshot.criticalRules.drawdownType);
  const calculation = normalizeRuleText(binding.rule_snapshot.criticalRules.drawdownCalculation);
  const snapshots = engineInput.snapshots ?? [];
  const highest = (useEquity: boolean) => {
    const values = snapshots
      .flatMap((s) => [finiteNumber(useEquity ? s.equity : s.balance), finiteNumber(s.maxBalance)])
      .filter((value): value is number => value !== null && value > 0);
    return values.length > 0 ? Math.max(...values) : null;
  };
  let reference: number | null = null;
  if (type === 'static' || type === 'estatico') reference = initialBalance;
  else if (type === 'eod') reference = highest(false);
  else {
    const source = trailingSource(binding);
    if (source === 'equity') reference = finiteNumber(engineInput.account?.highestEquity) ?? highest(true);
    else if (source === 'balance') reference = highest(false);
  }
  // O pico nunca fica abaixo do saldo inicial (mesma regra de drawdownCalculations.ts).
  if (reference !== null && initialBalance !== null) reference = Math.max(reference, initialBalance);
  if (reference === null) return null;
  return applyDrawdownLocks(reference, {
    calculation,
    initialBalance,
    limit,
    payoutState: payoutStateOf(engineInput.account),
  });
}

function floorRule(
  key: 'daily_loss' | 'max_drawdown',
  rule: BoundRuleEvaluation,
  live: EaLiveInput,
  binding: AccountRuleBindingRow,
  engineInput: EvaluateBoundAccountRulesInput,
  initialBalance: number | null,
): EaRule {
  // O motor mede as duas regras sobre min(saldo, equity): prejuízo flutuante conta,
  // lucro flutuante não. O piso é o valor dessa métrica em que a folga zera.
  const metricNow = Math.min(live.balance, live.equity);
  const limit = rule.limitValue ?? 0;
  let floor: number;
  if ((rule.currentValue ?? 0) > 0) {
    // Referência (métrica + consumo) menos o limite: continua certo com o limite estourado.
    floor = metricNow + (rule.currentValue ?? 0) - limit;
  } else if (key === 'daily_loss') {
    // Dia no zero ou no lucro: quebra quando o saldo do início do dia cai o limite.
    const today = eaDay(binding, live).today;
    const todayPnl = live.days.find((day) => day.date === today)?.pnl ?? 0;
    floor = live.balance - todayPnl - limit;
  } else {
    const reference = drawdownReference(binding, engineInput, initialBalance, limit);
    floor = reference !== null ? reference - limit : metricNow - (rule.remainingValue ?? 0);
  }
  floor = round2(floor);
  const trailing = key === 'max_drawdown' ? trailingSource(binding) : null;
  const lockFloor = drawdownLockFloor(binding.rule_snapshot.criticalRules.drawdownCalculation, initialBalance);
  const dayNote = key === 'daily_loss' ? eaDay(binding, live).boundary.note : '';
  return {
    key,
    label: rule.label,
    kind: 'floor',
    status: rule.status,
    message: dayNote ? `${rule.message} ${dayNote}` : rule.message,
    limit: rule.limitValue,
    floor,
    metric: 'min',
    trailing,
    floorMax: trailing && lockFloor !== null ? round2(lockFloor) : null,
  };
}

function daysBetween(fromDate: string, todayKey: string) {
  const from = Date.parse(`${fromDate}T00:00:00.000Z`);
  const today = Date.parse(`${todayKey}T00:00:00.000Z`);
  return Math.max(0, Math.round((today - from) / 86_400_000));
}

function noteFromOption(option: GuardRuleOption): EaRule {
  return { key: option.key, label: option.label, kind: 'note', status: 'safe', message: option.officialText, limit: null };
}

interface RuleContext {
  binding: AccountRuleBindingRow;
  evaluation: BoundAccountRuleEvaluation;
  live: EaLiveInput;
  engineInput: EvaluateBoundAccountRulesInput;
  initialBalance: number | null;
  stage: AccountStage;
}

function engineOrNote(option: GuardRuleOption, engineRule: BoundRuleEvaluation | undefined) {
  if (!engineRule) return noteFromOption(option);
  if (engineRule.status === 'not_monitorable' || engineRule.status === 'pending_binding') {
    return noteFromEngine(option.key, engineRule);
  }
  return null;
}

function buildRule(option: GuardRuleOption, ctx: RuleContext): EaRule {
  const { binding, evaluation, live, engineInput, initialBalance, stage } = ctx;
  const rules = binding.rule_snapshot.criticalRules;
  const engineRule = evaluation.automaticRules.find((rule) => rule.key === option.key);
  if (!option.live) return noteFromOption(option);

  switch (option.key) {
    case 'daily_loss':
    case 'max_drawdown': {
      const fallback = engineOrNote(option, engineRule);
      if (fallback || !engineRule) return fallback ?? noteFromOption(option);
      return floorRule(option.key, engineRule, live, binding, engineInput, initialBalance);
    }
    case 'profit_target': {
      const fallback = engineOrNote(option, engineRule);
      if (fallback || !engineRule) return fallback ?? noteFromOption(option);
      return {
        key: 'profit_target',
        label: engineRule.phaseLabel ? `${engineRule.label} (${engineRule.phaseLabel})` : engineRule.label,
        kind: 'target',
        status: engineRule.status,
        message: engineRule.message,
        limit: engineRule.limitValue,
        // Saldo inicial + meta: com a conta no prejuízo, o que falta inclui recuperar a perda.
        targetBalance: round2(
          initialBalance !== null && engineRule.limitValue !== null
            ? initialBalance + engineRule.limitValue
            : live.balance + (engineRule.remainingValue ?? 0),
        ),
      };
    }
    case 'min_trading_days': {
      const fallback = engineOrNote(option, engineRule);
      if (fallback || !engineRule) return fallback ?? noteFromOption(option);
      return {
        key: 'min_trading_days',
        label: engineRule.label,
        kind: 'counter',
        status: engineRule.status,
        message: engineRule.message,
        limit: engineRule.limitValue,
        current: engineRule.currentValue,
        required: engineRule.limitValue,
        mode: engineRule.minDayProfit ? 'profitable' : undefined,
        param1: engineRule.minDayProfit ?? undefined,
      };
    }
    case 'consistency': {
      const clauses = consistencyClausesForStage(binding.rule_snapshot, stage);
      if (!clauses || clauses.length === 0 || initialBalance === null) return noteFromOption(option);
      const target = evaluation.automaticRules.find((rule) => rule.key === 'profit_target');
      const result = primaryConsistency(clauses, {
        initialBalance,
        balance: live.balance,
        days: live.days.map((day) => ({ date: day.date, pnl: day.pnl })),
        today: eaDay(binding, live).today,
        profitTargetAmount: target?.limitValue ?? null,
        bestClosedTrade: finiteNumber(live.bestTrade ?? null),
      });
      if (!result) return noteFromOption(option);
      return {
        key: 'consistency',
        label: option.label,
        kind: result.display,
        status: result.status,
        message: result.message,
        limit: result.limitValue,
        dayStartBalance: result.dayStartBalance ?? undefined,
        todayCap: result.cap ?? undefined,
        regularizeProfit: result.regularize,
        current: result.current,
        required: result.required,
        mode: result.display === 'counter' ? 'profitable' : undefined,
      };
    }
    case 'inactivity': {
      const required = inactivityDays(rules.minTradingDays);
      if (required === null) return noteFromOption(option);
      // Data mais recente com operação, sem depender da ordem do histórico.
      const lastTraded =
        live.days
          .filter((day) => day.traded)
          .map((day) => day.date)
          .sort()
          .at(-1) ?? null;
      const current = lastTraded ? daysBetween(lastTraded, eaDay(binding, live).today) : null;
      return {
        key: 'inactivity',
        label: option.label,
        kind: 'idle',
        status: current !== null && current >= required * 0.85 ? 'critical' : 'safe',
        message:
          current === null
            ? `A mesa encerra a conta com ${required} dias sem operar. O histórico deste terminal não tem operações.`
            : `A mesa encerra a conta com ${required} dias sem operar.`,
        limit: required,
        current,
        required,
      };
    }
    case 'weekend': {
      const spec = forcedCloseForStage(rules.weekendRule, rules.overnightRule, stage);
      if (!spec) return noteFromOption(option);
      const metric: EaMetric | undefined =
        spec.utcMinutes !== null ? 'utc' : spec.serverMinutes !== null ? 'server' : undefined;
      return {
        key: 'weekend',
        label: option.label,
        kind: 'close',
        status: 'safe',
        message: `${spec.clause}${spec.soft ? '' : '. Posição aberta depois do horário pode quebrar a conta.'}`,
        limit: null,
        metric,
        mode: spec.mode,
        param1: spec.utcMinutes ?? spec.serverMinutes,
      };
    }
    case 'max_lots': {
      const spec = lotLimitFor(rules.maxLots, binding.rule_snapshot.accountSize.label);
      if (!spec) return noteFromOption(option);
      return {
        key: 'max_lots',
        label: option.label,
        kind: 'lots',
        status: 'safe',
        message:
          spec.mode === 'per_order'
            ? `Até ${spec.lots} lotes por ordem. Regra oficial: ${spec.clause}`
            : `Até ${spec.lots.toLocaleString('pt-BR')} lotes abertos, somando todas as posições.`,
        limit: spec.lots,
        mode: spec.mode,
      };
    }
    case 'floating_loss': {
      const percent = floatingLossPercent(rules.breachConditions ?? [], stage);
      if (percent === null || initialBalance === null) return noteFromOption(option);
      return {
        key: 'floating_loss',
        label: option.label,
        kind: 'floating',
        status: 'safe',
        message: `Perda em aberto de no máximo ${percent.toLocaleString('pt-BR')}% do saldo inicial, somando as posições.`,
        limit: round2((percent / 100) * initialBalance),
      };
    }
    case 'open_risk': {
      const percent = openRiskPercent(rules.breachConditions ?? [], stage);
      if (percent === null || initialBalance === null) return noteFromOption(option);
      return {
        key: 'open_risk',
        label: option.label,
        kind: 'risk',
        status: 'partial',
        message: `Risco total até os stops de no máximo ${percent.toLocaleString('pt-BR')}% do saldo inicial. Posição sem stop conta como risco sem limite. Confirme com a mesa como ela mede.`,
        limit: round2((percent / 100) * initialBalance),
      };
    }
    default:
      return noteFromOption(option);
  }
}

const CURRENCY_SYMBOLS: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', BRL: 'R$' };

function moneyText(value: number, currency: string) {
  const code = currency.toUpperCase();
  const symbol = CURRENCY_SYMBOLS[code] ?? `${code} `;
  return `${symbol}${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}`;
}

function clockText(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = Math.round(minutes % 60);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/**
 * Linha da aba Configurações: o que a regra vale nesta conta, com os mesmos números
 * que o motor monitora. Sem número confiável, mostra o texto oficial da mesa.
 */
function optionDetail(option: GuardRuleOption, rule: EaRule, initialBalance: number | null, currency: string) {
  const limit = rule.limit;
  switch (rule.kind) {
    case 'floor':
    case 'target':
    case 'floating':
    case 'risk': {
      if (limit === null) return option.officialText;
      const money = moneyText(limit, currency);
      if (initialBalance === null || initialBalance <= 0) return money;
      const percent = Number(((limit / initialBalance) * 100).toFixed(2));
      return `${percent.toLocaleString('pt-BR')}% (${money})`;
    }
    case 'lots':
      if (limit === null) return option.officialText;
      return `${limit.toLocaleString('pt-BR')} lotes ${rule.mode === 'per_order' ? 'por ordem' : 'no total'}`;
    case 'idle':
      return rule.required ? `${rule.required} dias sem operar` : option.officialText;
    case 'counter':
      if (!rule.required) return option.officialText;
      if (rule.mode === 'profitable' && rule.param1) {
        return `${rule.required} dias com lucro de ${moneyText(rule.param1, currency)} ou mais`;
      }
      return `${rule.required} dias ${rule.mode === 'profitable' ? 'lucrativos' : 'operados'}`;
    case 'daycap':
    case 'tradecap':
      // A primeira frase já traz o percentual oficial: "Maior dia até 40% do lucro total".
      return rule.message.split(/\.\s/)[0].replace(/\.$/, '');
    case 'close': {
      const day = rule.mode === 'daily' ? 'Todo dia' : 'Toda sexta';
      if (rule.param1 === null || rule.param1 === undefined) return day;
      return `${day}, ${clockText(rule.param1)} ${rule.metric === 'server' ? 'do servidor' : 'UTC'}`;
    }
    default:
      return option.officialText;
  }
}

export function buildEaFeed(input: {
  binding: AccountRuleBindingRow;
  evaluation: BoundAccountRuleEvaluation;
  live: EaLiveInput;
  account: EaAccountContext;
  preferences: EaPreferences;
}): EaFeed {
  const { binding, evaluation, live, preferences } = input;
  const snapshot = binding.rule_snapshot;
  const stage = preferences.stage ?? inferStage(snapshot);
  const initialBalance =
    parseInitialBalance(snapshot.accountSize.initialBalance) ?? finiteNumber(input.account.startBalance);
  const options = guardRuleOptions(snapshot, stage);
  const selected = new Set<EaRuleKey>(preferences.ruleKeys ?? defaultGuardRuleKeys(options));
  const engineInput = buildEaEngineInput(binding, input.account, live);

  // A ordem das opções já é a do painel: zeram a conta, saque, lembretes.
  const rules: EaRule[] = [];
  const eaOptions: EaOption[] = [];
  const currency = snapshot.accountSize.currency || 'USD';
  for (const option of options) {
    const rule = buildRule(option, { binding, evaluation, live, engineInput, initialBalance, stage });
    eaOptions.push({
      key: option.key,
      label: option.label,
      group: option.group,
      live: option.live,
      on: selected.has(option.key),
      detail: optionDetail(option, rule, initialBalance, currency),
    });
    if (selected.has(option.key)) rules.push({ ...rule, group: option.group });
  }

  const { boundary } = eaDay(binding, live);
  return {
    firmName: snapshot.propFirm.name,
    programName: snapshot.program.name,
    // "Confirmar no checkout oficial" não é tamanho de conta: fica fora do cabeçalho do painel.
    accountSizeLabel: isExplicitRuleValue(snapshot.accountSize.label) ? snapshot.accountSize.label : '',
    currency: snapshot.accountSize.currency || 'USD',
    overallStatus: evaluation.overallStatus,
    stage,
    warningPct: preferences.warningPct,
    criticalPct: preferences.criticalPct,
    pollSeconds: EA_POLL_SECONDS,
    dayBoundary: {
      token: boundary.token,
      resetMinutes: boundary.resetMinutes,
      exact: boundary.exact,
      transitions: boundary.timezone ? zoneTransitions(boundary.timezone, live.now) : [],
    },
    rules,
    options: eaOptions,
  };
}

// ---- Formato de resposta para o EA ----
// Texto linha a linha separado por "|": o MQL5 não tem parser JSON nativo e um
// parser caseiro é o tipo de código que quebra em silêncio. Versionado na 1ª linha.

function cleanText(value: unknown) {
  return String(value ?? '').replace(/[|\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function num(value: number | null | undefined) {
  return value === null || value === undefined || !Number.isFinite(value) ? '' : value.toFixed(2);
}

export function serializeEaFeed(feed: EaFeed): string {
  const lines = [
    `FORTIFY-EA|${EA_PROTOCOL_VERSION}`,
    [
      'OK',
      cleanText(feed.firmName),
      cleanText(feed.programName),
      cleanText(feed.accountSizeLabel),
      cleanText(feed.currency),
      feed.overallStatus,
      String(feed.pollSeconds),
      num(feed.warningPct),
      num(feed.criticalPct),
      feed.stage,
    ].join('|'),
  ];
  // EA 1.72+: calendário da mesa. Versões antigas ignoram esta linha e seguem em UTC.
  if (feed.dayBoundary) {
    const { token, resetMinutes, exact, transitions } = feed.dayBoundary;
    lines.push(['D', cleanText(token), String(resetMinutes), exact ? '1' : '0', transitions.map(([at, offset]) => `${at}:${offset}`).join(',')].join('|'));
  }
  for (const rule of feed.rules) {
    lines.push(
      [
        'R',
        rule.key,
        cleanText(rule.label),
        rule.kind,
        rule.status,
        num(rule.limit),
        num(rule.floor),
        rule.metric ?? '',
        rule.trailing ?? '',
        num(rule.floorMax),
        num(rule.targetBalance),
        num(rule.dayStartBalance),
        num(rule.todayCap),
        num(rule.regularizeProfit),
        num(rule.current),
        num(rule.required),
        cleanText(rule.message),
        // Campos novos sempre no fim: o EA 1.00 lê só até a mensagem e continua funcionando.
        rule.mode ?? '',
        num(rule.param1),
        rule.group ?? '',
      ].join('|'),
    );
  }
  // EA 1.60+: lista completa para a aba Configurações. Versões antigas ignoram estas linhas.
  for (const option of feed.options ?? []) {
    // O valor calculado vem por último: o EA 1.60 e 1.70 lê só os 6 primeiros campos.
    lines.push(
      ['O', option.key, cleanText(option.label), option.group, option.live ? '1' : '0', option.on ? '1' : '0', cleanText(option.detail)].join('|'),
    );
  }
  if (feed.notice) lines.push(`N|${cleanText(feed.notice)}`);
  lines.push('END');
  return `${lines.join('\n')}\n`;
}

/** Escolha feita na aba Configurações do EA: só chaves conhecidas, sem repetir. */
export function sanitizeEaRuleKeys(raw: unknown): EaRuleKey[] | null {
  if (!Array.isArray(raw)) return null;
  const keys: EaRuleKey[] = [];
  for (const item of raw.slice(0, 64)) {
    const key = String(item ?? '').trim();
    if (isEaRuleKey(key) && !keys.includes(key)) keys.push(key);
  }
  return keys;
}

export function serializeEaError(code: string, message: string): string {
  return `FORTIFY-EA|${EA_PROTOCOL_VERSION}\nERR|${cleanText(code)}|${cleanText(message)}\nEND\n`;
}
