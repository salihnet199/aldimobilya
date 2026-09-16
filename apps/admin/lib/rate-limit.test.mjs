/**
 * Unit tests for the bounded local rate limiter and its key helpers.
 *
 *   node --test apps/admin/lib/rate-limit.test.mjs
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  accountDigest,
  clientIpFromHeaders,
  createRateLimiter,
  isDistributedRateLimitConfigured,
  rateLimitKey,
  trustProxyFromEnv,
} from './rate-limit.ts';

function headersOf(values) {
  const map = new Map(Object.entries(values).map(([k, v]) => [k.toLowerCase(), v]));
  return { get: (name) => map.get(name.toLowerCase()) ?? null };
}

describe('createRateLimiter', () => {
  it('allows up to max attempts then blocks with a retry hint', () => {
    const limiter = createRateLimiter({ max: 3, windowMs: 1000, now: () => 0 });

    assert.deepEqual(limiter.check('k'), {
      allowed: true,
      remaining: 2,
      retryAfterMs: 0,
      limit: 3,
    });
    assert.equal(limiter.check('k').remaining, 1);
    assert.equal(limiter.check('k').allowed, true);

    const blocked = limiter.check('k');
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.remaining, 0);
    assert.equal(blocked.retryAfterMs, 1000);
  });

  it('isolates keys and resets after the window elapses', () => {
    let clock = 0;
    const limiter = createRateLimiter({ max: 2, windowMs: 500, now: () => clock });

    assert.equal(limiter.check('a').allowed, true);
    assert.equal(limiter.check('a').allowed, true);
    assert.equal(limiter.check('a').allowed, false);

    // A different key is unaffected.
    assert.equal(limiter.check('b').allowed, true);

    clock = 499;
    assert.equal(limiter.check('a').allowed, false);
    clock = 500;
    assert.equal(limiter.check('a').allowed, true);
    assert.equal(limiter.check('a').remaining, 0);
  });

  it('never grows past maxKeys', () => {
    const limiter = createRateLimiter({ max: 5, windowMs: 60_000, maxKeys: 4, now: () => 0 });
    for (let i = 0; i < 50; i += 1) limiter.check(`key-${i}`);
    assert.ok(limiter.size() <= 4, `expected <= 4 keys, got ${limiter.size()}`);
  });

  it('supports targeted and full reset', () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 1000, now: () => 0 });
    limiter.check('a');
    limiter.check('b');
    assert.equal(limiter.size(), 2);

    limiter.reset('a');
    assert.equal(limiter.size(), 1);
    assert.equal(limiter.check('a').allowed, true);

    limiter.reset();
    assert.equal(limiter.size(), 0);
  });
});

describe('accountDigest', () => {
  it('is deterministic, normalized and non-reversible-looking', () => {
    const digest = accountDigest('  Admin@Example.COM ');
    assert.equal(digest, accountDigest('admin@example.com'));
    assert.match(digest, /^[0-9a-f]{64}$/);
    assert.equal(digest.includes('admin@example.com'), false);
  });

  it('differs per account and per salt', () => {
    assert.notEqual(accountDigest('a@example.com'), accountDigest('b@example.com'));
    assert.notEqual(accountDigest('a@example.com'), accountDigest('a@example.com', 'pepper'));
    assert.equal(accountDigest('a@example.com', 'pepper'), accountDigest('a@example.com', 'pepper'));
  });

  it('handles non-string identifiers without throwing', () => {
    assert.equal(accountDigest(undefined), accountDigest(''));
    assert.equal(accountDigest(null), accountDigest(''));
  });
});

describe('rateLimitKey', () => {
  it('includes the IP only when one is available', () => {
    assert.equal(rateLimitKey({ accountDigest: 'abc' }), 'acct:abc');
    assert.equal(rateLimitKey({ accountDigest: 'abc', ip: null }), 'acct:abc');
    assert.equal(rateLimitKey({ accountDigest: 'abc', ip: '1.2.3.4' }), 'acct:abc|ip:1.2.3.4');
    assert.equal(rateLimitKey({ accountDigest: '' }), 'acct:anonymous');
  });
});

describe('clientIpFromHeaders', () => {
  it('ignores X-Forwarded-For unless a trusted proxy is configured', () => {
    const headers = headersOf({ 'x-forwarded-for': '203.0.113.9, 10.0.0.1' });
    assert.equal(clientIpFromHeaders(headers, { trustProxy: false }), null);
  });

  it('uses the right-most hop when the proxy is trusted', () => {
    const headers = headersOf({ 'x-forwarded-for': '203.0.113.9, 198.51.100.7' });
    assert.equal(clientIpFromHeaders(headers, { trustProxy: true }), '198.51.100.7');
  });

  it('skips junk hops and returns null when nothing parses', () => {
    assert.equal(
      clientIpFromHeaders(headersOf({ 'x-forwarded-for': 'evil, 198.51.100.7' }), {
        trustProxy: true,
      }),
      '198.51.100.7',
    );
    assert.equal(
      clientIpFromHeaders(headersOf({ 'x-forwarded-for': 'not-an-ip' }), { trustProxy: true }),
      null,
    );
    assert.equal(
      clientIpFromHeaders(headersOf({ 'x-forwarded-for': '999.1.1.1' }), { trustProxy: true }),
      null,
    );
    assert.equal(clientIpFromHeaders(headersOf({}), { trustProxy: true }), null);
  });
});

describe('environment helpers', () => {
  it('only trusts an explicit proxy opt-in', () => {
    assert.equal(trustProxyFromEnv({}), false);
    assert.equal(trustProxyFromEnv({ ADMIN_TRUST_PROXY: 'false' }), false);
    assert.equal(trustProxyFromEnv({ ADMIN_TRUST_PROXY: 'true' }), true);
    assert.equal(trustProxyFromEnv({ ADMIN_TRUST_PROXY: '1' }), true);
  });

  it('reports that no distributed limiter is configured by default', () => {
    assert.equal(isDistributedRateLimitConfigured({}), false);
    assert.equal(
      isDistributedRateLimitConfigured({ ADMIN_RATE_LIMIT_BACKEND_URL: 'redis://x' }),
      true,
    );
  });
});
