/**
 * Unit tests for the admin API validation helpers.
 *
 * Run with the managed Node binary (Node >= 22.18 strips TypeScript types by
 * default):
 *
 *   node --test apps/admin/lib/validation.test.mjs
 *
 * This file is `.mjs` on purpose: it can import the `.ts` module directly while
 * staying outside the admin tsconfig `include` patterns, so `tsc --noEmit`
 * never needs `allowImportingTsExtensions`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ALLOWED_IMAGE_FORMATS,
  ALLOWED_VIDEO_FORMATS,
  HERO_SLIDESHOW_DEFAULT_INTERVAL_MS,
  HERO_SLIDESHOW_MAX_IMAGES,
  MAX_IMAGE_UPLOAD_BYTES,
  MAX_VIDEO_UPLOAD_BYTES,
  allowedFormatListForKind,
  allowedFormatsForKind,
  buildUploadPublicId,
  isAllowedImageMime,
  isAllowedUploadMime,
  isAllowedVideoMime,
  isSafeMediaUrl,
  isUploadKind,
  matchesDeclaredType,
  maxBytesForKind,
  maxBytesForMime,
  mimeMatchesKind,
  normalizeHeroSettings,
  resolveUploadFolder,
  resolveUploadKind,
  validateHeroSlideshowInput,
  validateRoomCreate,
  validateRoomUpdate,
  validateVideoCreate,
  validateVideoUpdate,
} from './validation.ts';

const HTTPS = 'https://res.cloudinary.com/demo/image/upload/v1/room.jpg';

describe('isSafeMediaUrl', () => {
  it('accepts https and root-relative paths', () => {
    assert.equal(isSafeMediaUrl(HTTPS), true);
    assert.equal(isSafeMediaUrl('/images/room.jpg'), true);
  });

  it('rejects unsafe protocols and protocol-relative URLs', () => {
    for (const bad of [
      'javascript:alert(1)',
      'data:image/svg+xml;base64,AAAA',
      'vbscript:msgbox(1)',
      'http://insecure.example/x.jpg',
      '//evil.example/x.jpg',
      '/\\evil.example/x.jpg',
      'https://evil.example/<script>',
      '',
      '   ',
      null,
      42,
    ]) {
      assert.equal(isSafeMediaUrl(bad), false, `expected unsafe: ${String(bad)}`);
    }
  });
});

describe('normalizeHeroSettings', () => {
  it('upgrades the legacy string[] shape with safe defaults', () => {
    assert.deepEqual(normalizeHeroSettings([HTTPS, '/b.jpg']), {
      images: [HTTPS, '/b.jpg'],
      autoplay: true,
      intervalMs: HERO_SLIDESHOW_DEFAULT_INTERVAL_MS,
    });
  });

  it('caps images at 8 and clamps the interval', () => {
    const many = Array.from({ length: 20 }, (_, i) => `/img-${i}.jpg`);
    const result = normalizeHeroSettings({ images: many, autoplay: false, intervalMs: 999999 });
    assert.equal(result.images.length, HERO_SLIDESHOW_MAX_IMAGES);
    assert.equal(result.autoplay, false);
    assert.equal(result.intervalMs, 15000);

    assert.equal(normalizeHeroSettings({ intervalMs: 1 }).intervalMs, 3000);
  });

  it('falls back to safe defaults for junk input', () => {
    assert.deepEqual(normalizeHeroSettings(undefined), {
      images: [],
      autoplay: true,
      intervalMs: HERO_SLIDESHOW_DEFAULT_INTERVAL_MS,
    });
    assert.deepEqual(normalizeHeroSettings('nope').images, []);
  });
});

describe('validateHeroSlideshowInput', () => {
  it('accepts the legacy array shape', () => {
    const result = validateHeroSlideshowInput([HTTPS]);
    assert.equal(result.ok, true);
    assert.deepEqual(result.value.images, [HTTPS]);
  });

  it('accepts the object shape', () => {
    const result = validateHeroSlideshowInput({
      images: [HTTPS],
      autoplay: false,
      intervalMs: 4000,
    });
    assert.equal(result.ok, true);
    assert.deepEqual(result.value, { images: [HTTPS], autoplay: false, intervalMs: 4000 });
  });

  it('rejects too many images, unsafe URLs and out-of-range intervals', () => {
    assert.equal(
      validateHeroSlideshowInput(Array.from({ length: 9 }, () => HTTPS)).ok,
      false,
    );
    assert.equal(validateHeroSlideshowInput(['javascript:alert(1)']).ok, false);
    assert.equal(validateHeroSlideshowInput({ images: [], intervalMs: 2999 }).ok, false);
    assert.equal(validateHeroSlideshowInput({ images: [], intervalMs: 15001 }).ok, false);
    assert.equal(validateHeroSlideshowInput({ images: [], autoplay: 'yes' }).ok, false);
    assert.equal(validateHeroSlideshowInput('nope').ok, false);
  });
});

describe('validateRoomCreate', () => {
  const valid = {
    nameTr: 'Elegance',
    nameEn: 'Elegance',
    slug: 'elegance-yatak-odasi',
    heroImage: HTTPS,
    images: [{ url: HTTPS, alt: 'Elegance' }],
  };

  it('accepts a valid payload', () => {
    const result = validateRoomCreate(valid);
    assert.equal(result.ok, true);
    assert.equal(result.value.slug, 'elegance-yatak-odasi');
    assert.equal(result.value.images.length, 1);
    assert.equal(result.value.isVisible, true);
    assert.equal(result.value.isFeatured, false);
  });

  it('rejects missing or malformed required fields', () => {
    assert.equal(validateRoomCreate({}).ok, false);
    assert.equal(validateRoomCreate({ ...valid, slug: 'Has Spaces' }).ok, false);
    assert.equal(validateRoomCreate({ ...valid, slug: 'UPPER' }).ok, false);
    assert.equal(validateRoomCreate({ ...valid, heroImage: 'http://x/y.jpg' }).ok, false);
    assert.equal(validateRoomCreate({ ...valid, nameTr: '', nameEn: '' }).ok, false);
  });

  it('bounds the image array and validates each image URL', () => {
    const tooMany = Array.from({ length: 51 }, () => ({ url: HTTPS }));
    assert.equal(validateRoomCreate({ ...valid, images: tooMany }).ok, false);
    assert.equal(
      validateRoomCreate({ ...valid, images: [{ url: 'javascript:alert(1)' }] }).ok,
      false,
    );
    assert.equal(validateRoomCreate({ ...valid, images: 'nope' }).ok, false);
  });

  it('requires real booleans', () => {
    assert.equal(validateRoomCreate({ ...valid, isVisible: 'true' }).ok, false);
    assert.equal(validateRoomCreate({ ...valid, isFeatured: 1 }).ok, false);
  });

  it('bounds specs', () => {
    assert.equal(validateRoomCreate({ ...valid, specs: 'nope' }).ok, false);
    assert.equal(
      validateRoomCreate({ ...valid, specs: { material: { nested: true } } }).ok,
      false,
    );
    assert.equal(
      validateRoomCreate({ ...valid, specs: { material: 'Ahşap', colors: ['Ceviz'] } }).ok,
      true,
    );
  });
});

describe('validateRoomUpdate', () => {
  it('only returns the fields present in the payload', () => {
    const result = validateRoomUpdate({ isVisible: false });
    assert.equal(result.ok, true);
    assert.deepEqual(result.value, { isVisible: false });
    assert.equal('nameTr' in result.value, false);
  });

  it('clears nullable fields when they are sent empty', () => {
    const result = validateRoomUpdate({ category: '', video: null, descTr: '  ' });
    assert.equal(result.ok, true);
    assert.equal(result.value.category, null);
    assert.equal(result.value.video, null);
    assert.equal(result.value.descTr, null);
  });

  it('rejects empty, unknown-only and invalid payloads', () => {
    assert.equal(validateRoomUpdate({}).ok, false);
    assert.equal(validateRoomUpdate({ unknown: 1 }).ok, false);
    assert.equal(validateRoomUpdate(null).ok, false);
    assert.equal(validateRoomUpdate({ isVisible: 'yes' }).ok, false);
    assert.equal(validateRoomUpdate({ heroImage: 'javascript:alert(1)' }).ok, false);
    assert.equal(validateRoomUpdate({ nameTr: '' }).ok, false);
  });
});

describe('video validation', () => {
  it('accepts a valid create payload', () => {
    const result = validateVideoCreate({ title: 'Tanıtım', url: HTTPS });
    assert.equal(result.ok, true);
    assert.equal(result.value.isPublic, true);
  });

  it('rejects unsafe video urls', () => {
    assert.equal(validateVideoCreate({ title: 'x', url: 'javascript:alert(1)' }).ok, false);
    assert.equal(validateVideoCreate({ title: '', url: HTTPS }).ok, false);
  });

  it('does not touch isPublic when it is not part of an update', () => {
    const result = validateVideoUpdate({ title: 'Yeni başlık' });
    assert.equal(result.ok, true);
    assert.equal('isPublic' in result.value, false);
  });

  it('applies explicit visibility changes and validates them', () => {
    const hidden = validateVideoUpdate({ isPublic: false });
    assert.equal(hidden.ok, true);
    assert.equal(hidden.value.isPublic, false);
    assert.equal(validateVideoUpdate({ isPublic: 'false' }).ok, false);
    assert.equal(validateVideoUpdate({}).ok, false);
  });
});

describe('resolveUploadFolder', () => {
  it('allows the configured folders and defaults sensibly', () => {
    assert.deepEqual(resolveUploadFolder(undefined), { ok: true, value: 'aldimobilya/rooms' });
    assert.deepEqual(resolveUploadFolder('aldimobilya/hero'), {
      ok: true,
      value: 'aldimobilya/hero',
    });
  });

  it('rejects traversal and unknown folders', () => {
    assert.equal(resolveUploadFolder('../../etc').ok, false);
    assert.equal(resolveUploadFolder('aldimobilya/secret').ok, false);
    assert.equal(resolveUploadFolder('aldimobilya/rooms/../../x').ok, false);
  });

  it('allows every configured folder, including nested video thumbnails', () => {
    assert.deepEqual(resolveUploadFolder('aldimobilya/videos'), {
      ok: true,
      value: 'aldimobilya/videos',
    });
    assert.deepEqual(resolveUploadFolder('/aldimobilya/videos/thumbnails/'), {
      ok: true,
      value: 'aldimobilya/videos/thumbnails',
    });
    assert.equal(resolveUploadFolder('aldimobilya/videos/thumbnails/../../..').ok, false);
  });
});

describe('resolveUploadKind', () => {
  it('defaults to image and normalizes case', () => {
    assert.deepEqual(resolveUploadKind(undefined), { ok: true, value: 'image' });
    assert.deepEqual(resolveUploadKind(null), { ok: true, value: 'image' });
    assert.deepEqual(resolveUploadKind(''), { ok: true, value: 'image' });
    assert.deepEqual(resolveUploadKind('video'), { ok: true, value: 'video' });
    assert.deepEqual(resolveUploadKind('IMAGE'), { ok: true, value: 'image' });
  });

  it('rejects unknown kinds', () => {
    for (const bad of ['raw', 'auto', 'videos', 'image/png', 42, {}, []]) {
      assert.equal(resolveUploadKind(bad).ok, false, `expected invalid kind: ${String(bad)}`);
    }
    assert.equal(isUploadKind('image'), true);
    assert.equal(isUploadKind('video'), true);
    assert.equal(isUploadKind('raw'), false);
  });
});

describe('upload format allowlists', () => {
  it('signs a kind-specific allowed_formats list', () => {
    assert.equal(allowedFormatsForKind('image'), ALLOWED_IMAGE_FORMATS.join(','));
    assert.equal(allowedFormatsForKind('video'), ALLOWED_VIDEO_FORMATS.join(','));
  });

  it('exposes the same allowlist as an array for the SDK upload options', () => {
    assert.deepEqual(allowedFormatListForKind('image'), [...ALLOWED_IMAGE_FORMATS]);
    assert.deepEqual(allowedFormatListForKind('video'), [...ALLOWED_VIDEO_FORMATS]);
    assert.equal(allowedFormatListForKind('image').join(','), allowedFormatsForKind('image'));
  });

  it('never allows svg, html or raw formats through', () => {
    assert.equal(ALLOWED_IMAGE_FORMATS.includes('svg'), false);
    assert.equal(ALLOWED_VIDEO_FORMATS.includes('svg'), false);
    assert.equal(isAllowedImageMime('image/svg+xml'), false);
    assert.equal(isAllowedImageMime('image/svg'), false);
    assert.equal(isAllowedUploadMime('image/svg+xml'), false);
    assert.equal(isAllowedUploadMime('text/html'), false);
    assert.equal(isAllowedUploadMime('application/x-httpd-php'), false);
    assert.equal(isAllowedUploadMime('text/javascript'), false);
    assert.equal(isAllowedVideoMime('image/gif'), false);
  });

  it('caps size per kind and per mime', () => {
    assert.equal(maxBytesForKind('image'), MAX_IMAGE_UPLOAD_BYTES);
    assert.equal(maxBytesForKind('video'), MAX_VIDEO_UPLOAD_BYTES);
    assert.equal(maxBytesForMime('image/png'), MAX_IMAGE_UPLOAD_BYTES);
    assert.equal(maxBytesForMime('video/mp4'), MAX_VIDEO_UPLOAD_BYTES);
  });

  it('keeps mime and kind in agreement', () => {
    assert.equal(mimeMatchesKind('image', 'image/png'), true);
    assert.equal(mimeMatchesKind('video', 'video/mp4'), true);
    assert.equal(mimeMatchesKind('image', 'video/mp4'), false);
    assert.equal(mimeMatchesKind('video', 'image/png'), false);
    assert.equal(mimeMatchesKind('image', 'image/svg+xml'), false);
  });
});

describe('buildUploadPublicId', () => {
  const uuid = '123e4567-e89b-12d3-a456-426614174000';

  it('prefixes the id by kind', () => {
    assert.deepEqual(buildUploadPublicId('image', uuid), { ok: true, value: `img_${uuid}` });
    assert.deepEqual(buildUploadPublicId('video', uuid), { ok: true, value: `vid_${uuid}` });
  });

  it('rejects traversal, separators and tag characters', () => {
    for (const bad of [
      '../../etc/passwd',
      'a/b',
      'a.b',
      '<script>',
      'a b',
      '',
      'short',
      'x'.repeat(65),
      null,
      42,
    ]) {
      assert.equal(buildUploadPublicId('image', bad).ok, false, `expected invalid id: ${String(bad)}`);
    }
  });
});

describe('matchesDeclaredType against markup payloads', () => {
  const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
  const html = new TextEncoder().encode('<!DOCTYPE html><html><body>hi</body></html>');

  it('rejects svg/html bytes even when declared as an image', () => {
    assert.equal(matchesDeclaredType('image/png', svg), false);
    assert.equal(matchesDeclaredType('image/jpeg', svg), false);
    assert.equal(matchesDeclaredType('image/webp', svg), false);
    assert.equal(matchesDeclaredType('image/svg+xml', svg), false);
    assert.equal(matchesDeclaredType('image/png', html), false);
    assert.equal(matchesDeclaredType('text/html', html), false);
    assert.equal(matchesDeclaredType('video/mp4', html), false);
  });
});

describe('matchesDeclaredType', () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0]);
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const mp4 = new Uint8Array([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0, 0, 0, 0]);

  it('accepts real signatures', () => {
    assert.equal(matchesDeclaredType('image/png', png), true);
    assert.equal(matchesDeclaredType('image/jpeg', jpeg), true);
    assert.equal(matchesDeclaredType('video/mp4', mp4), true);
  });

  it('rejects spoofed content types', () => {
    assert.equal(matchesDeclaredType('image/png', jpeg), false);
    assert.equal(matchesDeclaredType('image/jpeg', png), false);
    assert.equal(matchesDeclaredType('video/webm', mp4), false);
    assert.equal(matchesDeclaredType('text/html', png), false);
  });
});
