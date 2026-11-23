import assert from 'node:assert/strict';
import test from 'node:test';
import { couponDiscountCents, isKnownCoupon, normalizeCouponCode, resolveCheckoutCoupon } from './checkoutCoupons';

test('cupom FORTIFY deixa os planos em R$ 197, R$ 397 e R$ 797', () => {
  assert.equal(29_700 - couponDiscountCents('FORTIFY', 'beginner_monthly'), 19_700);
  assert.equal(49_700 - couponDiscountCents('FORTIFY', 'advanced_monthly'), 39_700);
  assert.equal(99_700 - couponDiscountCents('FORTIFY', 'pro_monthly'), 79_700);
});

test('cupom aceita minúsculas e espaços', () => {
  assert.equal(normalizeCouponCode('  fortify '), 'FORTIFY');
  const resolved = resolveCheckoutCoupon(' Fortify', 'pro_monthly');
  assert.deepEqual(resolved, { ok: true, code: 'FORTIFY', stripeCouponId: 'FORTIFY_PRO', amountOffCents: 20_000 });
});

test('sem cupom, nada muda no checkout', () => {
  assert.equal(resolveCheckoutCoupon('', 'pro_monthly'), null);
  assert.equal(resolveCheckoutCoupon(undefined, 'pro_monthly'), null);
});

test('código de um plano só vale para ele', () => {
  assert.equal(couponDiscountCents('FORTIFYPRO', 'pro_monthly'), 20_000);
  assert.equal(couponDiscountCents('FORTIFYPRO', 'beginner_monthly'), 0);
  assert.equal(resolveCheckoutCoupon('fortifybeginner', 'advanced_monthly')?.ok, false);
  assert.equal(couponDiscountCents('FORTIFYADVANCED', 'advanced_monthly'), 10_000);
});

test('cupom desconhecido ou fora dos planos mensais é recusado', () => {
  const unknown = resolveCheckoutCoupon('GRATIS', 'pro_monthly');
  assert.equal(unknown?.ok, false);
  const enterprise = resolveCheckoutCoupon('FORTIFY', 'enterprise_monthly');
  assert.equal(enterprise?.ok, false);
  assert.equal(couponDiscountCents('FORTIFY', 'beginner_annual'), 0);
});

test('GUARD97 deixa o Beginner em R$ 97 até 30/11/2026 às 23h59 de Brasília', () => {
  const during = new Date('2026-11-23T12:00:00-03:00');
  assert.equal(29_700 - couponDiscountCents('guard97', 'beginner_monthly', during), 9_700);
  assert.deepEqual(resolveCheckoutCoupon('GUARD97', 'beginner_monthly', during), {
    ok: true,
    code: 'GUARD97',
    stripeCouponId: 'FORTIFY_GUARD_97',
    amountOffCents: 20_000,
  });
  const lastMinute = new Date('2026-11-30T23:59:00-03:00');
  assert.equal(resolveCheckoutCoupon('GUARD97', 'beginner_monthly', lastMinute)?.ok, true);
});

test('GUARD97 só vale para o Beginner mensal', () => {
  const during = new Date('2026-11-23T12:00:00-03:00');
  assert.equal(couponDiscountCents('GUARD97', 'advanced_monthly', during), 0);
  assert.equal(couponDiscountCents('GUARD97', 'pro_monthly', during), 0);
  assert.equal(resolveCheckoutCoupon('GUARD97', 'advanced_monthly', during)?.ok, false);
});

test('GUARD97 expira em 01/12/2026 00h00 de Brasília', () => {
  const after = new Date('2026-12-01T00:00:00-03:00');
  const expired = resolveCheckoutCoupon('GUARD97', 'beginner_monthly', after);
  assert.equal(expired?.ok, false);
  assert.equal(expired && !expired.ok ? expired.reason : null, 'expired');
  assert.equal(couponDiscountCents('GUARD97', 'beginner_monthly', after), 0);
  assert.equal(isKnownCoupon('GUARD97', after), false);
  // Os cupons sem prazo continuam valendo.
  assert.equal(couponDiscountCents('FORTIFY', 'beginner_monthly', after), 10_000);
});
