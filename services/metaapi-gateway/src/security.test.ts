import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BoundedFixedWindowRateLimiter,
  parsePositiveInteger,
  parseTrustedProxyAddresses,
  safeErrorMetadata,
  secureSecretEquals,
} from './security';

test('rate limiter blocks above the limit and resets after the window', () => {
  const limiter = new BoundedFixedWindowRateLimiter(10);

  assert.equal(limiter.check('billing:127.0.0.1', 2, 1_000, 10).allowed, true);
  assert.equal(limiter.check('billing:127.0.0.1', 2, 1_000, 20).allowed, true);
  assert.deepEqual(limiter.check('billing:127.0.0.1', 2, 1_000, 30), {
    allowed: false,
    retryAfterSeconds: 1,
  });
  assert.equal(limiter.check('billing:127.0.0.1', 2, 1_000, 1_011).allowed, true);
});

test('rate limiter keeps its in-memory state bounded', () => {
  const limiter = new BoundedFixedWindowRateLimiter(2);

  limiter.check('one', 1, 60_000, 1);
  limiter.check('two', 1, 60_000, 2);
  limiter.check('three', 1, 60_000, 3);

  assert.equal(limiter.size, 2);
});

test('trusted proxies accept only explicit IP and CIDR entries', () => {
  assert.deepEqual(parseTrustedProxyAddresses(undefined), []);
  assert.deepEqual(parseTrustedProxyAddresses('127.0.0.1, 10.0.0.0/8, ::1'), ['127.0.0.1', '10.0.0.0/8', '::1']);
  assert.throws(() => parseTrustedProxyAddresses('true'), /IP addresses or CIDR/);
});

test('secret comparison fails closed and supports equal values', () => {
  assert.equal(secureSecretEquals('secret-value', 'secret-value'), true);
  assert.equal(secureSecretEquals('wrong', 'secret-value'), false);
  assert.equal(secureSecretEquals(undefined, 'secret-value'), false);
  assert.equal(secureSecretEquals('secret-value', ''), false);
});

test('security parsing and error metadata do not expose messages', () => {
  assert.equal(parsePositiveInteger('2048', 100, 1, 10_000), 2048);
  assert.equal(parsePositiveInteger('invalid', 100, 1, 10_000), 100);
  assert.deepEqual(safeErrorMetadata(Object.assign(new Error('sensitive detail'), { code: 'E_PROVIDER', status: 502 })), {
    errorType: 'Error',
    errorCode: 'E_PROVIDER',
    statusCode: 502,
  });
});
