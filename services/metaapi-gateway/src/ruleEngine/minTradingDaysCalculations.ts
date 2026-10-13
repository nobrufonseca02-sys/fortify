import {
  finiteNumber,
  isExplicitRuleValue,
  normalizeRuleText,
  notMonitorableRule,
  type BoundRuleEvaluation,
  type RuleEngineTradeInput,
} from './ruleEngineTypes';

interface MinTradingDaysCalculationInput {
  ruleText: string;
  trades: RuleEngineTradeInput[];
  currency: string;
}

// `minTradingDays` é texto livre por mesa (ver src/data/prop-firms/*.ts) e cobre
// pelo menos 4 mecanismos diferentes além da simples contagem de dias
// operados: exigência de lucro mínimo por dia ("dias lucrativos"/"dias
// positivos"), um piso que na verdade é um PRAZO-limite ("Prazo de N dias para
// concluir"), comentário derivado não-oficial ("mínimo prático"), ou uma regra
// composta com duas contagens de dias distintas. Tentar extrair "o primeiro
// número do texto" sem filtrar esses casos contaria dias que não atendem a
// condição real da mesa — pior que admitir que não dá pra calcular.
const DISQUALIFYING_PHRASES = [
  'dias lucrativos',
  'dias positivos',
  'representar ao menos',
  'representa ao menos',
  'minimo pratico',
  'logica do',
  'prazo de',
];

// Quando o texto já declara explicitamente "sem mínimo", isso vale mesmo que o
// restante da frase só acrescente comentário derivado (ex.: e8Markets: "Sem
// mínimo; lógica do Best Day exige ao menos 3 dias..."). A cláusula oficial
// ganha da observação não-oficial que vem depois.
const NO_MINIMUM_PHRASES = ['sem minimo'];

// Mesas que exigem o mínimo "por fase" não dão como reiniciar a contagem na
// troca de fase nos dados que o Fortify recebe hoje (trades não são marcados
// por fase) — a contagem fica cumulativa desde a conexão da conta.
const PER_PHASE_PHRASES = ['por fase', 'em cada fase', 'cada fase'];

function toDateKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function countDistinctTradingDays(trades: RuleEngineTradeInput[]): number {
  const days = new Set<string>();
  for (const trade of trades) {
    const key = toDateKey(trade.closeTime);
    // Ignora closeTime não-parseável em vez de "virar hoje" — isso fabricaria
    // um dia de operação que não existe.
    if (key) days.add(key);
  }
  return days.size;
}

export function evaluateMinTradingDays(input: MinTradingDaysCalculationInput): BoundRuleEvaluation {
  if (!isExplicitRuleValue(input.ruleText)) {
    return notMonitorableRule(
      'min_trading_days',
      'Dias mínimos',
      input.ruleText,
      input.currency,
      'O snapshot não informa um texto confiável para os dias mínimos operados.',
    );
  }

  const normalized = normalizeRuleText(input.ruleText);

  if (NO_MINIMUM_PHRASES.some((phrase) => normalized.includes(phrase))) {
    return {
      key: 'min_trading_days',
      label: 'Dias mínimos',
      status: 'safe',
      monitorability: 'automatic_mt5',
      sourceRule: input.ruleText,
      currentValue: 0,
      limitValue: 0,
      remainingValue: 0,
      percentage: 100,
      currency: input.currency,
      message: 'Esta mesa não exige um mínimo de dias operados.',
    };
  }

  if (DISQUALIFYING_PHRASES.some((phrase) => normalized.includes(phrase))) {
    return notMonitorableRule(
      'min_trading_days',
      'Dias mínimos',
      input.ruleText,
      input.currency,
      'Esta mesa usa um critério de dias mínimos que o Fortify ainda não calcula automaticamente (exigência de lucro por dia, prazo-limite em vez de piso, ou comentário não-oficial). Consulte o texto oficial da regra.',
    );
  }

  // Cláusulas depois do ";" costumam ser prazo/janela de inatividade, não o
  // requisito em si (ex.: "4 dias em cada fase; prazo ilimitado") — extrai só
  // do primeiro segmento.
  const firstSegment = input.ruleText.split(';')[0] ?? input.ruleText;
  const dayMatches = Array.from(firstSegment.matchAll(/(\d+)\s*dias?\b/gi));
  const distinctDayNumbers = new Set(dayMatches.map((match) => match[1]));

  if (distinctDayNumbers.size === 0) {
    return notMonitorableRule(
      'min_trading_days',
      'Dias mínimos',
      input.ruleText,
      input.currency,
      'Não foi possível identificar um número de dias mínimos confiável no texto desta regra.',
    );
  }
  if (distinctDayNumbers.size > 1) {
    return notMonitorableRule(
      'min_trading_days',
      'Dias mínimos',
      input.ruleText,
      input.currency,
      'O texto desta regra combina mais de uma contagem de dias (ex.: dias operados e dias corridos) — o Fortify não verifica automaticamente esse tipo de regra composta.',
    );
  }

  const requiredDays = finiteNumber(dayMatches[0][1]);
  if (requiredDays === null || requiredDays < 0) {
    return notMonitorableRule(
      'min_trading_days',
      'Dias mínimos',
      input.ruleText,
      input.currency,
      'Não foi possível identificar um número de dias mínimos confiável no texto desta regra.',
    );
  }

  const currentValue = countDistinctTradingDays(input.trades);
  const limitValue = requiredDays;
  const attained = currentValue >= limitValue;
  const percentage = limitValue > 0 ? (currentValue / limitValue) * 100 : 100;

  const caveats: string[] = [
    'Contagem baseada nos trades sincronizados pelo Fortify; dias operados antes da conexão da conta não são computados.',
  ];
  if (PER_PHASE_PHRASES.some((phrase) => normalized.includes(phrase))) {
    caveats.push(
      'Esta mesa exige o mínimo por fase — a contagem é cumulativa desde a conexão da conta e pode incluir dias de uma fase anterior.',
    );
  }
  if (normalized.includes('segundos')) {
    caveats.push(
      'Esta mesa também exige um tempo mínimo de permanência por trade — a contagem de dias não verifica essa condição.',
    );
  }

  return {
    key: 'min_trading_days',
    label: 'Dias mínimos',
    status: 'safe',
    monitorability: 'automatic_mt5',
    sourceRule: input.ruleText,
    currentValue,
    limitValue,
    remainingValue: Math.max(0, limitValue - currentValue),
    percentage,
    currency: input.currency,
    message: attained
      ? `Mínimo de dias operados atingido (${currentValue} de ${limitValue}).`
      : `${currentValue} de ${limitValue} dias operados.`,
    detail: caveats.join(' '),
  };
}
