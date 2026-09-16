/**
 * Unit tests for login callback normalization.
 *
 *   node --test apps/admin/lib/callback-url.test.mjs
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DEFAULT_CALLBACK_URL, normalizeCallbackUrl } from './callback-url.ts';

describe('normalizeCallbackUrl', () => {
  it('keeps local dashboard routes, including nested paths and query strings', () => {
    assert.equal(normalizeCallbackUrl('/dashboard'), '/dashboard');
    assert.equal(normalizeCallbackUrl('/dashboard/odalar'), '/dashboard/odalar');
    assert.equal(normalizeCallbackUrl('/dashboard/odalar/yeni'), '/dashboard/odalar/yeni');
    assert.equal(
      normalizeCallbackUrl('/dashboard/videolar?page=2'),
      '/dashboard/videolar?page=2',
    );
    assert.equal(normalizeCallbackUrl('  /dashboard/ayarlar  '), '/dashboard/ayarlar');
  });

  it('falls back to the default for anything outside /dashboard', () => {
    for (const bad of [
      '/',
      '/login',
      '/dashboardX',
      '/dashboard-evil',
      '/api/rooms',
      'dashboard',
      '',
      '   ',
      null,
      undefined,
      42,
      {},
    ]) {
      assert.equal(
        normalizeCallbackUrl(bad),
        DEFAULT_CALLBACK_URL,
        `expected default for ${String(bad)}`,
      );
    }
  });

  it('rejects absolute, protocol-relative and backslash-smuggled targets', () => {
    for (const bad of [
      'https://evil.example/dashboard',
      'http://evil.example/dashboard',
      '//evil.example/dashboard',
      '/\\evil.example/dashboard',
      '\\\\evil.example/dashboard',
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      '/dashboard/../../login',
      '/dashboard/%2e%2e/login',
    ]) {
      assert.equal(
        normalizeCallbackUrl(bad),
        DEFAULT_CALLBACK_URL,
        `expected default for ${bad}`,
      );
    }
  });

  it('rejects control characters and oversized values', () => {
    assert.equal(normalizeCallbackUrl('/dashboard\u0000/odalar'), DEFAULT_CALLBACK_URL);
    assert.equal(normalizeCallbackUrl('/dashboard\n/odalar'), DEFAULT_CALLBACK_URL);
    assert.equal(
      normalizeCallbackUrl(`/dashboard/${'a'.repeat(3000)}`),
      DEFAULT_CALLBACK_URL,
    );
  });
});
