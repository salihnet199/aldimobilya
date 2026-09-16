import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';
import { prisma } from '@aldimobilya/db';
import { auth } from '@/auth';
import { can, normalizeRole, type AdminCapability, type AdminRole } from '@/lib/roles';
import { checkSameOrigin, trustedOriginsFromEnv } from '@/lib/origin';
import { MAX_JSON_BODY_BYTES, limitedBodyErrorStatus, readLimitedBody } from '@/lib/request-body';

export type { AdminCapability, AdminRole };

/** The live database identity behind the session (not the JWT claims). */
export interface AdminIdentity {
  id: string;
  name: string;
  email: string;
}

/**
 * Defense-in-depth guard for admin API routes.
 *
 * `middleware.ts` already blocks unauthenticated `/api/*` requests at the edge,
 * but each handler re-checks so a middleware matcher regression, a direct route
 * invocation or a future public route cannot silently expose admin mutations.
 *
 * The guard does three things:
 *   1. same-origin (CSRF) check for unsafe methods, when a `Request` is passed;
 *   2. session revalidation against the database by `session.user.id`, so a
 *      deleted, revoked or demoted account cannot keep using a stale JWT;
 *   3. an explicit capability check against the *current* database role.
 */
export type AdminGuard =
  | { ok: true; session: Session; user: AdminIdentity; role: AdminRole }
  | { ok: false; response: NextResponse };

export interface RequireAdminOptions {
  /** Capability the caller must hold. Omit for "any authenticated staff". */
  capability?: AdminCapability;
  /** Pass the route's `Request` to enable the unsafe-method CSRF check. */
  request?: Request;
}

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export async function requireAdminSession(
  options: RequireAdminOptions = {},
): Promise<AdminGuard> {
  const { capability, request } = options;

  // 1. CSRF: only unsafe methods are checked, so GET/HEAD pass straight through.
  if (request) {
    const origin = checkSameOrigin(request, {
      trustedOrigins: trustedOriginsFromEnv(process.env),
    });
    if (!origin.ok) {
      return { ok: false, response: jsonError('Geçersiz istek kaynağı.', 403) };
    }
  }

  const session = await auth();
  const sessionUserId = session?.user?.id;

  if (!session?.user || typeof sessionUserId !== 'string' || !sessionUserId) {
    return { ok: false, response: jsonError('Yetkisiz erişim / Unauthorized', 401) };
  }

  // 2. Revalidate against the live user row: a deleted/revoked account is a 401
  // and a demoted account is judged by its *current* role, never the JWT claim.
  let dbUser: { id: string; name: string; email: string; role: string } | null;
  try {
    dbUser = await prisma.user.findUnique({
      where: { id: sessionUserId },
      select: { id: true, name: true, email: true, role: true },
    });
  } catch (err: unknown) {
    // Fail closed without leaking infrastructure details.
    console.error('[auth-guard] session revalidation failed', err);
    return { ok: false, response: jsonError('Kimlik doğrulanamadı.', 503) };
  }

  if (!dbUser) {
    return { ok: false, response: jsonError('Yetkisiz erişim / Unauthorized', 401) };
  }

  const role = normalizeRole(dbUser.role);
  if (!role) {
    return { ok: false, response: jsonError('Yetkisiz erişim / Unauthorized', 401) };
  }

  // 3. Explicit role policy.
  if (capability && !can(role, capability)) {
    return { ok: false, response: jsonError('Bu işlem için yetkiniz yok.', 403) };
  }

  return {
    ok: true,
    session,
    user: { id: dbUser.id, name: dbUser.name, email: dbUser.email },
    role,
  };
}

/**
 * Parses a JSON request body without leaking a 500 on malformed input.
 *
 * The body is read through `readLimitedBody`, so an unbounded payload is
 * rejected with 413 before `JSON.parse` ever sees it.
 */
export async function readJsonBody(
  request: Request,
  maxBytes: number = MAX_JSON_BODY_BYTES,
): Promise<{ ok: true; body: unknown } | { ok: false; response: NextResponse }> {
  const limited = await readLimitedBody(request, maxBytes);
  if (!limited.ok) {
    return {
      ok: false,
      response: jsonError('Geçersiz istek gövdesi.', limitedBodyErrorStatus(limited.reason)),
    };
  }

  if (limited.byteLength === 0) {
    return { ok: false, response: jsonError('Geçersiz JSON gövdesi.', 400) };
  }

  try {
    const text = new TextDecoder().decode(limited.bytes);
    return { ok: true, body: JSON.parse(text) };
  } catch {
    return { ok: false, response: jsonError('Geçersiz JSON gövdesi.', 400) };
  }
}

/** Prisma "record not found" (P2025) and unique-constraint (P2002) helpers. */
export function prismaErrorCode(err: unknown): string | undefined {
  if (
    err &&
    typeof err === 'object' &&
    'code' in err &&
    typeof (err as { code?: unknown }).code === 'string'
  ) {
    return (err as { code: string }).code;
  }
  return undefined;
}
