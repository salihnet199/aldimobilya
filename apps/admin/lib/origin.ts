/**
 * Same-origin (CSRF) checks for state-changing admin requests.
 *
 * Policy — applied per route, only to unsafe methods (POST/PUT/PATCH/DELETE):
 *   - reject `Sec-Fetch-Site: cross-site` outright;
 *   - if `Origin` is present it must equal the request origin or one of the
 *     configured trusted origins (e.g. `AUTH_URL`/`NEXTAUTH_URL` behind a
 *     proxy);
 *   - if `Origin` is absent, accept only `Sec-Fetch-Site: same-origin`.
 *
 * No CORS response headers are emitted anywhere: a cross-origin request is
 * rejected, never allowed with `Access-Control-Allow-Origin`.
 *
 * Pure and dependency-free so it can be unit tested with explicit origins.
 */

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export type OriginCheckFailure =
  | 'cross_site_fetch'
  | 'cross_origin'
  | 'missing_origin'
  | 'invalid_request_url';

export type OriginCheckResult = { ok: true } | { ok: false; reason: OriginCheckFailure };

export interface OriginCheckOptions {
  /** Extra absolute origins that are allowed in addition to the request origin. */
  trustedOrigins?: readonly string[];
}

/** True for methods that can mutate state and therefore need a CSRF check. */
export function isUnsafeMethod(method: string | undefined | null): boolean {
  return UNSAFE_METHODS.has((method ?? 'GET').toUpperCase());
}

/** Normalizes an absolute http(s) URL/string to its origin, or `null`. */
export function normalizeOrigin(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  return url.origin;
}

/**
 * Collects trusted origins from the environment. Only deployment-controlled
 * variables are read; request headers are never used as a source of trust.
 */
export function trustedOriginsFromEnv(env: Record<string, string | undefined>): string[] {
  const origins: string[] = [];
  const sources = [env.AUTH_URL, env.NEXTAUTH_URL, env.ADMIN_TRUSTED_ORIGINS];

  for (const source of sources) {
    if (!source) continue;
    for (const part of source.split(',')) {
      const origin = normalizeOrigin(part);
      if (origin && !origins.includes(origin)) origins.push(origin);
    }
  }
  return origins;
}

/** Runs the same-origin policy for one request. Safe methods always pass. */
export function checkSameOrigin(
  request: Request,
  options: OriginCheckOptions = {},
): OriginCheckResult {
  if (!isUnsafeMethod(request.method)) return { ok: true };

  let requestOrigin: string;
  try {
    requestOrigin = new URL(request.url).origin;
  } catch {
    return { ok: false, reason: 'invalid_request_url' };
  }

  const secFetchSite = request.headers.get('sec-fetch-site')?.trim().toLowerCase();
  if (secFetchSite === 'cross-site') {
    return { ok: false, reason: 'cross_site_fetch' };
  }

  const originHeader = request.headers.get('origin');
  if (originHeader !== null) {
    const origin = normalizeOrigin(originHeader);
    if (!origin) return { ok: false, reason: 'cross_origin' };
    if (origin === requestOrigin) return { ok: true };
    if ((options.trustedOrigins ?? []).includes(origin)) return { ok: true };
    return { ok: false, reason: 'cross_origin' };
  }

  // No Origin header: only trust the browser fetch-metadata signal.
  if (secFetchSite === 'same-origin') return { ok: true };

  return { ok: false, reason: 'missing_origin' };
}
