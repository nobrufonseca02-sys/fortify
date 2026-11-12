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
import {
  consistencyForStage,
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
  now: Date;
}

export interface EaAccountContext {
  startBalance: number | null;
  highestEquity: number | null;
  phase: string | null;
}

export interface EaPreferences {
  /** null = padrão: tudo que zera a conta ou trava o saque, sem os lembretes. */
  ruleKeys: EaRuleKey[] | null;
  /** null = deduz pelo programa (instant/funded já começa em funded). */
  stage: AccountStage | null;
  warningPct: number;
  criticalPct: number;
}

export type EaRuleKind = 'floor' | 'target' | 'daycap' | 'counter' | 'idle' | 'close' | 'lots' | 'floating' | 'risk' | 'note';
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
  rules: EaRule[];
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

function utcDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
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
  const today = utcDateKey(live.now);
  const history = live.days.filter((day) => day.date < today);
  const todayDay = live.days.find((day) => day.date === today);
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
    ...history.map((day) => ({
      date: day.date,
      balance: day.eodBalance,
      equity: day.eodBalance,
      dailyPnl: day.pnl,
      floatingPnl: 0,
      maxBalance: null,
    })),
  ];

  const trades = live.days
    .filter((day) => day.traded)
    .map((day) => ({ profit: day.pnl, commission: 0, swap: 0, closeTime: `${day.date}T12:00:00.000Z` }));

  const knownPeaks = [account.highestEquity, live.peakEquity, live.equity, ...history.map((day) => day.eodBalance)]
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
    },
    snapshots,
    trades,
    positions: [{ floatingPnl: floating }],
    now: live.now,
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
  if (reference !== null && initialBalance !== null && calculation.includes('trava') && calculation.includes('saldo inicial')) {
    reference = Math.min(reference, initialBalance + limit);
  }
  return reference;
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
    floor = metricNow - (rule.remainingValue ?? 0);
  } else if (key === 'daily_loss') {
    // Dia no zero ou no lucro: quebra quando o saldo do início do dia cai o limite.
    const today = utcDateKey(live.now);
    const todayPnl = live.days.find((day) => day.date === today)?.pnl ?? 0;
    floor = live.balance - todayPnl - limit;
  } else {
    const reference = drawdownReference(binding, engineInput, initialBalance, limit);
    floor = reference !== null ? reference - limit : metricNow - (rule.remainingValue ?? 0);
  }
  floor = round2(floor);
  const trailing = key === 'max_drawdown' ? trailingSource(binding) : null;
  const calculation = normalizeRuleText(binding.rule_snapshot.criticalRules.drawdownCalculation);
  const locksAtInitial = calculation.includes('trava') && calculation.includes('saldo inicial');
  return {
    key,
    label: rule.label,
    kind: 'floor',
    status: rule.status,
    message: rule.message,
    limit: rule.limitValue,
    floor,
    metric: 'min',
    trailing,
    floorMax: trailing && locksAtInitial && initialBalance !== null ? round2(initialBalance) : null,
  };
}

function consistencyRule(percent: number, live: EaLiveInput, initialBalance: number, extra: string): EaRule {
  const c = percent / 100;
  const today = utcDateKey(live.now);
  const todayPnl = live.days.find((day) => day.date === today)?.pnl ?? 0;
  const dayStartBalance = live.balance - todayPnl;
  const profitBeforeToday = Math.max(0, dayStartBalance - initialBalance);
  // Hoje (P) cabe na regra se P <= c * (lucro anterior + P)  =>  P <= c/(1-c) * lucro anterior.
  const todayCap = round2((c / (1 - c)) * profitBeforeToday);
  const bestPrevious = Math.max(0, ...live.days.filter((day) => day.date < today).map((day) => day.pnl));
  const totalNow = Math.max(0, live.balance - initialBalance);
  // Melhor dia anterior <= c * lucro total  =>  lucro total >= melhor dia / c.
  const regularize = bestPrevious > 0 && bestPrevious > c * totalNow ? round2(bestPrevious / c - totalNow) : null;
  const pctText = percent.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  const base =
    profitBeforeToday <= 0
      ? `Nenhum dia pode passar de ${pctText}% do lucro total. Sem lucro acumulado antes de hoje, todo lucro de hoje vira o melhor dia.`
      : `Nenhum dia pode passar de ${pctText}% do lucro total.`;
  return {
    key: 'consistency',
    label: 'Consistência',
    kind: 'daycap',
    status: regularize ? 'warning' : 'safe',
    message: `${base} ${extra}`.trim(),
    limit: round2(c * totalNow),
    dayStartBalance: round2(dayStartBalance),
    todayCap,
    regularizeProfit: regularize,
  };
}

function daysBetween(fromDate: string, now: Date) {
  const from = Date.parse(`${fromDate}T00:00:00.000Z`);
  const today = Date.parse(`${utcDateKey(now)}T00:00:00.000Z`);
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
        targetBalance: round2(live.balance + (engineRule.remainingValue ?? 0)),
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
      };
    }
    case 'consistency': {
      const spec = consistencyForStage(rules.consistencyRule, stage);
      if (!spec || spec === 'none' || initialBalance === null) return noteFromOption(option);
      const extra = [
        spec.soft ? 'Exceder não reprova, mas obriga a continuar operando.' : '',
        spec.addOn ? 'Vale se você contratou o add-on de consistência.' : '',
        // A cláusula oficial carrega a condição ("no payout on-demand", "no Performance").
        `Regra oficial: ${spec.clause}.`,
      ]
        .filter(Boolean)
        .join(' ');
      return consistencyRule(spec.percent, live, initialBalance, extra);
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
      const current = lastTraded ? daysBetween(lastTraded, live.now) : null;
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
  for (const option of options) {
    if (!selected.has(option.key)) continue;
    const rule = buildRule(option, { binding, evaluation, live, engineInput, initialBalance, stage });
    rules.push({ ...rule, group: option.group });
  }

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
    rules,
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
  lines.push('END');
  return `${lines.join('\n')}\n`;
}

export function serializeEaError(code: string, message: string): string {
  return `FORTIFY-EA|${EA_PROTOCOL_VERSION}\nERR|${cleanText(code)}|${cleanText(message)}\nEND\n`;
}
