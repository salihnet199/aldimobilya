/**
 * Unit tests for the direct signed-upload contract.
 *
 * Run with the managed Node binary (Node >= 22.18 strips TypeScript types):
 *
 *   node --test apps/admin/lib/upload-direct.test.mjs
 *
 * These tests assert the exact set of fields that are signed and sent. Nothing
 * here talks to Cloudinary: the signature itself is produced by the Cloudinary
 * SDK inside the route, and this file pins the input to that call.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  UPLOAD_PRESET_ENV_VARS,
  buildDirectUploadEndpoint,
  buildSignedUploadParams,
  isCrossSiteRequest,
  resolveUploadPreset,
} from './upload-direct.ts';

const UUID = '123e4567-e89b-12d3-a456-426614174000';

function request(url, headers = {}) {
  return new Request(url, { headers });
}

describe('buildSignedUploadParams', () => {
  const params = buildSignedUploadParams({
    folder: 'aldimobilya/rooms',
    preset: 'aldimobilya_image',
    publicId: `img_${UUID}`,
    formats: 'jpg,jpeg,png,webp,avif,gif',
    timestamp: 1315060510,
  });

  it('signs exactly folder, timestamp, public_id, overwrite, allowed_formats, upload_preset', () => {
    assert.deepEqual(Object.keys(params).sort(), [
      'allowed_formats',
      'folder',
      'overwrite',
      'public_id',
      'timestamp',
      'upload_preset',
    ]);
  });

  it('pins overwrite=false and stringifies the timestamp', () => {
    assert.equal(params.overwrite, 'false');
    assert.equal(params.timestamp, '1315060510');
    assert.equal(params.folder, 'aldimobilya/rooms');
    assert.equal(params.public_id, `img_${UUID}`);
    assert.equal(params.allowed_formats, 'jpg,jpeg,png,webp,avif,gif');
    assert.equal(params.upload_preset, 'aldimobilya_image');
  });

  it('never puts resource_type, api_key, file or signature into the signed set', () => {
    for (const key of ['resource_type', 'api_key', 'file', 'signature', 'cloud_name', 'type']) {
      assert.equal(key in params, false, `must not be signed: ${key}`);
    }
  });
});

describe('resolveUploadPreset', () => {
  it('reads the per-kind environment variable', () => {
    assert.equal(
      resolveUploadPreset('image', { [UPLOAD_PRESET_ENV_VARS.image]: 'aldimobilya_image' }),
      'aldimobilya_image',
    );
    assert.equal(
      resolveUploadPreset('video', { [UPLOAD_PRESET_ENV_VARS.video]: 'aldimobilya_video' }),
      'aldimobilya_video',
    );
    assert.equal(
      resolveUploadPreset('image', { [UPLOAD_PRESET_ENV_VARS.image]: '  padded  ' }),
      'padded',
    );
  });

  it('fails closed when the preset is missing, blank or implausible', () => {
    assert.equal(resolveUploadPreset('image', {}), null);
    assert.equal(resolveUploadPreset('video', {}), null);
    assert.equal(resolveUploadPreset('image', { [UPLOAD_PRESET_ENV_VARS.image]: '' }), null);
    assert.equal(resolveUploadPreset('image', { [UPLOAD_PRESET_ENV_VARS.image]: '   ' }), null);
    for (const bad of ['bad preset', 'has/slash', '-leading', 'quote"', 'a'.repeat(256)]) {
      assert.equal(
        resolveUploadPreset('image', { [UPLOAD_PRESET_ENV_VARS.image]: bad }),
        null,
        `expected rejected preset: ${bad}`,
      );
    }
  });
});

describe('buildDirectUploadEndpoint', () => {
  it('uses the kind-specific path (resource_type is not signed)', () => {
    assert.equal(
      buildDirectUploadEndpoint('demo', 'image'),
      'https://api.cloudinary.com/v1_1/demo/image/upload',
    );
    assert.equal(
      buildDirectUploadEndpoint('demo', 'video'),
      'https://api.cloudinary.com/v1_1/demo/video/upload',
    );
  });

  it('never falls back to the catch-all /auto endpoint', () => {
    assert.equal(buildDirectUploadEndpoint('demo', 'image').includes('/auto/'), false);
    assert.equal(buildDirectUploadEndpoint('demo', 'video').includes('/auto/'), false);
  });
});

describe('isCrossSiteRequest', () => {
  const trusted = ['https://admin.example.com'];

  it('allows same-origin requests', () => {
    assert.equal(
      isCrossSiteRequest(
        request('https://admin.example.com/api/upload/sign', { origin: 'https://admin.example.com' }),
        trusted,
      ),
      false,
    );
  });

  it('allows requests without an Origin header', () => {
    assert.equal(
      isCrossSiteRequest(request('https://admin.example.com/api/upload/sign'), trusted),
      false,
    );
  });

  it('rejects a cross-site Origin', () => {
    assert.equal(
      isCrossSiteRequest(
        request('https://admin.example.com/api/upload/sign', { origin: 'https://evil.example' }),
        trusted,
      ),
      true,
    );
  });

  it('rejects Sec-Fetch-Site: cross-site even without Origin', () => {
    assert.equal(
      isCrossSiteRequest(
        request('https://admin.example.com/api/upload/sign', { 'sec-fetch-site': 'cross-site' }),
        trusted,
      ),
      true,
    );
  });

  it('rejects an opaque (null) origin', () => {
    assert.equal(
      isCrossSiteRequest(
        request('https://admin.example.com/api/upload/sign', { origin: 'null' }),
        trusted,
      ),
      true,
    );
  });

  it('accepts a trusted deployment origin behind a proxy', () => {
    assert.equal(
      isCrossSiteRequest(
        request('http://localhost:3001/api/upload/sign', { origin: 'https://admin.example.com' }),
        trusted,
      ),
      false,
    );
  });

  it('rejects everything when no trusted origins are configured', () => {
    assert.equal(
      isCrossSiteRequest(
        request('http://localhost:3001/api/upload/sign', { origin: 'https://admin.example.com' }),
      ),
      true,
    );
  });
});
