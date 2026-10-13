import type {
  BoundRuleEvaluation,
  BoundRuleKey,
  BoundRuleListItem,
  RuleEvaluationStatus,
} from '@/lib/ruleEngine/ruleEngineTypes';

/** Linha de `account_rule_evaluations` / `latest_account_rule_evaluations`. */
export interface CanonicalRuleEvaluationRow {
  id: string;
  user_id: string;
  trading_account_id: string;
  mt5_connection_id: string | null;
  binding_id: string;
  rule_snapshot_hash: string;
  rule_version_id: string;
  engine_version: string;
  overall_status: RuleEvaluationStatus;
  overall_message: string;
  automatic_rules: BoundRuleEvaluation[];
  manual_rules: BoundRuleListItem[];
  unsupported_rules: BoundRuleListItem[];
  not_calculated_rules: BoundRuleListItem[];
  alerts: string[];
  input_summary: Record<string, unknown>;
  evaluated_at: string;
}

/**
 * A avaliação só vale se foi calculada com o binding ativo agora. Depois de uma
 * troca de versão, a última linha ainda aponta para o snapshot antigo até o
 * próximo sync — nesse intervalo a conta fica "sem dados", não com o status velho.
 */
export function currentCanonicalEvaluation(
  row: CanonicalRuleEvaluationRow | null | undefined,
  activeBindingId: string | null | undefined,
) {
  if (!row || !activeBindingId) return null;
  return row.binding_id === activeBindingId ? row : null;
}

/**
 * Elegibilidade para saque, derivada em tempo de leitura a partir das regras já
 * avaliadas — nunca persistida, pra poder evoluir sem reprocessar histórico
 * (mesmo raciocínio de `worstLossPercentage` abaixo).
 *
 * `not_determinable` é um estado honesto, não um meio-termo entre elegível e
 * não-elegível: significa que uma regra que BLOQUEIA a elegibilidade (meta de
 * lucro ou dias mínimos) não pôde ser calculada automaticamente. Assumir
 * "cumprido" nesse caso inventaria uma elegibilidade que não existe — por
 * isso essas duas regras nunca recebem benefício da dúvida. Consistência já
 * fica fora do status geral da conta pelo mesmo motivo que a maioria das
 * mesas tem texto não-parseável (ver evaluateAccountRules.ts); aqui ela seria
 * "not_determinable" quase sempre, o que tornaria a funcionalidade inútil —
 * por isso só o status `breached` dela bloqueia, e o caso comum
 * (`not_monitorable`) vira apenas um aviso em `caveats`.
 */
export interface PayoutEligibilitySummary {
  status: 'eligible' | 'not_eligible' | 'not_determinable';
  blockingRule: BoundRuleKey | 'overall' | null;
  message: string;
  caveats: string[];
}

function computePayoutEligibility(
  overallStatus: RuleEvaluationStatus,
  dailyLoss: BoundRuleEvaluation | null,
  maxDrawdown: BoundRuleEvaluation | null,
  profitTarget: BoundRuleEvaluation | null,
  consistency: BoundRuleEvaluation | null,
  minTradingDays: BoundRuleEvaluation | null,
): PayoutEligibilitySummary {
  const caveats: string[] = [];

  if (overallStatus === 'pending_binding' || overallStatus === 'not_monitorable') {
    return {
      status: 'not_determinable',
      blockingRule: 'overall',
      message: 'Conta sem vínculo de regras ativo ou com snapshot incompleto — elegibilidade não verificável.',
      caveats,
    };
  }

  if (overallStatus === 'breached') {
    const blockingRule: BoundRuleKey | 'overall' =
      dailyLoss?.status === 'breached' ? 'daily_loss' : maxDrawdown?.status === 'breached' ? 'max_drawdown' : 'overall';
    return {
      status: 'not_eligible',
      blockingRule,
      message: 'A conta tem um limite operacional violado — não é elegível para saque.',
      caveats,
    };
  }

  if (consistency?.status === 'breached') {
    return {
      status: 'not_eligible',
      blockingRule: 'consistency',
      message: 'A regra de consistência foi violada — não é elegível para saque.',
      caveats,
    };
  }
  if (!consistency || consistency.status === 'not_monitorable') {
    caveats.push('Regra de consistência não verificada automaticamente — confira o texto oficial.');
  }

  if (!minTradingDays || minTradingDays.status === 'not_monitorable' || minTradingDays.limitValue === null) {
    return {
      status: 'not_determinable',
      blockingRule: 'min_trading_days',
      message: 'Não foi possível verificar automaticamente o mínimo de dias operados desta mesa.',
      caveats,
    };
  }

  if (!profitTarget || profitTarget.status === 'not_monitorable' || profitTarget.limitValue === null) {
    return {
      status: 'not_determinable',
      blockingRule: 'profit_target',
      message: 'Não foi possível verificar automaticamente a meta de lucro desta mesa.',
      caveats,
    };
  }

  if ((profitTarget.currentValue ?? 0) < profitTarget.limitValue) {
    return {
      status: 'not_eligible',
      blockingRule: 'profit_target',
      message: 'A meta de lucro ainda não foi atingida.',
      caveats,
    };
  }

  if ((minTradingDays.currentValue ?? 0) < minTradingDays.limitValue) {
    return {
      status: 'not_eligible',
      blockingRule: 'min_trading_days',
      message: 'O mínimo de dias operados ainda não foi atingido.',
      caveats,
    };
  }

  return {
    status: 'eligible',
    blockingRule: null,
    message: 'Meta de lucro e dias mínimos atingidos, sem violação de consistência ou de risco.',
    caveats,
  };
}

export interface CanonicalEvaluationSummary {
  overallStatus: RuleEvaluationStatus;
  dailyLoss: BoundRuleEvaluation | null;
  maxDrawdown: BoundRuleEvaluation | null;
  profitTarget: BoundRuleEvaluation | null;
  consistency: BoundRuleEvaluation | null;
  minTradingDays: BoundRuleEvaluation | null;
  /** Maior consumo entre os limites de perda calculados (0-100+), ou null. */
  worstLossPercentage: number | null;
  payoutEligibility: PayoutEligibilitySummary;
  evaluatedAt: string;
}

export function summarizeCanonicalEvaluation(row: CanonicalRuleEvaluationRow): CanonicalEvaluationSummary {
  const rules = Array.isArray(row.automatic_rules) ? row.automatic_rules : [];
  const byKey = (key: BoundRuleEvaluation['key']) => rules.find((rule) => rule.key === key) ?? null;
  const dailyLoss = byKey('daily_loss');
  const maxDrawdown = byKey('max_drawdown');
  const profitTarget = byKey('profit_target');
  const consistency = byKey('consistency');
  const minTradingDays = byKey('min_trading_days');
  const lossPercentages = [dailyLoss, maxDrawdown]
    .map((rule) => (rule && Number.isFinite(Number(rule.percentage)) ? Number(rule.percentage) : null))
    .filter((value): value is number => value !== null);
  return {
    overallStatus: row.overall_status,
    dailyLoss,
    maxDrawdown,
    profitTarget,
    consistency,
    minTradingDays,
    worstLossPercentage: lossPercentages.length > 0 ? Math.max(...lossPercentages) : null,
    payoutEligibility: computePayoutEligibility(
      row.overall_status,
      dailyLoss,
      maxDrawdown,
      profitTarget,
      consistency,
      minTradingDays,
    ),
    evaluatedAt: row.evaluated_at,
  };
}
