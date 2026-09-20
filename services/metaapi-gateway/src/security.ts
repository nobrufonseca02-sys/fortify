import { createHash, timingSafeEqual } from 'node:crypto';

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

export type RateLimitDecision = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export class BoundedFixedWindowRateLimiter {
  private readonly buckets = new Map<string, RateLimitBucket>();
  private lastCleanupAt = 0;

  constructor(private readonly maxBuckets: number) {
    if (!Number.isInteger(maxBuckets) || maxBuckets < 1) {
      throw new Error('maxBuckets must be a positive integer');
    }
  }

  check(key: string, maxRequests: number, windowMs: number, now = Date.now()): RateLimitDecision {
    if (!key || !Number.isInteger(maxRequests) || maxRequests < 1 || !Number.isFinite(windowMs) || windowMs < 1) {
      throw new Error('Invalid rate limit configuration');
    }

    if (now - this.lastCleanupAt >= Math.min(windowMs, 30_000) || this.buckets.size >= this.maxBuckets) {
      this.cleanup(now);
    }

    const current = this.buckets.get(key);
    if (!current || current.resetAt <= now) {
      if (!current && this.buckets.size >= this.maxBuckets) this.evictSoonestReset();
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, retryAfterSeconds: 0 };
    }

    current.count += 1;
    if (current.count > maxRequests) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
      };
    }

    return { allowed: true, retryAfterSeconds: 0 };
  }

  get size() {
    return this.buckets.size;
  }

  private cleanup(now: number) {
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
    this.lastCleanupAt = now;
  }

  private evictSoonestReset() {
    let candidateKey: string | null = null;
    let candidateResetAt = Number.POSITIVE_INFINITY;

    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt < candidateResetAt) {
        candidateKey = key;
        candidateResetAt = bucket.resetAt;
      }
    }

    if (candidateKey) this.buckets.delete(candidateKey);
  }
}

export function parsePositiveInteger(value: string | undefined, fallback: number, minimum: number, maximum: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

export function parseTrustedProxyAddresses(value: string | undefined): string[] {
  if (!value?.trim()) return [];

  const addresses = value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (addresses.some((entry) => !/^[A-Fa-f0-9:./]+$/.test(entry))) {
    throw new Error('TRUSTED_PROXY_ADDRESSES must contain only IP addresses or CIDR ranges');
  }

  return addresses;
}

export function secureSecretEquals(received: unknown, expected: string): boolean {
  if (typeof received !== 'string' || !received || !expected) return false;
  const receivedDigest = createHash('sha256').update(received).digest();
  const expectedDigest = createHash('sha256').update(expected).digest();
  return timingSafeEqual(receivedDigest, expectedDigest);
}

export function safeErrorMetadata(error: unknown) {
  if (!error || typeof error !== 'object') return { errorType: typeof error };
  const candidate = error as { name?: unknown; code?: unknown; status?: unknown; statusCode?: unknown };
  return {
    errorType: typeof candidate.name === 'string' ? candidate.name.slice(0, 80) : 'Error',
    errorCode: typeof candidate.code === 'string' ? candidate.code.slice(0, 80) : undefined,
    statusCode:
      typeof candidate.statusCode === 'number'
        ? candidate.statusCode
        : typeof candidate.status === 'number'
          ? candidate.status
          : undefined,
  };
}
