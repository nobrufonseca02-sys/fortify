import assert from 'node:assert/strict';
import test from 'node:test';
import { couponDiscountCents, normalizeCouponCode, resolveCheckoutCoupon } from './checkoutCoupons';

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
