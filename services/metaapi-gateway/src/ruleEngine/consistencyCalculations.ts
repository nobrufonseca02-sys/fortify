import {
  classifyLimitConsumption,
  finiteNumber,
  normalizeRuleText,
  notMonitorableRule,
  parseRuleLimit,
  type BoundRuleEvaluation,
  type RuleEngineSnapshotInput,
} from './ruleEngineTypes';

interface ConsistencyCalculationInput {
  ruleText: string;
  initialBalance: number | null;
  currentBalance: number | null;
  currency: string;
  snapshots: RuleEngineSnapshotInput[];
}

// consistencyRule é um texto livre por mesa (ver src/data/prop-firms/*.ts) e
// cobre pelo menos 5 mecanismos diferentes: teto de "melhor dia" sobre o
// lucro total (o único que este cálculo sabe fazer), teto sobre o Profit
// Target, limite por TRADE (Trade Value Score), teto em dólar fixo por dia
// (Daily Profit Cap), exigência de dias lucrativos, ou nenhuma regra. Tentar
// extrair "a primeira porcentagem do texto" sem filtrar esses casos geraria
// um número confiante e errado — pior que admitir que não dá pra calcular.
const DISQUALIFYING_PHRASES = [
  'sem consistencia',
  'sem regra',
  'verificar no site',
  'trade value score',
  'nao reprova',
  'aumenta a meta',
  'profit concentration',
  'daily profit cap',
  'dias lucrativos',
];

const BEST_DAY_KEYWORDS = ['melhor dia', 'maior dia', 'best day'];

export function evaluateConsistency(input: ConsistencyCalculationInput): BoundRuleEvaluation {
  const normalized = normalizeRuleText(input.ruleText);
  const hasBestDayKeyword = BEST_DAY_KEYWORDS.some((keyword) => normalized.includes(keyword));
  const isDisqualified = DISQUALIFYING_PHRASES.some((phrase) => normalized.includes(phrase));

  if (!hasBestDayKeyword || isDisqualified) {
    return notMonitorableRule(
      'consistency',
      'Consistência',
      input.ruleText,
      input.currency,
      isDisqualified
        ? 'Esta mesa usa um mecanismo de consistência que o Fortify ainda não calcula automaticamente (sem regra, limite por trade, teto fixo em dinheiro, ou exigência de dias lucrativos). Consulte o texto oficial da regra.'
        : 'Não foi possível identificar um teto percentual de "melhor dia" confiável no texto desta regra.',
    );
  }

  const currentBalance = finiteNumber(input.currentBalance);
  const initialBalance = finiteNumber(input.initialBalance);
  if (currentBalance === null || initialBalance === null) {
    return notMonitorableRule(
      'consistency',
      'Consistência',
      input.ruleText,
      input.currency,
      'Saldo inicial ou saldo atual não está disponível.',
    );
  }

  // Mesma definição de "lucro total" usada pelo Profit Target, pra não ter
  // dois números de "lucro" divergentes entre as duas regras.
  const totalProfit = Math.max(0, currentBalance - initialBalance);
  if (totalProfit <= 0) {
    return notMonitorableRule(
      'consistency',
      'Consistência',
      input.ruleText,
      input.currency,
      'A conta ainda não tem lucro acumulado — a regra de consistência só se aplica a partir do primeiro lucro.',
    );
  }

  const limit = parseRuleLimit(input.ruleText, totalProfit);
  if (!limit) {
    return notMonitorableRule(
      'consistency',
      'Consistência',
      input.ruleText,
      input.currency,
      'O snapshot não informa um percentual de consistência numérico confiável.',
    );
  }

  const dailyProfits = input.snapshots
    .map((snapshot) => finiteNumber(snapshot.dailyPnl))
    .filter((value): value is number => value !== null && value > 0);
  if (dailyProfits.length === 0) {
    return notMonitorableRule(
      'consistency',
      'Consistência',
      input.ruleText,
      input.currency,
      'Histórico diário insuficiente para identificar o melhor dia de lucro.',
    );
  }

  const bestDayProfit = Math.max(...dailyProfits);
  const status = classifyLimitConsumption(bestDayProfit, limit.amount);
  const percentage = limit.amount > 0 ? (bestDayProfit / limit.amount) * 100 : 0;
  const percentText = `${Math.max(0, percentage).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% do teto de consistência consumido pelo melhor dia`;

  return {
    key: 'consistency',
    label: 'Consistência',
    status,
    monitorability: 'automatic_mt5',
    sourceRule: input.ruleText,
    currentValue: bestDayProfit,
    limitValue: limit.amount,
    remainingValue: Math.max(0, limit.amount - bestDayProfit),
    percentage,
    currency: input.currency,
    message:
      status === 'breached'
        ? 'O melhor dia de lucro já ultrapassa o teto de consistência desta mesa.'
        : `${percentText}.`,
    detail:
      'Muitas mesas só verificam consistência na certificação ou no saque, não como limite contínuo — acompanhe a folga, mas confirme o momento exato da verificação no texto oficial da regra.',
  };
}
