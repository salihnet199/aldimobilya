/**
 * Bounded request-body reader.
 *
 * The byte count is enforced by counting the actual bytes read from the request
 * stream — `Content-Length` is only used as an early cheap reject, never as the
 * authoritative limit, so a lying (too small or absent) header cannot smuggle an
 * oversized body through.
 *
 * Public API (stable, the upload routes import `readLimitedBody`):
 *
 *   readLimitedBody(request, maxBytes)
 *     -> { ok: true;  bytes: Uint8Array<ArrayBuffer>; byteLength: number }
 *      | { ok: false; reason: 'too_large' | 'stream_error'; limitBytes: number }
 *
 * `bytes` is backed by a plain `ArrayBuffer` (never a `SharedArrayBuffer`), so it
 * can be handed straight to `new Response(bytes, ...)` / `new Request(...)` by
 * the upload routes without a cast. `maxBytes` must be a positive integer
 * (programmer error -> throws TypeError). `reason` maps to an HTTP status via
 * `limitedBodyErrorStatus`.
 *
 * Pure (Web APIs only, no relative imports) so it can be unit tested directly
 * with the Node test runner and reused from any runtime.
 */

/** Default cap for JSON API payloads (validation bounds every field anyway). */
export const MAX_JSON_BODY_BYTES = 512 * 1024;

export type LimitedBodyFailure = 'too_large' | 'stream_error';

export type LimitedBodyResult =
  | { ok: true; bytes: Uint8Array<ArrayBuffer>; byteLength: number }
  | { ok: false; reason: LimitedBodyFailure; limitBytes: number };

/** HTTP status for a `readLimitedBody` failure: 413 for oversize, 400 otherwise. */
export function limitedBodyErrorStatus(reason: LimitedBodyFailure): number {
  return reason === 'too_large' ? 413 : 400;
}

function declaredLengthExceeds(request: Request, maxBytes: number): boolean {
  const declared = request.headers.get('content-length');
  if (!declared) return false;
  const parsed = Number(declared);
  return Number.isFinite(parsed) && parsed > maxBytes;
}

/**
 * Reads the request body, aborting as soon as more than `maxBytes` have been
 * observed. On overflow the stream is cancelled so the socket is not drained.
 */
export async function readLimitedBody(
  request: Request,
  maxBytes: number,
): Promise<LimitedBodyResult> {
  if (!Number.isInteger(maxBytes) || maxBytes <= 0) {
    throw new TypeError('readLimitedBody: maxBytes must be a positive integer');
  }

  if (declaredLengthExceeds(request, maxBytes)) {
    return { ok: false, reason: 'too_large', limitBytes: maxBytes };
  }

  const body = request.body;
  if (!body) {
    return { ok: true, bytes: new Uint8Array(0), byteLength: 0 };
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, reason: 'too_large', limitBytes: maxBytes };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, reason: 'stream_error', limitBytes: maxBytes };
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { ok: true, bytes, byteLength: total };
}
