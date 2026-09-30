import assert from 'node:assert/strict';
import test from 'node:test';
import {
  UpstreamTimeoutError,
  classifyFetchError,
  classifyHttpStatus,
  fetchWithTimeout,
  syncFailureState,
  worstFailureKind,
} from './upstream';

test('classifica status HTTP sem tratar tudo como autenticação', () => {
  assert.equal(classifyHttpStatus(200), null);
  assert.equal(classifyHttpStatus(401), 'auth');
  assert.equal(classifyHttpStatus(403), 'auth');
  assert.equal(classifyHttpStatus(404), 'not_found');
  assert.equal(classifyHttpStatus(429), 'rate_limited');
  assert.equal(classifyHttpStatus(500), 'temporary');
  assert.equal(classifyHttpStatus(503), 'temporary');
  assert.equal(classifyHttpStatus(400), 'client_error');
});

test('só 401/403 marcam a conexão como auth_error', () => {
  assert.equal(syncFailureState('auth').connectionStatus, 'auth_error');
  for (const kind of ['rate_limited', 'temporary', 'timeout', 'network'] as const) {
    const state = syncFailureState(kind);
    assert.notEqual(state.connectionStatus, 'auth_error', kind);
    assert.equal(state.retryable, true, kind);
  }
  assert.equal(syncFailureState('not_found').connectionStatus, 'disconnected');
});

test('mensagens de falha não carregam detalhes internos', () => {
  for (const kind of ['auth', 'not_found', 'rate_limited', 'temporary', 'timeout', 'network', 'client_error'] as const) {
    const { userMessage } = syncFailureState(kind);
    assert.doesNotMatch(userMessage, /token|stack|status=|\d{3}/i, kind);
  }
});

test('a causa mais acionável vence entre várias falhas', () => {
  assert.equal(worstFailureKind([null, 'temporary', 'auth']), 'auth');
  assert.equal(worstFailureKind(['network', 'rate_limited']), 'rate_limited');
  assert.equal(worstFailureKind([null, null]), null);
});

test('fetchWithTimeout aborta e sinaliza timeout', async () => {
  const hanging: typeof fetch = (_input, init) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    });
  await assert.rejects(fetchWithTimeout('https://example.invalid', {}, 20, hanging), (error: unknown) => {
    assert.ok(error instanceof UpstreamTimeoutError);
    assert.equal(classifyFetchError(error), 'timeout');
    return true;
  });
});

test('erro de rede é classificado como network', async () => {
  const failing: typeof fetch = async () => {
    throw new TypeError('fetch failed');
  };
  await assert.rejects(fetchWithTimeout('https://example.invalid', {}, 1_000, failing), (error: unknown) => {
    assert.equal(classifyFetchError(error), 'network');
    return true;
  });
});

test('resposta rápida passa normalmente', async () => {
  const ok: typeof fetch = async () => new Response('{}', { status: 200 });
  const res = await fetchWithTimeout('https://example.invalid', {}, 1_000, ok);
  assert.equal(res.status, 200);
});
