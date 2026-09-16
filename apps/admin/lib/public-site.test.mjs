/**
 * Unit tests for the public-site URL / anchor helpers.
 *
 *   node --test apps/admin/lib/public-site.test.mjs
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEFAULT_PUBLIC_SITE_URL,
  publicRoomHref,
  publicSiteHref,
  publicVideoHref,
  resolvePublicSiteUrl,
  videoAnchorId,
} from './public-site.ts';

describe('resolvePublicSiteUrl', () => {
  it('keeps a valid http(s) origin and strips paths / trailing slashes', () => {
    assert.equal(resolvePublicSiteUrl('https://aldimobilya.com'), 'https://aldimobilya.com');
    assert.equal(resolvePublicSiteUrl('https://aldimobilya.com/'), 'https://aldimobilya.com');
    assert.equal(resolvePublicSiteUrl('https://aldimobilya.com/katalog'), 'https://aldimobilya.com');
    assert.equal(resolvePublicSiteUrl('  http://localhost:3000  '), 'http://localhost:3000');
    assert.equal(resolvePublicSiteUrl('http://localhost:3000/dashboard'), 'http://localhost:3000');
  });

  it('falls back for missing, relative, empty or non-http(s) values', () => {
    for (const bad of [
      undefined,
      null,
      '',
      '   ',
      '/medya',
      'localhost:3000',
      'javascript:alert(1)',
      'ftp://example.com',
      'not a url',
      42,
      {},
    ]) {
      assert.equal(
        resolvePublicSiteUrl(bad),
        DEFAULT_PUBLIC_SITE_URL,
        `expected fallback for ${String(bad)}`,
      );
    }
  });
});

describe('publicSiteHref', () => {
  it('joins root-relative and bare paths onto an explicit origin', () => {
    assert.equal(publicSiteHref('/medya', 'https://aldimobilya.com'), 'https://aldimobilya.com/medya');
    assert.equal(publicSiteHref('katalog', 'https://aldimobilya.com'), 'https://aldimobilya.com/katalog');
    assert.equal(publicSiteHref('/', 'https://aldimobilya.com'), 'https://aldimobilya.com/');
  });

  it('never emits a protocol-relative or doubled origin', () => {
    const href = publicSiteHref('/katalog/ssassadss', 'http://localhost:3000');
    assert.equal(href, 'http://localhost:3000/katalog/ssassadss');
    assert.ok(!href.startsWith('//'));
  });
});

describe('video anchors', () => {
  it('builds the exact id the public /medya list uses', () => {
    assert.equal(videoAnchorId('abc123'), 'video-abc123');
  });

  it('links a published video to the public medya page anchor', () => {
    assert.equal(
      publicVideoHref('abc123', 'https://aldimobilya.com'),
      'https://aldimobilya.com/medya#video-abc123',
    );
  });
});

describe('publicRoomHref', () => {
  it('links to the public catalogue with an encoded slug', () => {
    assert.equal(
      publicRoomHref('ssassadss', 'https://aldimobilya.com'),
      'https://aldimobilya.com/katalog/ssassadss',
    );
    assert.equal(
      publicRoomHref('a b/c', 'https://aldimobilya.com'),
      'https://aldimobilya.com/katalog/a%20b%2Fc',
    );
  });
});
