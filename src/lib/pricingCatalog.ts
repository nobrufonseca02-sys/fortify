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

// Monthly only, deliberately. Annual rows exist in the plans table
// (beginner_annual etc., migration 20260608090000_resolved_stripe_price_ids.sql)
// but per that migration's own header their Stripe prices were created in
// *test* mode and were never re-verified against whatever mode the gateway's
// live key actually uses — docs/fortify/07-stripe-billing.md still documents
// the commercial catalog as monthly-only. Surfacing them here without first
// validating each price against live Stripe (and re-deriving whether the
// annual discount is still real — Enterprise's has decayed to ~0% since the
// monthly price was last updated) risks a real checkout failure or, worse, a
// captured payment with no matching entitlement. Don't add them back without
// doing that verification first.
export const MAIN_PLAN_SLUGS = new Set([
  'beginner_monthly',
  'advanced_monthly',
  'pro_monthly',
  'enterprise_monthly',
  'beginner_annual',
  'advanced_annual',
  'pro_annual',
  'enterprise_annual',
]);

/** Cada anual e o mensal da mesma familia, para calcular o desconto real. */
const PARES_ANUAL_MENSAL: [string, string][] = [
  ['beginner_annual', 'beginner_monthly'],
  ['advanced_annual', 'advanced_monthly'],
  ['pro_annual', 'pro_monthly'],
  ['enterprise_annual', 'enterprise_monthly'],
];

/**
 * Desconto minimo para um plano anual poder ir para a tela.
 *
 * O anual do Enterprise esta cadastrado com 0,17% de desconto (R$10.147 contra
 * R$10.164 de doze mensalidades: R$17 de economia para travar um ano). Isso nao
 * passa como oferta — passa como erro de cadastro, ou pior, como pegadinha.
 *
 * A trava existe para o problema ser de DADO, nao de codigo: enquanto qualquer
 * anual estiver abaixo deste piso, a aba anual inteira fica desligada com o
 * motivo na tela. Corrigido o preco no banco, ela liga sozinha, sem deploy.
 */
const DESCONTO_ANUAL_MINIMO = 0.05;

/** Desconto do anual sobre doze mensalidades. `null` se faltar algum preco. */
export function descontoAnual(precoAnual?: number | null, precoMensal?: number | null) {
  const anual = Number(precoAnual ?? 0);
  const mensal = Number(precoMensal ?? 0);
  if (anual <= 0 || mensal <= 0) return null;
  return 1 - anual / (mensal * 12);
}

/**
 * A aba anual pode ser exibida? Só se TODOS os quatro anuais estiverem
 * compraveis e com desconto acima do piso — mostrar tres de quatro deixaria a
 * tela inconsistente e faria o visitante procurar o plano que falta.
 */
export function anuaisProntosParaVenda(planos: FortifyPlan[]) {
  const por = (chave: string) => planos.find((p) => String(p.slug || p.id) === chave);
  return PARES_ANUAL_MENSAL.every(([anualSlug, mensalSlug]) => {
    const anual = por(anualSlug);
    const mensal = por(mensalSlug);
    if (!anual || !mensal) return false;
    if (!hasConfiguredPrice(anual)) return false;
    const desconto = descontoAnual(
      anual.price_amount ?? anual.price_cents,
      mensal.price_amount ?? mensal.price_cents,
    );
    return desconto !== null && desconto >= DESCONTO_ANUAL_MINIMO;
  });
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
  return interval === 'year' ? 'ano' : 'mês';
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
