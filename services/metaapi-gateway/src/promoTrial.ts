// Trial promocional do Fortify Guard. Quem se cadastra pelo link da campanha (?promo=guard3d)
// recebe 3 dias do plano Beginner (1 conta MT5) com status `trialing`. O gateway libera o EA
// enquanto `paid_until` estiver no futuro e passa a recusar (`plan_inactive`) quando vencer,
// sem nenhuma rotina extra: é a mesma regra de entitlement de qualquer assinatura.
//
// Quem decide é sempre o gateway (service role). O navegador só informa o código da campanha;
// a tabela `user_subscriptions` não aceita escrita do próprio usuário (RLS).

export interface PromoTrial {
  code: string;
  planId: string;
  planName: string;
  accountLimit: number;
  days: number;
  /** Depois desta data o link para de liberar trial novo. */
  endsAt: string;
}

export const PROMO_TRIALS: Record<string, PromoTrial> = {
  guard3d: {
    code: 'guard3d',
    planId: 'beginner_monthly',
    planName: 'Fortify Guard (Trial 3 Dias)',
    accountLimit: 1,
    days: 3,
    endsAt: '2026-11-30T23:59:59-03:00',
  },
};

export function normalizePromoCode(raw: unknown) {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 40);
}

export interface TrialSubscriptionRow {
  plan_id?: string | null;
  status?: string | null;
  stripe_subscription_id?: string | null;
  activated_at?: string | null;
}

export type TrialDecision =
  | { ok: true; promo: PromoTrial; insert: boolean }
  | { ok: false; status: number; code: string; message: string };

/**
 * Só ganha trial quem está no plano gratuito de cadastro (`beta_free`) e nunca teve assinatura
 * na Stripe. Quem já usou o trial fica com `beginner_monthly` (vencido ou não) e não ganha outro;
 * quem paga ou já pagou também não.
 */
export function decidePromoTrial(rawPromo: unknown, row: TrialSubscriptionRow | null, now: Date = new Date()): TrialDecision {
  const promo = PROMO_TRIALS[normalizePromoCode(rawPromo)];
  if (!promo) {
    return { ok: false, status: 400, code: 'promo_invalid', message: 'Este link de promoção não existe.' };
  }
  if (now.getTime() > Date.parse(promo.endsAt)) {
    return { ok: false, status: 410, code: 'promo_ended', message: 'Esta promoção já terminou.' };
  }
  if (!row) {
    return { ok: true, promo, insert: true };
  }
  const planId = String(row.plan_id || '').toLowerCase();
  if (planId !== 'beta_free' || row.stripe_subscription_id) {
    return {
      ok: false,
      status: 409,
      code: 'promo_not_eligible',
      message: 'O teste grátis vale só para contas novas que ainda não assinaram o Fortify.',
    };
  }
  return { ok: true, promo, insert: false };
}

/** Campos gravados em `user_subscriptions` para o trial. */
export function trialSubscriptionFields(promo: PromoTrial, now: Date = new Date()) {
  const start = now.toISOString();
  const end = new Date(now.getTime() + promo.days * 24 * 60 * 60 * 1000).toISOString();
  return {
    plan_id: promo.planId,
    plan_name: promo.planName,
    status: 'trialing',
    account_limit: promo.accountLimit,
    current_period_start: start,
    current_period_end: end,
    paid_until: end,
    activated_at: start,
    updated_at: start,
  };
}

/**
 * Assinatura do teste grátis: `trialing` sem assinatura na Stripe. No teste o Fortify Guard
 * funciona só pelo EA no MT5; o gateway nunca liga conta no MetaApi para ela (custo zero).
 */
export function isPromoTrialRow(row: { status?: unknown; stripe_subscription_id?: unknown } | null | undefined) {
  return Boolean(row) && String(row?.status || '').toLowerCase() === 'trialing' && !row?.stripe_subscription_id;
}
