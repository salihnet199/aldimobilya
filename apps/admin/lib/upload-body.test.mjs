/**
 * Tests for the upload fallback body handling.
 *
 * Run with the managed Node binary:
 *
 *   node --test apps/admin/lib/upload-body.test.mjs
 *
 * The multipart parsing is upload-specific. Body *sizing* is delegated to the
 * shared `lib/request-body.ts`; these tests assert the budget the upload route
 * composes from it, not the shared reader's own internals (those live in
 * `request-body.test.mjs`). Fixtures are tiny in-memory byte arrays — no real
 * media and no network.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { limitedBodyErrorStatus, readLimitedBody } from './request-body.ts';
import { parseMultipartFormData } from './upload-body.ts';
import { MAX_IMAGE_UPLOAD_BYTES, MAX_VIDEO_UPLOAD_BYTES, UPLOAD_MULTIPART_OVERHEAD_BYTES, maxBytesForKind } from './validation.ts';

const URL = 'http://localhost:3000/api/upload?kind=image';

/** Builds real multipart bytes from a FormData without touching the network. */
async function multipartBytes(entries) {
  const fd = new FormData();
  for (const [key, value] of entries) fd.append(key, value);

  const request = new Request(URL, { method: 'POST', body: fd });
  const bytes = new Uint8Array(await request.arrayBuffer());
  return { bytes, contentType: request.headers.get('content-type') };
}

describe('upload body budget', () => {
  it('allows the per-kind file cap plus multipart framing overhead', () => {
    assert.equal(maxBytesForKind('image') + UPLOAD_MULTIPART_OVERHEAD_BYTES, MAX_IMAGE_UPLOAD_BYTES + 65536);
    assert.equal(maxBytesForKind('video') + UPLOAD_MULTIPART_OVERHEAD_BYTES, MAX_VIDEO_UPLOAD_BYTES + 65536);
  });

  it('maps an over-budget body to 413 and an under-budget body to success', async () => {
    const over = await readLimitedBody(
      new Request(URL, { method: 'POST', body: new Uint8Array(8) }),
      4,
    );
    assert.equal(over.ok, false);
    assert.equal(over.reason, 'too_large');
    assert.equal(limitedBodyErrorStatus(over.reason), 413);

    const within = await readLimitedBody(
      new Request(URL, { method: 'POST', body: new Uint8Array(4) }),
      4,
    );
    assert.equal(within.ok, true);
    assert.equal(within.byteLength, 4);
  });
});

describe('parseMultipartFormData', () => {
  it('parses bounded multipart bytes back into FormData', async () => {
    const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'room.png', {
      type: 'image/png',
    });
    const { bytes, contentType } = await multipartBytes([
      ['folder', 'aldimobilya/rooms'],
      ['file', file],
    ]);

    const formData = await parseMultipartFormData(bytes, contentType);
    assert.ok(formData);

    assert.equal(formData.get('folder'), 'aldimobilya/rooms');
    const parsedFile = formData.get('file');
    assert.ok(parsedFile instanceof File);
    assert.equal(parsedFile.size, 4);
    assert.equal(parsedFile.type, 'image/png');
  });

  it('returns null for a non-multipart content type', async () => {
    const bytes = new TextEncoder().encode('{"file":"nope"}');
    assert.equal(await parseMultipartFormData(bytes, 'application/json'), null);
    assert.equal(await parseMultipartFormData(bytes, null), null);
  });

  it('returns null for a malformed multipart payload instead of throwing', async () => {
    const bytes = new TextEncoder().encode('not really multipart');
    assert.equal(
      await parseMultipartFormData(bytes, 'multipart/form-data; boundary=----x'),
      null,
    );
  });
});
