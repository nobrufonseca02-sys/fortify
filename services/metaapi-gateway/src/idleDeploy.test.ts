import test from 'node:test';
import assert from 'node:assert/strict';
import { IDLE_TIMEOUT_MS, isUserOnline, metaApiEnabled, planIdleUndeploys, type IdleConnection } from './idleDeploy';

const NOW = Date.parse('2026-11-06T12:00:00Z');
const conn = (overrides: Partial<IdleConnection>): IdleConnection => ({
  id: 'c1',
  user_id: 'u1',
  provider_account_id: 'p1',
  sync_status: 'success',
  ...overrides,
});

test('usuário sem presença registrada conta como offline', () => {
  assert.equal(isUserOnline(undefined, NOW), false);
});

test('usuário visto há menos de 30 min está online; 30 min ou mais, offline', () => {
  assert.equal(isUserOnline(NOW - (IDLE_TIMEOUT_MS - 1), NOW), true);
  assert.equal(isUserOnline(NOW - IDLE_TIMEOUT_MS, NOW), false);
});

test('desimplanta a conta de quem está offline', () => {
  const plans = planIdleUndeploys([conn({})], new Map([['u1', NOW - IDLE_TIMEOUT_MS - 1]]), NOW);
  assert.deepEqual(plans, [{ providerAccountId: 'p1', connectionIds: ['c1'] }]);
});

test('não mexe na conta de quem está online', () => {
  const plans = planIdleUndeploys([conn({})], new Map([['u1', NOW - 60_000]]), NOW);
  assert.deepEqual(plans, []);
});

test('não repete o undeploy de conta já pausada por inatividade', () => {
  const plans = planIdleUndeploys([conn({ idle_undeployed_at: '2026-11-06T11:00:00Z' })], new Map(), NOW);
  assert.deepEqual(plans, []);
});

test('ignora conta removida, suspensa por assinatura ou sem conta MetaApi', () => {
  const plans = planIdleUndeploys(
    [
      conn({ id: 'a', sync_status: 'removed' }),
      conn({ id: 'b', provider_account_id: 'p2', suspended_at: '2026-11-01T00:00:00Z' }),
      conn({ id: 'c', provider_account_id: 'p3', sync_status: 'suspension_pending' }),
      conn({ id: 'd', provider_account_id: null }),
    ],
    new Map(),
    NOW,
  );
  assert.deepEqual(plans, []);
});

test('conta apontada por dois usuários fica implantada se um deles estiver online', () => {
  const plans = planIdleUndeploys(
    [conn({ id: 'a', user_id: 'u1' }), conn({ id: 'b', user_id: 'u2' })],
    new Map([['u2', NOW - 60_000]]),
    NOW,
  );
  assert.deepEqual(plans, []);
});

test('MetaApi fica desligada por padrão: sem METAAPI_ENABLED=true o servidor não religa conta antiga', () => {
  assert.equal(metaApiEnabled({}), false);
  assert.equal(metaApiEnabled({ METAAPI_ENABLED: 'false' }), false);
  assert.equal(metaApiEnabled({ METAAPI_ENABLED: '1' }), false);
  assert.equal(metaApiEnabled({ METAAPI_ENABLED: ' TRUE ' }), true);
});
