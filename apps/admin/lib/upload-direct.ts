/**
 * Contract for the direct browser -> Cloudinary signed upload flow.
 *
 * Everything here is pure (no Next.js / Cloudinary / filesystem imports) so it
 * can be unit tested with the Node test runner. The route resolves values with
 * `lib/validation.ts`, signs the returned parameter map with the Cloudinary SDK
 * and hands the exact same map to the browser.
 *
 * Cloudinary signature rules (see "Generating authentication signatures"):
 *   - The string to sign is every upload field EXCEPT `file`, `cloud_name`,
 *     `resource_type` and `api_key`, including `timestamp`.
 *   - Fields are sorted by name, joined with `&`, the API secret is appended
 *     with no separator and the whole thing is hashed (SHA-1 by default).
 *   - Therefore `resource_type` is NOT signed: it is pinned through the
 *     kind-specific endpoint path instead.
 *
 * Provider-side limits (`max_file_size`, and `allowed_formats` as a second
 * layer) live on the *signed* upload preset, because `max_file_size` is a
 * preset constraint rather than something the browser may raise.
 */

export type DirectUploadKind = 'image' | 'video';

/** Environment variable that must hold the signed upload preset per kind. */
export const UPLOAD_PRESET_ENV_VARS: Record<DirectUploadKind, string> = {
  image: 'CLOUDINARY_IMAGE_UPLOAD_PRESET',
  video: 'CLOUDINARY_VIDEO_UPLOAD_PRESET',
};

/** Cloudinary upload preset names: letters, digits, `_`, `-`. */
const UPLOAD_PRESET_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,254}$/;

const CLOUDINARY_UPLOAD_HOST = 'https://api.cloudinary.com';

/**
 * Reads the signed upload preset for a kind. Returns `null` when the variable
 * is absent, blank or not a plausible preset name, so callers can fail closed
 * instead of issuing a signature that carries no provider-side size cap.
 */
export function resolveUploadPreset(
  kind: DirectUploadKind,
  env: Record<string, string | undefined>,
): string | null {
  const raw = env[UPLOAD_PRESET_ENV_VARS[kind]];
  if (typeof raw !== 'string') return null;

  const preset = raw.trim();
  return UPLOAD_PRESET_PATTERN.test(preset) ? preset : null;
}

/**
 * Kind-specific Upload API endpoint. `resource_type` is part of the path, not
 * the signature, which is why the browser must post to the endpoint we return
 * rather than to the catch-all `/auto/upload` route.
 */
export function buildDirectUploadEndpoint(
  cloudName: string,
  kind: DirectUploadKind,
): string {
  return `${CLOUDINARY_UPLOAD_HOST}/v1_1/${encodeURIComponent(cloudName)}/${kind}/upload`;
}

export interface SignedUploadParamsInput {
  folder: string;
  preset: string;
  publicId: string;
  formats: string;
  timestamp: number;
}

/**
 * The exact `name=value` pairs that are signed and that the browser must echo
 * back verbatim (together with `file`, `api_key` and `signature`).
 *
 * `overwrite=false` plus a unique `public_id` means a direct upload can never
 * clobber an existing asset; `allowed_formats` narrows what Cloudinary accepts
 * even if a client lies about the file type.
 */
export function buildSignedUploadParams(
  input: SignedUploadParamsInput,
): Record<string, string> {
  return {
    folder: input.folder,
    timestamp: String(input.timestamp),
    public_id: input.publicId,
    overwrite: 'false',
    allowed_formats: input.formats,
    upload_preset: input.preset,
  };
}

/**
 * Cross-site guard for the signature endpoint.
 *
 * The shared guard only runs its CSRF check for unsafe methods, so a GET like
 * this one has to make the same decision itself: browsers attach `Origin` to
 * cross-origin fetches and `Sec-Fetch-Site: cross-site` to cross-site requests,
 * so a page on another origin cannot mint a signature with the admin's cookies.
 *
 * `trustedOrigins` is expected to come from `trustedOriginsFromEnv`
 * (`lib/origin.ts`) so both the GET and POST policies trust the same deployment
 * configuration. Origins are compared as-is: the `Origin` header is already
 * normalized by the browser and the env helper returns normalized origins, so
 * anything unexpected simply fails to match and is rejected.
 *
 * Requests without an `Origin` header (same-origin navigations, non-browser
 * clients) are allowed through — the session and role checks still apply.
 */
export function isCrossSiteRequest(
  request: Request,
  trustedOrigins: readonly string[] = [],
): boolean {
  if (request.headers.get('sec-fetch-site')?.trim().toLowerCase() === 'cross-site') {
    return true;
  }

  const origin = request.headers.get('origin');
  if (origin === null) return false;

  let requestOrigin: string | null = null;
  try {
    requestOrigin = new URL(request.url).origin;
  } catch {
    requestOrigin = null;
  }

  if (requestOrigin !== null && origin === requestOrigin) return false;
  return !trustedOrigins.includes(origin);
}
