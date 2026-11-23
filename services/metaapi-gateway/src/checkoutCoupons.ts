// Cupons do checkout. O desconto em reais muda por plano, e um código digitado na
// página da Stripe só aponta para um cupom. Por isso o Fortify recebe o código, escolhe
// o cupom da Stripe certo para o plano e já abre o pagamento com o desconto aplicado.
// Este arquivo é a única fonte da regra: o gateway cobra com ele e o site mostra o preço com ele.

export interface CheckoutCouponPlan {
  /** ID do cupom criado na Stripe (valor fixo, vale só para o produto do plano). */
  stripeCouponId: string;
  /** Desconto em centavos, igual ao `amount_off` do cupom na Stripe. */
  amountOffCents: number;
}

const BEGINNER: CheckoutCouponPlan = { stripeCouponId: 'FORTIFY_BEGINNER', amountOffCents: 10_000 };
const ADVANCED: CheckoutCouponPlan = { stripeCouponId: 'FORTIFY_ADVANCED', amountOffCents: 10_000 };
const PRO: CheckoutCouponPlan = { stripeCouponId: 'FORTIFY_PRO', amountOffCents: 20_000 };
// Oferta de lançamento do Fortify Guard: Beginner R$ 297 -> R$ 97 por 12 meses. Na Stripe o cupom é
// de valor fixo (R$ 200), duração "repeating" de 12 meses e limitado ao produto do Beginner.
const GUARD_97: CheckoutCouponPlan = { stripeCouponId: 'FORTIFY_GUARD_97', amountOffCents: 20_000 };

/** Fim da oferta de R$ 97: 30/11/2026 às 23h59 de Brasília. */
export const GUARD97_OFFER_ENDS_AT = '2026-11-30T23:59:59-03:00';
export const GUARD97_COUPON_CODE = 'GUARD97';

export const CHECKOUT_COUPONS: Record<string, Record<string, CheckoutCouponPlan>> = {
  // Para sempre: Beginner R$ 297 -> R$ 197, Advanced R$ 497 -> R$ 397, Pro R$ 997 -> R$ 797.
  FORTIFY: { beginner_monthly: BEGINNER, advanced_monthly: ADVANCED, pro_monthly: PRO },
  // Códigos de um plano só. São os mesmos códigos promocionais criados na Stripe, então
  // valem também digitados na página de pagamento da Stripe.
  FORTIFYBEGINNER: { beginner_monthly: BEGINNER },
  FORTIFYADVANCED: { advanced_monthly: ADVANCED },
  FORTIFYPRO: { pro_monthly: PRO },
  // Só o Beginner mensal (1 conta MT5), até GUARD97_OFFER_ENDS_AT.
  GUARD97: { beginner_monthly: GUARD_97 },
};

/** Cupons com prazo. Depois da data, o código deixa de existir para o site e para o gateway. */
export const COUPON_EXPIRES_AT: Record<string, string> = {
  GUARD97: GUARD97_OFFER_ENDS_AT,
};

export function isCouponExpired(raw: unknown, now: Date = new Date()) {
  const expiresAt = COUPON_EXPIRES_AT[normalizeCouponCode(raw)];
  return Boolean(expiresAt) && now.getTime() > Date.parse(expiresAt);
}

export function normalizeCouponCode(raw: unknown) {
  return String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .slice(0, 40);
}

export function isKnownCoupon(raw: unknown, now: Date = new Date()) {
  return Boolean(CHECKOUT_COUPONS[normalizeCouponCode(raw)]) && !isCouponExpired(raw, now);
}

/** Desconto do cupom neste plano, em centavos. 0 quando o cupom não vale para o plano. */
export function couponDiscountCents(raw: unknown, planSlug: string | null | undefined, now: Date = new Date()) {
  if (isCouponExpired(raw, now)) return 0;
  return CHECKOUT_COUPONS[normalizeCouponCode(raw)]?.[String(planSlug ?? '')]?.amountOffCents ?? 0;
}

export type CouponResolution =
  | { ok: true; code: string; stripeCouponId: string; amountOffCents: number }
  | { ok: false; code: string; reason: 'unknown' | 'plan' | 'expired'; message: string };

/** null: o comprador não informou cupom. */
export function resolveCheckoutCoupon(
  raw: unknown,
  planSlug: string | null | undefined,
  now: Date = new Date(),
): CouponResolution | null {
  const code = normalizeCouponCode(raw);
  if (!code) return null;
  const coupon = CHECKOUT_COUPONS[code];
  if (coupon && isCouponExpired(code, now)) {
    return { ok: false, code, reason: 'expired', message: `O cupom ${code} expirou.` };
  }
  if (!coupon) {
    return { ok: false, code, reason: 'unknown', message: `O cupom ${code} não existe ou expirou.` };
  }
  const plan = coupon[String(planSlug ?? '')];
  if (!plan) {
    return { ok: false, code, reason: 'plan', message: `O cupom ${code} não vale para este plano.` };
  }
  return { ok: true, code, stripeCouponId: plan.stripeCouponId, amountOffCents: plan.amountOffCents };
}
