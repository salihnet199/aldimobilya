/**
 * Unit tests for the per-route same-origin (CSRF) checks.
 *
 *   node --test apps/admin/lib/origin.test.mjs
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  checkSameOrigin,
  isUnsafeMethod,
  normalizeOrigin,
  trustedOriginsFromEnv,
} from './origin.ts';

const REQUEST_URL = 'https://admin.example.com/api/rooms';

function request(method, headers = {}) {
  return new Request(REQUEST_URL, { method, headers });
}

describe('isUnsafeMethod', () => {
  it('flags state-changing methods only', () => {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'post']) {
      assert.equal(isUnsafeMethod(method), true, method);
    }
    for (const method of ['GET', 'HEAD', 'OPTIONS', undefined, null]) {
      assert.equal(isUnsafeMethod(method), false, String(method));
    }
  });
});

describe('checkSameOrigin', () => {
  it('always allows safe methods, even cross-origin ones', () => {
    const req = request('GET', { origin: 'https://evil.example' });
    assert.deepEqual(checkSameOrigin(req), { ok: true });
  });

  it('allows a matching Origin', () => {
    const req = request('POST', { origin: 'https://admin.example.com' });
    assert.deepEqual(checkSameOrigin(req), { ok: true });
  });

  it('allows a configured trusted origin (proxy / auth URL)', () => {
    const req = request('PUT', { origin: 'https://preview.example.com' });
    assert.deepEqual(checkSameOrigin(req, { trustedOrigins: ['https://preview.example.com'] }), {
      ok: true,
    });
  });

  it('rejects a cross-origin Origin', () => {
    const req = request('DELETE', { origin: 'https://evil.example' });
    assert.deepEqual(checkSameOrigin(req), { ok: false, reason: 'cross_origin' });
  });

  it('rejects an unparseable or non-http(s) Origin', () => {
    assert.deepEqual(checkSameOrigin(request('POST', { origin: 'null' })), {
      ok: false,
      reason: 'cross_origin',
    });
    assert.deepEqual(checkSameOrigin(request('POST', { origin: 'chrome-extension://abc' })), {
      ok: false,
      reason: 'cross_origin',
    });
  });

  it('rejects Sec-Fetch-Site: cross-site before looking at Origin', () => {
    const req = request('POST', {
      origin: 'https://admin.example.com',
      'sec-fetch-site': 'cross-site',
    });
    assert.deepEqual(checkSameOrigin(req), { ok: false, reason: 'cross_site_fetch' });
  });

  it('falls back to Sec-Fetch-Site when Origin is absent', () => {
    assert.deepEqual(checkSameOrigin(request('POST', { 'sec-fetch-site': 'same-origin' })), {
      ok: true,
    });
    assert.deepEqual(checkSameOrigin(request('POST', { 'sec-fetch-site': 'same-site' })), {
      ok: false,
      reason: 'missing_origin',
    });
    assert.deepEqual(checkSameOrigin(request('POST')), {
      ok: false,
      reason: 'missing_origin',
    });
  });
});

describe('normalizeOrigin', () => {
  it('reduces absolute URLs to their origin', () => {
    assert.equal(normalizeOrigin('https://admin.example.com/path?q=1'), 'https://admin.example.com');
    assert.equal(normalizeOrigin(' http://localhost:3000 '), 'http://localhost:3000');
  });

  it('rejects relative, empty and non-http(s) values', () => {
    for (const bad of ['/dashboard', '', '   ', 'javascript:alert(1)', 'ftp://x', null, 7]) {
      assert.equal(normalizeOrigin(bad), null, String(bad));
    }
  });
});

describe('trustedOriginsFromEnv', () => {
  it('collects and de-duplicates AUTH_URL, NEXTAUTH_URL and the extra list', () => {
    assert.deepEqual(
      trustedOriginsFromEnv({
        AUTH_URL: 'https://admin.example.com',
        NEXTAUTH_URL: 'https://admin.example.com/',
        ADMIN_TRUSTED_ORIGINS: 'https://preview.example.com,https://admin.example.com',
      }),
      ['https://admin.example.com', 'https://preview.example.com'],
    );
  });

  it('ignores junk and returns an empty list when nothing is configured', () => {
    assert.deepEqual(trustedOriginsFromEnv({}), []);
    assert.deepEqual(trustedOriginsFromEnv({ AUTH_URL: 'not a url', ADMIN_TRUSTED_ORIGINS: ',,' }), []);
  });
});
