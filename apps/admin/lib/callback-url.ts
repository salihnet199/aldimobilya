/**
 * Callback URL normalization for the admin login flow.
 *
 * Only local `/dashboard` routes are accepted. Anything else — absolute URLs,
 * protocol-relative URLs, backslash smuggling, `javascript:` payloads, path
 * traversal out of `/dashboard` or a different local page such as `/login` —
 * collapses to the default `/dashboard`.
 *
 * Pure and dependency-free so it can be unit tested and reused by both the
 * Edge middleware and the client login form.
 */

export const DEFAULT_CALLBACK_URL = '/dashboard';

/**
 * A throwaway base used only to parse relative candidates. Its origin can never
 * equal a real deployment origin, so an absolute/protocol-relative candidate
 * always resolves to a different origin and is rejected.
 */
const PARSE_BASE = 'http://callback.invalid';

const MAX_CALLBACK_LENGTH = 2048;
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

/** Returns a safe, local `/dashboard*` path or the default callback. */
export function normalizeCallbackUrl(raw: unknown): string {
  if (typeof raw !== 'string') return DEFAULT_CALLBACK_URL;

  const candidate = raw.trim();
  if (!candidate || candidate.length > MAX_CALLBACK_LENGTH) {
    return DEFAULT_CALLBACK_URL;
  }
  if (CONTROL_CHARS.test(candidate)) return DEFAULT_CALLBACK_URL;

  let url: URL;
  try {
    // `new URL` also normalizes `\` to `/` for http(s) bases, so
    // `/\evil.example` and `//evil.example` both surface as a foreign origin.
    url = new URL(candidate, PARSE_BASE);
  } catch {
    return DEFAULT_CALLBACK_URL;
  }

  if (url.origin !== PARSE_BASE) return DEFAULT_CALLBACK_URL;

  const path = url.pathname;
  if (path !== '/dashboard' && !path.startsWith('/dashboard/')) {
    return DEFAULT_CALLBACK_URL;
  }

  return `${path}${url.search}`;
}
