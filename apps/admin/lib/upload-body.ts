/**
 * Multipart parsing for the upload fallback route.
 *
 * Body *sizing* is handled by the shared `lib/request-body.ts`
 * (`readLimitedBody` / `limitedBodyErrorStatus`), which the upload routes call
 * before parsing. This module only turns the already-bounded bytes back into a
 * `FormData`, which is the upload-specific part.
 */

/**
 * Parses bounded multipart bytes into `FormData`. Returns `null` for a
 * non-multipart content type or a malformed payload instead of throwing.
 */
export async function parseMultipartFormData(
  bytes: Uint8Array<ArrayBuffer>,
  contentType: string | null,
): Promise<FormData | null> {
  if (!contentType || !contentType.toLowerCase().includes('multipart/form-data')) {
    return null;
  }

  try {
    return await new Response(bytes, {
      headers: { 'content-type': contentType },
    }).formData();
  } catch {
    return null;
  }
}
