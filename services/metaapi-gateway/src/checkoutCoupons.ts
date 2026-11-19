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

export const CHECKOUT_COUPONS: Record<string, Record<string, CheckoutCouponPlan>> = {
  // Para sempre: Beginner R$ 297 -> R$ 197, Advanced R$ 497 -> R$ 397, Pro R$ 997 -> R$ 797.
  FORTIFY: { beginner_monthly: BEGINNER, advanced_monthly: ADVANCED, pro_monthly: PRO },
  // Códigos de um plano só. São os mesmos códigos promocionais criados na Stripe, então
  // valem também digitados na página de pagamento da Stripe.
  FORTIFYBEGINNER: { beginner_monthly: BEGINNER },
  FORTIFYADVANCED: { advanced_monthly: ADVANCED },
  FORTIFYPRO: { pro_monthly: PRO },
};

export function normalizeCouponCode(raw: unknown) {
  return String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .slice(0, 40);
}

export function isKnownCoupon(raw: unknown) {
  return Boolean(CHECKOUT_COUPONS[normalizeCouponCode(raw)]);
}

/** Desconto do cupom neste plano, em centavos. 0 quando o cupom não vale para o plano. */
export function couponDiscountCents(raw: unknown, planSlug: string | null | undefined) {
  return CHECKOUT_COUPONS[normalizeCouponCode(raw)]?.[String(planSlug ?? '')]?.amountOffCents ?? 0;
}

export type CouponResolution =
  | { ok: true; code: string; stripeCouponId: string; amountOffCents: number }
  | { ok: false; code: string; reason: 'unknown' | 'plan'; message: string };

/** null: o comprador não informou cupom. */
export function resolveCheckoutCoupon(raw: unknown, planSlug: string | null | undefined): CouponResolution | null {
  const code = normalizeCouponCode(raw);
  if (!code) return null;
  const coupon = CHECKOUT_COUPONS[code];
  if (!coupon) {
    return { ok: false, code, reason: 'unknown', message: `O cupom ${code} não existe ou expirou.` };
  }
  const plan = coupon[String(planSlug ?? '')];
  if (!plan) {
    return { ok: false, code, reason: 'plan', message: `O cupom ${code} não vale para este plano.` };
  }
  return { ok: true, code, stripeCouponId: plan.stripeCouponId, amountOffCents: plan.amountOffCents };
}
