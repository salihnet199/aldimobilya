/**
 * Bounded, in-process rate limiting for credential attempts.
 *
 * IMPORTANT: this is a *local, per-instance* limiter. It is not shared between
 * serverless instances or regions and therefore must not be presented as
 * distributed rate limiting. A real distributed limit belongs at the edge/WAF
 * or in a shared store; `isDistributedRateLimitConfigured` reports whether such
 * a backend is configured so the operator can be warned.
 *
 * Design choices:
 *   - fixed window per key, with hard bounds on both the number of keys and the
 *     window length (the map can never grow without limit);
 *   - keys are built from a salted SHA-256 digest of the account identifier so
 *     raw e-mails are never held in memory, plus the client IP only when a
 *     trusted proxy is explicitly configured;
 *   - `X-Forwarded-For` is never trusted by default, and when it is trusted only
 *     the right-most hop (the address appended by our own proxy) is used —
 *     attacker-controlled leading hops are ignored.
 *
 * Pure apart from `node:crypto`, so it can be unit tested with an injected clock.
 */

import { createHash } from 'node:crypto';

export interface RateLimitOptions {
  /** Maximum attempts allowed per key per window. */
  max: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /** Hard cap on tracked keys (oldest/expired entries are evicted first). */
  maxKeys?: number;
  /** Injectable clock, for tests. */
  now?: () => number;
}

export interface RateLimitDecision {
  allowed: boolean;
  /** Attempts left in the current window (0 when blocked). */
  remaining: number;
  /** Milliseconds until the window resets when blocked, otherwise 0. */
  retryAfterMs: number;
  limit: number;
}

export interface RateLimiter {
  check(key: string): RateLimitDecision;
  reset(key?: string): void;
  size(): number;
}

interface WindowEntry {
  count: number;
  windowStart: number;
}

const DEFAULT_MAX_KEYS = 5000;

export function createRateLimiter(options: RateLimitOptions): RateLimiter {
  const max = Math.max(1, Math.floor(options.max));
  const windowMs = Math.max(1, Math.floor(options.windowMs));
  const maxKeys = Math.max(1, Math.floor(options.maxKeys ?? DEFAULT_MAX_KEYS));
  const now = options.now ?? (() => Date.now());

  const entries = new Map<string, WindowEntry>();

  function pruneExpired(current: number): void {
    for (const [key, entry] of entries) {
      if (current - entry.windowStart >= windowMs) entries.delete(key);
    }
  }

  function evictOldest(targetSize: number): void {
    while (entries.size > targetSize) {
      const oldest = entries.keys().next();
      if (oldest.done) break;
      entries.delete(oldest.value);
    }
  }

  return {
    check(key: string): RateLimitDecision {
      const current = now();
      const existing = entries.get(key);

      if (!existing || current - existing.windowStart >= windowMs) {
        if (!existing) {
          if (entries.size >= maxKeys) {
            pruneExpired(current);
            evictOldest(maxKeys - 1);
          }
        }
        entries.set(key, { count: 1, windowStart: current });
        return { allowed: true, remaining: max - 1, retryAfterMs: 0, limit: max };
      }

      if (existing.count >= max) {
        const retryAfterMs = Math.max(0, existing.windowStart + windowMs - current);
        return { allowed: false, remaining: 0, retryAfterMs, limit: max };
      }

      existing.count += 1;
      return {
        allowed: true,
        remaining: Math.max(0, max - existing.count),
        retryAfterMs: 0,
        limit: max,
      };
    },

    reset(key?: string): void {
      if (key === undefined) entries.clear();
      else entries.delete(key);
    },

    size(): number {
      return entries.size;
    },
  };
}

/**
 * Salted digest of an account identifier. The identifier is normalized
 * (trimmed + lower-cased) first so casing cannot be used to dodge the limit.
 * The salt is a server-side secret and is optional: an unsalted digest is still
 * better than holding the raw address, and nothing is persisted to disk.
 */
export function accountDigest(identifier: unknown, salt = ''): string {
  const normalized = typeof identifier === 'string' ? identifier.trim().toLowerCase() : '';
  return createHash('sha256').update(`${salt}\u0000${normalized}`).digest('hex');
}

export interface RateLimitKeyParts {
  accountDigest: string;
  ip?: string | null;
}

/** Builds the limiter key. The IP component is included only when available. */
export function rateLimitKey(parts: RateLimitKeyParts): string {
  const account = parts.accountDigest || 'anonymous';
  return parts.ip ? `acct:${account}|ip:${parts.ip}` : `acct:${account}`;
}

const IPV4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const IPV6 = /^[0-9a-fA-F:]{2,45}$/;

function looksLikeIp(value: string): boolean {
  if (IPV4.test(value)) {
    return value.split('.').every((part) => part.length <= 3 && Number(part) <= 255);
  }
  return value.includes(':') && IPV6.test(value);
}

export interface ClientIpOptions {
  /** Only `true` when a trusted reverse proxy is configured for this deployment. */
  trustProxy: boolean;
  headerName?: string;
}

/**
 * Extracts the client IP from proxy headers, but only when the deployment
 * explicitly declares a trusted proxy. Returns `null` otherwise, which makes the
 * limiter fall back to the account-only key.
 */
export function clientIpFromHeaders(
  headers: { get(name: string): string | null },
  options: ClientIpOptions,
): string | null {
  if (!options.trustProxy) return null;

  const header = headers.get(options.headerName ?? 'x-forwarded-for');
  if (!header) return null;

  const hops = header
    .split(',')
    .map((hop) => hop.trim())
    .filter(Boolean);
  if (!hops.length) return null;

  // Right-most hop = the address observed by the proxy closest to us. Anything
  // further left is client-supplied and therefore untrusted.
  for (let index = hops.length - 1; index >= 0; index -= 1) {
    if (looksLikeIp(hops[index])) return hops[index];
  }
  return null;
}

export const LOGIN_RATE_LIMIT_MAX = 10;
export const LOGIN_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
export const LOGIN_RATE_LIMIT_MAX_KEYS = 5000;

/** Reads the explicit trusted-proxy opt-in. Defaults to untrusted. */
export function trustProxyFromEnv(env: Record<string, string | undefined>): boolean {
  return env.ADMIN_TRUST_PROXY === 'true' || env.ADMIN_TRUST_PROXY === '1';
}

/**
 * Whether a shared/distributed limiter backend is configured.
 *
 * This codebase ships no such backend, so this returns `false` and the caller
 * logs a warning instead of failing closed. Failing closed on a missing shared
 * store would lock every operator out of a deployment that is otherwise healthy,
 * while the local limiter still raises the cost of online guessing.
 */
export function isDistributedRateLimitConfigured(
  env: Record<string, string | undefined>,
): boolean {
  return Boolean(env.ADMIN_RATE_LIMIT_BACKEND_URL);
}
