/**
 * Unit tests for the client-side upload helper.
 *
 * Run with the managed Node binary:
 *
 *   node --test apps/admin/components/upload.test.mjs
 *
 * `uploadMedia` is exercised with a stubbed `fetch`, so no request leaves the
 * process and no real media is uploaded. The fixtures are tiny byte arrays.
 */
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  MAX_IMAGE_BYTES,
  buildSignedUploadForm,
  isSafeMediaUrl,
  isSafeUploadResponseUrl,
  parseSignResponse,
  uploadMedia,
  validateFileForKind,
  validateImageFile,
  validateVideoFile,
} from './upload.ts';

const CLOUDINARY_IMAGE_URL = 'https://res.cloudinary.com/demo/image/upload/v1/img_abc.png';

function pngFile() {
  return new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'room.png', { type: 'image/png' });
}

/** Minimal fetch stub: records calls and replies from a URL -> response map. */
function stubFetch(reply) {
  const calls = [];
  const original = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input.url;
    calls.push({ url, init });
    return reply(url, init);
  };

  return { calls, restore: () => { globalThis.fetch = original; } };
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

let activeStub = null;
afterEach(() => {
  activeStub?.restore();
  activeStub = null;
});

describe('client file validation', () => {
  it('rejects svg, html and unknown image types before any request', () => {
    for (const type of ['image/svg+xml', 'text/html', 'application/x-msdownload', '']) {
      const reason = validateImageFile({ name: 'x', type, size: 10 });
      assert.equal(typeof reason, 'string', `expected rejection for ${type}`);
    }
  });

  it('rejects oversized and empty files', () => {
    assert.ok(validateImageFile({ name: 'big.png', type: 'image/png', size: MAX_IMAGE_BYTES + 1 }));
    assert.ok(validateImageFile({ name: 'empty.png', type: 'image/png', size: 0 }));
    assert.equal(validateImageFile({ name: 'ok.png', type: 'image/png', size: 1024 }), null);
  });

  it('applies the kind-specific allowlist', () => {
    const svg = { name: 'x.svg', type: 'image/svg+xml', size: 10 };
    assert.ok(validateFileForKind(svg, 'image'));

    const mp4 = { name: 'v.mp4', type: 'video/mp4', size: 10 };
    assert.equal(validateFileForKind(mp4, 'video'), null);
    assert.ok(validateFileForKind(mp4, 'image'));
    assert.equal(validateVideoFile({ name: 'v.webm', type: 'video/webm', size: 10 }), null);
  });
});

describe('isSafeMediaUrl (stored media compatibility)', () => {
  it('keeps accepting https and root-relative paths on any host', () => {
    assert.equal(isSafeMediaUrl(CLOUDINARY_IMAGE_URL), true);
    assert.equal(isSafeMediaUrl('https://cdn.example.com/legacy/room.jpg'), true);
    assert.equal(isSafeMediaUrl('/images/room.jpg'), true);
  });

  it('still rejects unsafe schemes and protocol-relative paths', () => {
    for (const bad of [
      'javascript:alert(1)',
      'data:image/svg+xml;base64,AAAA',
      'http://insecure.example/x.jpg',
      '//evil.example/x.jpg',
      '/\\evil.example/x.jpg',
      'https://evil.example/<script>',
      '',
    ]) {
      assert.equal(isSafeMediaUrl(bad), false, `expected unsafe: ${bad}`);
    }
  });
});

describe('isSafeUploadResponseUrl', () => {
  it('accepts absolute https response URLs', () => {
    assert.equal(isSafeUploadResponseUrl(CLOUDINARY_IMAGE_URL), true);
  });

  it('rejects relative, insecure and unsafe response URLs', () => {
    for (const bad of [
      '/images/room.jpg',
      'javascript:alert(1)',
      'data:image/png;base64,AAAA',
      'http://res.cloudinary.com/demo/x.png',
      '//evil.example/x.png',
      '',
      null,
      42,
    ]) {
      assert.equal(isSafeUploadResponseUrl(bad), false, `expected rejected: ${String(bad)}`);
    }
  });
});

describe('parseSignResponse', () => {
  const valid = {
    signature: 'sig',
    apiKey: 'key',
    endpoint: 'https://api.cloudinary.com/v1_1/demo/image/upload',
    params: { folder: 'aldimobilya/rooms', timestamp: '123', public_id: 'img_x' },
  };

  it('accepts a complete ticket', () => {
    const ticket = parseSignResponse(valid);
    assert.ok(ticket);
    assert.equal(ticket.signature, 'sig');
    assert.equal(ticket.endpoint, valid.endpoint);
    assert.equal(ticket.params.timestamp, '123');
  });

  it('rejects incomplete or unsafe tickets', () => {
    assert.equal(parseSignResponse(null), null);
    assert.equal(parseSignResponse({ ...valid, signature: '' }), null);
    assert.equal(parseSignResponse({ ...valid, apiKey: '' }), null);
    assert.equal(parseSignResponse({ ...valid, endpoint: 'http://insecure/upload' }), null);
    assert.equal(parseSignResponse({ ...valid, params: undefined }), null);
    assert.equal(parseSignResponse({ ...valid, params: [] }), null);
    // Must pin folder + timestamp.
    assert.equal(parseSignResponse({ ...valid, params: { folder: 'x' } }), null);
    assert.equal(parseSignResponse({ ...valid, params: { timestamp: '1' } }), null);
  });

  it('drops empty param values instead of sending them', () => {
    const ticket = parseSignResponse({
      ...valid,
      params: { ...valid.params, overwrite: '', allowed_formats: 'jpg' },
    });
    assert.ok(ticket);
    assert.equal('overwrite' in ticket.params, false);
    assert.equal(ticket.params.allowed_formats, 'jpg');
  });
});

describe('buildSignedUploadForm', () => {
  it('sends the file, credentials and the complete signed params verbatim', () => {
    const params = {
      folder: 'aldimobilya/rooms',
      timestamp: '123',
      public_id: 'img_x',
      overwrite: 'false',
      allowed_formats: 'jpg,jpeg,png,webp,avif,gif',
      upload_preset: 'aldimobilya_image',
    };

    const fd = buildSignedUploadForm(pngFile(), 'key', 'sig', params);
    const keys = [...fd.keys()].sort();

    assert.deepEqual(keys, [
      'allowed_formats',
      'api_key',
      'file',
      'folder',
      'overwrite',
      'public_id',
      'signature',
      'timestamp',
      'upload_preset',
    ]);

    for (const [key, value] of Object.entries(params)) {
      assert.equal(fd.get(key), value, `param mismatch: ${key}`);
    }
    assert.equal(fd.get('api_key'), 'key');
    assert.equal(fd.get('signature'), 'sig');
  });

  it('never adds fields the signature does not cover', () => {
    const fd = buildSignedUploadForm(pngFile(), 'key', 'sig', {
      folder: 'aldimobilya/rooms',
      timestamp: '1',
    });
    for (const forbidden of ['resource_type', 'type', 'public_id', 'overwrite']) {
      assert.equal(fd.get(forbidden), null, `must not be sent: ${forbidden}`);
    }
  });
});

describe('uploadMedia (stubbed fetch)', () => {
  it('uses the kind-specific endpoint and the signed params for a direct upload', async () => {
    const params = {
      folder: 'aldimobilya/rooms',
      timestamp: '123',
      public_id: 'img_x',
      overwrite: 'false',
      allowed_formats: 'jpg,jpeg,png,webp,avif,gif',
      upload_preset: 'aldimobilya_image',
    };

    activeStub = stubFetch((url) => {
      if (url.startsWith('/api/upload/sign')) {
        return jsonResponse({
          signature: 'sig',
          apiKey: 'key',
          cloudName: 'demo',
          endpoint: 'https://api.cloudinary.com/v1_1/demo/image/upload',
          resourceType: 'image',
          params,
        });
      }
      return jsonResponse({ secure_url: CLOUDINARY_IMAGE_URL, public_id: 'img_x' });
    });

    const result = await uploadMedia(pngFile(), 'aldimobilya/rooms', 'image');
    assert.deepEqual(result, { url: CLOUDINARY_IMAGE_URL, publicId: 'img_x' });

    assert.equal(activeStub.calls.length, 2);
    assert.ok(activeStub.calls[0].url.includes('folder=aldimobilya%2Frooms'));
    assert.ok(activeStub.calls[0].url.includes('kind=image'));

    // Second call goes to the kind-specific Cloudinary endpoint, never /auto.
    assert.equal(activeStub.calls[1].url, 'https://api.cloudinary.com/v1_1/demo/image/upload');
    assert.equal(activeStub.calls[1].url.includes('/auto/'), false);

    const sent = activeStub.calls[1].init.body;
    assert.ok(sent instanceof FormData);
    for (const [key, value] of Object.entries(params)) {
      assert.equal(sent.get(key), value, `signed param not echoed exactly: ${key}`);
    }
  });

  it('falls back to the server route when the signature is unavailable (503)', async () => {
    activeStub = stubFetch((url) => {
      if (url.startsWith('/api/upload/sign')) {
        return jsonResponse({ error: 'Doğrudan yükleme yapılandırılmamış.' }, 503);
      }
      return jsonResponse({ url: 'https://res.cloudinary.com/demo/video/upload/v1/v.mp4', publicId: 'v' });
    });

    const video = new File([new Uint8Array([0, 0, 0, 0x18])], 'clip.mp4', { type: 'video/mp4' });
    const result = await uploadMedia(video, 'aldimobilya/videos', 'video');

    assert.equal(result.url, 'https://res.cloudinary.com/demo/video/upload/v1/v.mp4');
    assert.equal(activeStub.calls.length, 2);
    assert.ok(activeStub.calls[1].url.startsWith('/api/upload?kind=video'));
  });

  it('rejects an unsafe provider response URL', async () => {
    activeStub = stubFetch((url) => {
      if (url.startsWith('/api/upload/sign')) {
        return jsonResponse({
          signature: 'sig',
          apiKey: 'key',
          endpoint: 'https://api.cloudinary.com/v1_1/demo/image/upload',
          params: { folder: 'aldimobilya/rooms', timestamp: '1' },
        });
      }
      if (url.startsWith('https://api.cloudinary.com')) {
        return jsonResponse({ secure_url: 'javascript:alert(1)' });
      }
      return jsonResponse({ url: 'data:text/html;base64,AAAA' });
    });

    await assert.rejects(
      () => uploadMedia(pngFile(), 'aldimobilya/rooms', 'image'),
      /yüklenemedi/,
    );
  });

  it('never sends a request for a file that fails client validation', async () => {
    activeStub = stubFetch(() => jsonResponse({}));

    const svg = new File([new TextEncoder().encode('<svg/>')], 'x.svg', { type: 'image/svg+xml' });
    await assert.rejects(() => uploadMedia(svg, 'aldimobilya/rooms', 'image'));
    assert.equal(activeStub.calls.length, 0);

    await assert.rejects(() =>
      uploadMedia({ name: 'big.png', type: 'image/png', size: MAX_IMAGE_BYTES + 1 }, 'aldimobilya/rooms', 'image'),
    );
    assert.equal(activeStub.calls.length, 0);
  });
});
