import type { FortifyPlan } from '@/hooks/useSubscriptionPlan';

export const EXTRA_ACCOUNT_ADDON_SLUG = 'extra_account_monthly';

/**
 * O que não varia entre os planos. Sai dos cards para uma faixa única: com
 * isso cada card mostra só o que de fato distingue um plano do outro
 * (preço, limite de contas e suporte), que é o que torna a comparação rápida.
 */
export const INCLUDED_IN_EVERY_PLAN = [
  'Monitoramento de perda diária, perda total e drawdown',
  'Regras versionadas e auditáveis por conta',
  'Alertas de limite crítico',
  'Biblioteca de mesas proprietárias',
  'Calculadora de risco por operação',
  'Painel de saúde da conta MT5',
];

/**
 * Catálogo comercial (o que aparece à venda). Desde 11/11/2026 são três planos:
 * Beginner, Advanced e Pro, em mensal e semestral. O Enterprise saiu da vitrine
 * por ora — as linhas dele continuam no banco para não quebrar quem já assina,
 * mas não aparecem em nenhuma tela de compra ou troca de plano.
 *
 * Os anuais também ficam de fora: os Prices deles foram criados em modo teste e
 * nunca existiram na Stripe live (ver docs/fortify/07-stripe-billing.md).
 *
 * O Pro semestral é vendido com checkout como os outros. Enquanto a linha
 * dele não tiver Price ID no banco, o card cai para "A consultar" (ver
 * SEMESTRAL_SOB_CONSULTA) em vez de sumir da vitrine.
 */
export const MAIN_PLAN_SLUGS = new Set([
  'beginner_monthly',
  'advanced_monthly',
  'pro_monthly',
  'beginner_semiannual',
  'advanced_semiannual',
  'pro_semiannual',
]);

/** Valor de `plans.billing_interval` dos planos cobrados a cada seis meses. */
export const SEMESTER_INTERVAL = 'semester';

export type IntervaloCobranca = 'month' | typeof SEMESTER_INTERVAL;

/**
 * Famílias cujo semestral, se ainda não tiver checkout configurado, aparece
 * como "A consultar" (conversa no WhatsApp) em vez de desaparecer.
 */
export const SEMESTRAL_SOB_CONSULTA = ['pro'];

export function isCommercialPlan(plan: FortifyPlan) {
  return MAIN_PLAN_SLUGS.has(String(plan.slug || plan.id));
}

/** Cada semestral e o mensal da mesma família, para mostrar a economia real. */
const PARES_SEMESTRAL_MENSAL: [string, string][] = [
  ['beginner_semiannual', 'beginner_monthly'],
  ['advanced_semiannual', 'advanced_monthly'],
];

function centavos(plan?: FortifyPlan | null) {
  return Number(plan?.price_amount ?? plan?.price_cents ?? 0);
}

/** Quanto o semestral sai mais barato que seis mensalidades, em centavos. */
export function economiaSemestral(precoSemestral?: number | null, precoMensal?: number | null) {
  const semestral = Number(precoSemestral ?? 0);
  const mensal = Number(precoMensal ?? 0);
  if (semestral <= 0 || mensal <= 0) return null;
  return mensal * 6 - semestral;
}

/**
 * A aba semestral pode ser exibida? Só se os semestrais com checkout estiverem
 * TODOS compráveis (Price ID válido) e nenhum custar mais que seis
 * mensalidades — isso seria erro de cadastro, não oferta. Enquanto faltar um
 * Price ID, a aba fica "em breve" e liga sozinha quando o banco for preenchido.
 */
export function semestraisProntosParaVenda(planos: FortifyPlan[]) {
  const por = (chave: string) => planos.find((p) => String(p.slug || p.id) === chave);
  return PARES_SEMESTRAL_MENSAL.every(([semestralSlug, mensalSlug]) => {
    const semestral = por(semestralSlug);
    const mensal = por(mensalSlug);
    if (!semestral || !mensal) return false;
    if (!hasConfiguredPrice(semestral)) return false;
    const economia = economiaSemestral(centavos(semestral), centavos(mensal));
    return economia !== null && economia >= 0;
  });
}

/**
 * Oferta de lançamento por família. `precoCheio` (em reais) é opcional: só
 * preencha com um preço que de fato será cobrado depois do lançamento — preço
 * "de" inventado é publicidade enganosa (CDC art. 37). Sem ele, o card mostra
 * o selo e a nota, sem valor riscado.
 */
type OfertaLancamento = { selo: string; nota: string; precoCheio?: number | null };

export const OFERTA_LANCAMENTO: Record<string, OfertaLancamento> = {
  advanced: {
    selo: 'Oferta de lançamento',
    nota: 'Preço de lançamento, por tempo limitado.',
    precoCheio: null,
  },
};

export function ofertaLancamento(plan: FortifyPlan): OfertaLancamento | null {
  return OFERTA_LANCAMENTO[planFamily(plan)] ?? null;
}

function brl(valorEmReais: number, casas = 0) {
  return valorEmReais.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

/**
 * Linha de apoio do card semestral: o equivalente por mês e, quando o mensal
 * da mesma família existe, quanto sai mais barato que seis mensalidades.
 */
export function detalheSemestral(semestral: FortifyPlan, mensal?: FortifyPlan | null) {
  if (semestral.billing_interval !== SEMESTER_INTERVAL) return null;
  const total = centavos(semestral);
  if (total <= 0) return null;
  const porMes = brl(total / 6 / 100, 2);
  const economia = economiaSemestral(total, centavos(mensal));
  if (economia && economia > 0) {
    const casas = economia % 100 === 0 ? 0 : 2;
    return `Equivale a ${porMes}/mês. ${brl(economia / 100, casas)} a menos que 6 mensalidades.`;
  }
  return `Equivale a ${porMes}/mês.`;
}

export const supportLabels: Record<string, string> = {
  basic: 'Suporte básico',
  standard: 'Suporte padrão',
  priority: 'Suporte prioritário',
  enterprise: 'Suporte VIP/Enterprise',
};

export const bestFor: Record<string, string> = {
  beginner: 'Para validar a primeira conta com controle de risco.',
  advanced: 'Para acompanhar até três contas.',
  pro: 'Para acompanhar até cinco contas com suporte prioritário.',
  enterprise: 'Para operações com até dez contas e suporte VIP.',
};

export function planFamily(plan: FortifyPlan) {
  const slug = String(plan.slug || plan.id).toLowerCase();
  if (slug.includes('enterprise')) return 'enterprise';
  if (slug.includes('advanced')) return 'advanced';
  if (slug.includes('pro')) return 'pro';
  if (slug.includes('beginner')) return 'beginner';
  return slug;
}

export function isAddonPlan(plan: FortifyPlan) {
  const slug = String(plan.slug || plan.id).toLowerCase();
  return String(plan.plan_type || '').toLowerCase() === 'add_on' || slug === EXTRA_ACCOUNT_ADDON_SLUG;
}

export function isValidStripePrice(value?: string | null) {
  return typeof value === 'string' && /^price_[A-Za-z0-9]+$/.test(value);
}

export function hasConfiguredPrice(plan: FortifyPlan) {
  const amount = Number(plan.price_amount ?? plan.price_cents ?? 0);
  return amount > 0 && isValidStripePrice(plan.stripe_price_id);
}

export function intervalLabel(interval?: string | null) {
  if (interval === 'year') return 'ano';
  if (interval === SEMESTER_INTERVAL) return '6 meses';
  return 'mês';
}

/** Raw major-unit amount for NumberFlow, which formats its own currency string. */
export function priceValue(plan: FortifyPlan) {
  return Number(plan.price_amount ?? plan.price_cents ?? 0) / 100;
}

/**
 * O limite de contas e o nível de suporte já têm lugar próprio no card.
 * Vários registros de plan_features repetem exatamente essas duas
 * informações ('ate 3 contas MT5', 'suporte padrao'), então elas são
 * filtradas para a lista secundária mostrar só o que é de fato novo.
 */
export function secondaryFeatures(plan: FortifyPlan) {
  return (Array.isArray(plan.plan_features) ? plan.plan_features : []).filter(
    (feature) => !/conta|suporte/i.test(String(feature)),
  );
}
