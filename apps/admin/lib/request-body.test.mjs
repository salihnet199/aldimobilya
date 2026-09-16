/**
 * Unit tests for the bounded request-body reader.
 *
 *   node --test apps/admin/lib/request-body.test.mjs
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MAX_JSON_BODY_BYTES,
  limitedBodyErrorStatus,
  readLimitedBody,
} from './request-body.ts';

const URL_UNDER_TEST = 'http://localhost:3000/api/rooms';

function post(body, headers = {}) {
  return new Request(URL_UNDER_TEST, { method: 'POST', body, headers });
}

function streamRequest(chunks, headers = {}) {
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
      controller.close();
    },
  });
  return new Request(URL_UNDER_TEST, {
    method: 'POST',
    body: stream,
    duplex: 'half',
    headers,
  });
}

describe('readLimitedBody', () => {
  it('reads a body that fits and reports the exact byte length', async () => {
    const payload = JSON.stringify({ hello: 'dünya' });
    const result = await readLimitedBody(post(payload), 1024);

    assert.equal(result.ok, true);
    assert.equal(result.byteLength, new TextEncoder().encode(payload).byteLength);
    assert.equal(new TextDecoder().decode(result.bytes), payload);
  });

  it('treats a missing body as empty rather than an error', async () => {
    const result = await readLimitedBody(new Request(URL_UNDER_TEST, { method: 'GET' }), 16);
    assert.equal(result.ok, true);
    assert.equal(result.byteLength, 0);
  });

  it('rejects an oversized body using the real stream byte count', async () => {
    const result = await readLimitedBody(post('x'.repeat(64)), 16);
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'too_large');
    assert.equal(result.limitBytes, 16);
  });

  it('cannot be bypassed by an understated Content-Length', async () => {
    // The stream really carries 64 bytes but the header claims 1.
    const request = streamRequest(['x'.repeat(64)], { 'content-length': '1' });
    const result = await readLimitedBody(request, 16);
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'too_large');
  });

  it('can short-circuit on an overstated Content-Length', async () => {
    const request = streamRequest(['short'], { 'content-length': '100000' });
    const result = await readLimitedBody(request, 16);
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'too_large');
  });

  it('accepts a body exactly at the limit', async () => {
    const result = await readLimitedBody(post('1234567890'), 10);
    assert.equal(result.ok, true);
    assert.equal(result.byteLength, 10);
  });

  it('throws a TypeError for a non-positive or non-integer limit', async () => {
    for (const bad of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      await assert.rejects(
        () => readLimitedBody(post('x'), bad),
        TypeError,
        `expected TypeError for ${String(bad)}`,
      );
    }
  });
});

describe('limits and status mapping', () => {
  it('exposes a bounded default JSON cap', () => {
    assert.equal(MAX_JSON_BODY_BYTES, 512 * 1024);
  });

  it('maps failures to 413/400', () => {
    assert.equal(limitedBodyErrorStatus('too_large'), 413);
    assert.equal(limitedBodyErrorStatus('stream_error'), 400);
  });
});
