import assert from 'node:assert/strict';
import test from 'node:test';
import { decidePromoTrial, isPromoTrialRow, normalizePromoCode, trialSubscriptionFields } from './promoTrial';

const during = new Date('2026-11-23T12:00:00-03:00');

test('link guard3d libera 3 dias do Beginner para conta nova no plano gratuito', () => {
  const decision = decidePromoTrial('guard3d', { plan_id: 'beta_free', status: 'active', stripe_subscription_id: null }, during);
  assert.equal(decision.ok, true);
  if (!decision.ok) return;
  assert.equal(decision.insert, false);
  const fields = trialSubscriptionFields(decision.promo, during);
  assert.equal(fields.plan_id, 'beginner_monthly');
  assert.equal(fields.plan_name, 'Fortify Guard (Trial 3 Dias)');
  assert.equal(fields.status, 'trialing');
  assert.equal(fields.account_limit, 1);
  assert.equal(fields.paid_until, fields.current_period_end);
  assert.equal(Date.parse(fields.paid_until) - during.getTime(), 3 * 24 * 60 * 60 * 1000);
});

test('sem linha de assinatura, o trial cria uma', () => {
  const decision = decidePromoTrial('GUARD3D', null, during);
  assert.equal(decision.ok && decision.insert, true);
});

test('código aceita maiúsculas e espaços e recusa código desconhecido', () => {
  assert.equal(normalizePromoCode('  Guard3D '), 'guard3d');
  const unknown = decidePromoTrial('gratis', { plan_id: 'beta_free' }, during);
  assert.equal(unknown.ok, false);
  assert.equal(!unknown.ok && unknown.code, 'promo_invalid');
});

test('quem já usou o trial não ganha outro', () => {
  const again = decidePromoTrial('guard3d', { plan_id: 'beginner_monthly', status: 'trialing' }, during);
  assert.equal(!again.ok && again.code, 'promo_not_eligible');
});

test('assinante ou ex-assinante não ganha trial', () => {
  const paying = decidePromoTrial('guard3d', { plan_id: 'advanced_monthly', status: 'active', stripe_subscription_id: 'sub_1' }, during);
  assert.equal(!paying.ok && paying.code, 'promo_not_eligible');
  const formerPayer = decidePromoTrial('guard3d', { plan_id: 'beta_free', stripe_subscription_id: 'sub_old' }, during);
  assert.equal(!formerPayer.ok && formerPayer.code, 'promo_not_eligible');
});

test('depois de 30/11/2026 23h59 o link não libera trial novo', () => {
  const ended = decidePromoTrial('guard3d', { plan_id: 'beta_free' }, new Date('2026-12-01T00:00:00-03:00'));
  assert.equal(!ended.ok && ended.code, 'promo_ended');
});

test('teste grátis nunca usa MetaApi; assinatura paga continua podendo', () => {
  assert.equal(isPromoTrialRow({ status: 'trialing', stripe_subscription_id: null }), true);
  assert.equal(isPromoTrialRow({ status: 'trialing', stripe_subscription_id: 'sub_1' }), false);
  assert.equal(isPromoTrialRow({ status: 'active', stripe_subscription_id: 'sub_1' }), false);
  assert.equal(isPromoTrialRow(null), false);
});
