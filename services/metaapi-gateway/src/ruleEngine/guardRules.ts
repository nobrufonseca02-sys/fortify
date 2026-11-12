// Regras do Fortify Guard que dependem da FASE da conta (avaliação ou funded) e
// regras que o EA mede ao vivo além das cinco do motor: inatividade, fechamento
// obrigatório, lote máximo, perda flutuante e risco aberto.
//
// Mesma disciplina do motor: só vira número o que o texto oficial da mesa diz de
// forma inequívoca. Texto ambíguo vira lembrete, nunca um número chutado.
// Módulo puro: roda no gateway (eaFeed.ts) e no app (escolha das regras na tela).

import type { RuleBindingSnapshot } from './bindingTypes';
import { isExplicitRuleValue, normalizeRuleText } from './ruleEngineTypes';

export type AccountStage = 'evaluation' | 'funded';
export type StageScope = AccountStage | 'both';

const FUNDED_MARKERS = [
  'funded',
  'financiada',
  'performance',
  'master',
  'qualified',
  'payout',
  'saque',
  'solicitacao',
  'trader account',
  'reward',
];
const EVALUATION_MARKERS = ['avaliacao', 'challenge', 'aprovacao', 'fase'];

function clauses(text: string | null | undefined) {
  return String(text ?? '')
    .split(/[;\n]+/)
    .map((clause) => clause.trim())
    .filter(Boolean);
}

export function clauseScope(clause: string): StageScope {
  const normalized = normalizeRuleText(clause);
  const funded = FUNDED_MARKERS.some((marker) => normalized.includes(marker));
  const evaluation = EVALUATION_MARKERS.some((marker) => normalized.includes(marker));
  if (funded && evaluation) return 'both';
  if (funded) return 'funded';
  if (evaluation) return 'evaluation';
  return 'both';
}

const appliesTo = (scope: StageScope, stage: AccountStage) => scope === 'both' || scope === stage;

function parsePercent(value: string) {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

/** Programa vendido já como conta financiada (instant / funded) começa em funded. */
export function inferStage(snapshot: Pick<RuleBindingSnapshot, 'program'>): AccountStage {
  const text = normalizeRuleText(`${snapshot.program.name} ${snapshot.program.type}`);
  return /instant|funded|financiad/.test(text) ? 'funded' : 'evaluation';
}

// ---- Consistência por fase ----

export interface ConsistencySpec {
  /** Teto do melhor dia, em % do lucro total. */
  percent: number;
  /** "exceder não reprova": continua valendo, mas não quebra a conta. */
  soft: boolean;
  /** Só vale se o trader contratou o add-on. */
  addOn: boolean;
  clause: string;
}

const BEST_DAY = ['best day', 'melhor dia', 'maior dia'];
const CONSISTENCY_DISQUALIFIERS = [
  'trade value score',
  'daily profit cap',
  'profit concentration',
  'lucro diario contado',
  'dias lucrativos',
  'verificar no site',
];

/**
 * `ConsistencySpec`: há teto de melhor dia nesta fase. `'none'`: o texto diz que
 * não há consistência nesta fase. `null`: não dá para afirmar nada com segurança.
 */
export function consistencyForStage(ruleText: string, stage: AccountStage): ConsistencySpec | 'none' | null {
  const whole = normalizeRuleText(ruleText);
  const positives: Array<ConsistencySpec & { scope: StageScope }> = [];
  let negativeForStage = false;

  for (const clause of clauses(ruleText)) {
    const normalized = normalizeRuleText(clause);
    const scope = clauseScope(clause);
    if (!appliesTo(scope, stage)) continue;
    if (/sem (regra de )?consist|sem regra/.test(normalized)) {
      negativeForStage = true;
      continue;
    }
    if (CONSISTENCY_DISQUALIFIERS.some((phrase) => normalized.includes(phrase))) continue;
    const hasBestDay = BEST_DAY.some((keyword) => normalized.includes(keyword));
    // "25% no estágio funded" só conta como consistência quando o texto todo fala dela.
    if (!hasBestDay && !(whole.includes('consist') && scope !== 'both')) continue;
    const match = hasBestDay
      ? normalized.match(/(?:best day|melhor dia|maior dia)[^%]*?(\d+(?:[.,]\d+)?)\s*%/)
      : normalized.match(/(\d+(?:[.,]\d+)?)\s*%/);
    const percent = match ? parsePercent(match[1]) : null;
    if (percent === null || percent < 5 || percent > 90) continue;
    positives.push({
      percent,
      soft: whole.includes('nao reprova'),
      addOn: normalized.includes('add-on') || normalized.includes('add on'),
      clause,
      scope,
    });
  }

  // Cláusula específica da fase vence a genérica.
  const best = positives.find((spec) => spec.scope === stage) ?? positives[0];
  if (best) {
    const { scope: _scope, ...spec } = best;
    return spec;
  }
  return negativeForStage ? 'none' : null;
}

// ---- Inatividade ----

/** Dias corridos sem operar que encerram a conta. */
export function inactivityDays(minTradingDaysText: string): number | null {
  const normalized = normalizeRuleText(minTradingDaysText);
  const match = normalized.match(/(?:inatividade em|atividade a cada|a cada)\s+(\d{1,3})\s+dias/);
  if (!match) return null;
  const days = Number(match[1]);
  return days >= 7 && days <= 365 ? days : null;
}

// ---- Fechamento obrigatório (sexta ou diário) ----

export interface ForcedCloseSpec {
  mode: 'weekly' | 'daily';
  /** Minuto do dia em UTC; null = no fim do pregão do ativo (o EA lê a sessão). */
  utcMinutes: number | null;
  /** Minuto do dia no horário do servidor da corretora, quando a mesa fala em "server time". */
  serverMinutes: number | null;
  /** A mesa fecha as posições (ou aplica soft breach) em vez de quebrar a conta. */
  soft: boolean;
  clause: string;
}

const MUST_CLOSE = [
  'encerradas na sexta',
  'fechar sexta',
  'fecha posicoes na sexta',
  'fecha as posicoes na sexta',
  'obrigatorio fechar',
  'nao permite holding',
  'fechadas diariamente',
  'deve fechar antes do fim de semana',
];

function closeTime(normalized: string) {
  const match = normalized.match(/(\d{1,2}):(\d{2})\s*(server time|gmt|utc)?\s*([+-]\d{1,2})?/);
  if (!match) return { utcMinutes: null, serverMinutes: null };
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  if (match[3] === 'server time') return { utcMinutes: null, serverMinutes: minutes };
  if (match[3] === 'gmt' || match[3] === 'utc') {
    const offset = match[4] ? Number(match[4]) * 60 : 0;
    return { utcMinutes: (minutes - offset + 1440) % 1440, serverMinutes: null };
  }
  return { utcMinutes: null, serverMinutes: null };
}

export function forcedCloseForStage(
  weekendRule: string,
  overnightRule: string,
  stage: AccountStage,
): ForcedCloseSpec | null {
  for (const text of [weekendRule, overnightRule]) {
    for (const clause of clauses(text)) {
      if (!appliesTo(clauseScope(clause), stage)) continue;
      const normalized = normalizeRuleText(clause);
      const weekendBan = normalized.includes('nao permit') && (text === weekendRule || normalized.includes('sexta'));
      if (!weekendBan && !MUST_CLOSE.some((phrase) => normalized.includes(phrase))) continue;
      const daily = normalized.includes('diariamente');
      return {
        mode: daily ? 'daily' : 'weekly',
        ...closeTime(normalized),
        soft: /soft breach|sem hard breach|fecha posicoes|fechadas diariamente|encerradas na sexta/.test(normalized),
        clause,
      };
    }
  }
  return null;
}

// ---- Lote máximo ----

export interface LotLimitSpec {
  mode: 'total' | 'per_order';
  lots: number;
  clause: string;
}

// Escada de tamanhos em que as mesas publicam o limite como lista "a / b / c ... lotes"
// na mesma ordem. Conferido na fonte oficial da Alpha Capital (Pro e Swing) em 12/11/2026.
const SIZE_LADDER = ['5k', '10k', '25k', '50k', '100k', '200k', '300k'];

function sizeKey(label: string) {
  const match = normalizeRuleText(label).replace(/[\s$]/g, '').match(/^(\d+)k$/);
  return match ? `${match[1]}k` : null;
}

export function lotLimitFor(maxLotsText: string, accountSizeLabel: string): LotLimitSpec | null {
  if (!isExplicitRuleValue(maxLotsText)) return null;
  const normalized = normalizeRuleText(maxLotsText);
  const perClick = normalized.match(/(\d+(?:[.,]\d+)?)\s*lotes? por clique/);
  if (perClick) {
    const lots = parsePercent(perClick[1]);
    return lots ? { mode: 'per_order', lots, clause: maxLotsText } : null;
  }
  const values = normalized
    .replace(/lotes?/g, '')
    .split('/')
    .map((part) => parsePercent(part.trim()));
  if (values.length === SIZE_LADDER.length && values.every((value) => value !== null && value > 0)) {
    const index = SIZE_LADDER.indexOf(sizeKey(accountSizeLabel) ?? '');
    if (index >= 0) return { mode: 'total', lots: values[index] as number, clause: maxLotsText };
  }
  return null;
}

// ---- Perda flutuante e risco aberto ----

export function floatingLossPercent(conditions: string[], stage: AccountStage): number | null {
  for (const clause of conditions) {
    if (!appliesTo(clauseScope(clause), stage)) continue;
    const match = normalizeRuleText(clause).match(/perda flutuante maxima de (\d+(?:[.,]\d+)?)\s*%/);
    if (match) return parsePercent(match[1]);
  }
  return null;
}

export function openRiskPercent(conditions: string[], stage: AccountStage): number | null {
  for (const clause of conditions) {
    if (!appliesTo(clauseScope(clause), stage)) continue;
    const match = normalizeRuleText(clause).match(/risco aberto(?: funded)? de (\d+(?:[.,]\d+)?)\s*%/);
    if (match) return parsePercent(match[1]);
  }
  return null;
}

// ---- Catálogo de opções do Fortify Guard ----

export const GUARD_RULE_KEYS = [
  'daily_loss',
  'max_drawdown',
  'inactivity',
  'max_lots',
  'floating_loss',
  'open_risk',
  'weekend',
  'profit_target',
  'consistency',
  'min_trading_days',
] as const;
export type GuardRuleKey = (typeof GUARD_RULE_KEYS)[number];

export function isGuardRuleKey(value: unknown): value is GuardRuleKey {
  return typeof value === 'string' && (GUARD_RULE_KEYS as readonly string[]).includes(value);
}

/** account: quebrar zera a conta. payout: trava a aprovação ou o saque. */
export type GuardGroup = 'account' | 'payout';

export interface GuardRuleOption {
  key: GuardRuleKey;
  label: string;
  group: GuardGroup;
  /** O que acontece se a regra for quebrada, em uma frase. */
  consequence: string;
  officialText: string;
  /** O EA mostra número ao vivo (true) ou só o texto oficial (false). */
  live: boolean;
}

const hasNoRule = (text: string) => normalizeRuleText(text).includes('nao possui');

export function guardRuleOptions(snapshot: RuleBindingSnapshot, stage: AccountStage): GuardRuleOption[] {
  const rules = snapshot.criticalRules;
  const conditions = rules.breachConditions ?? [];
  const options: GuardRuleOption[] = [];
  const push = (option: GuardRuleOption) => options.push(option);

  if (isExplicitRuleValue(rules.dailyLoss) && !hasNoRule(rules.dailyLoss)) {
    push({ key: 'daily_loss', label: 'Perda diária', group: 'account', consequence: 'Zera a conta', officialText: rules.dailyLoss, live: true });
  }
  if (isExplicitRuleValue(rules.maxLoss)) {
    push({ key: 'max_drawdown', label: 'Drawdown máximo', group: 'account', consequence: 'Zera a conta', officialText: rules.maxLoss, live: true });
  }
  const idle = inactivityDays(rules.minTradingDays);
  if (idle !== null) {
    push({
      key: 'inactivity',
      label: 'Inatividade',
      group: 'account',
      consequence: `Zera a conta com ${idle} dias sem operar`,
      officialText: rules.minTradingDays,
      live: true,
    });
  }
  const lots = lotLimitFor(rules.maxLots, snapshot.accountSize.label);
  if (lots) {
    push({ key: 'max_lots', label: 'Lote máximo', group: 'account', consequence: 'Zera a conta', officialText: rules.maxLots, live: true });
  }
  const floating = floatingLossPercent(conditions, stage);
  if (floating !== null) {
    push({ key: 'floating_loss', label: 'Perda flutuante', group: 'account', consequence: 'Zera a conta', officialText: `${floating}% de perda em aberto`, live: true });
  }
  const risk = openRiskPercent(conditions, stage);
  if (risk !== null) {
    push({ key: 'open_risk', label: 'Risco aberto', group: 'account', consequence: 'Zera a conta', officialText: `${risk}% de risco total até os stops`, live: true });
  }
  const close = forcedCloseForStage(rules.weekendRule, rules.overnightRule, stage);
  if (close) {
    push({
      key: 'weekend',
      label: close.mode === 'daily' ? 'Fechamento diário' : 'Fechamento de sexta',
      group: 'account',
      consequence: close.soft ? 'A mesa fecha suas posições' : 'Pode quebrar a conta',
      officialText: close.clause,
      live: true,
    });
  }

  if (stage === 'evaluation') {
    const targets = rules.phases.map((phase) => `${phase.label}: ${phase.profitTarget}`).join(' · ');
    if (rules.phases.some((phase) => isExplicitRuleValue(phase.profitTarget))) {
      push({ key: 'profit_target', label: 'Meta de lucro', group: 'payout', consequence: 'Conclui a fase', officialText: targets, live: true });
    }
  }
  const consistency = consistencyForStage(rules.consistencyRule, stage);
  if (consistency && consistency !== 'none') {
    push({
      key: 'consistency',
      label: 'Consistência',
      group: 'payout',
      consequence: consistency.soft
        ? 'Obriga a continuar operando'
        : stage === 'funded'
          ? 'Trava o saque'
          : 'Impede a aprovação',
      officialText: rules.consistencyRule,
      live: true,
    });
  }
  const minDaysText = normalizeRuleText(rules.minTradingDays);
  if (isExplicitRuleValue(rules.minTradingDays) && /\d/.test(minDaysText) && !minDaysText.startsWith('sem minimo')) {
    push({
      key: 'min_trading_days',
      label: 'Dias mínimos',
      group: 'payout',
      consequence: stage === 'funded' ? 'Trava o saque' : 'Impede a aprovação',
      officialText: rules.minTradingDays,
      live: true,
    });
  }
  return options;
}

/** Sem escolha salva: tudo que zera a conta ou trava o saque fica ligado. Notícias e lembretes de texto não fazem parte do Fortify Guard. */
export function defaultGuardRuleKeys(options: GuardRuleOption[]): GuardRuleKey[] {
  return options.map((option) => option.key);
}
