import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@aldimobilya/db';
import { authConfig } from './auth.config';
import { isAcceptableCredentialInput } from './lib/credentials';
import {
  LOGIN_RATE_LIMIT_MAX,
  LOGIN_RATE_LIMIT_MAX_KEYS,
  LOGIN_RATE_LIMIT_WINDOW_MS,
  accountDigest,
  clientIpFromHeaders,
  createRateLimiter,
  isDistributedRateLimitConfigured,
  rateLimitKey,
  trustProxyFromEnv,
} from './lib/rate-limit';

/**
 * A valid bcrypt hash of a throwaway string. When no account matches, we still
 * run one bcrypt comparison against this value so the response time does not
 * reveal whether the e-mail exists. It can never authenticate anyone: the
 * missing-account branch always returns `null`.
 */
const TIMING_EQUALIZER_HASH =
  '$2b$10$SrHH04yelOUJXxTkPX5rFuIrw2vOuXQUfsghbyT3z49KDSRj5/OnW';

/** Salt for the in-memory account digest; never persisted or logged. */
const ACCOUNT_DIGEST_SALT = process.env.ADMIN_RATE_LIMIT_SALT ?? 'aldimobilya-admin-login';

const loginLimiter = createRateLimiter({
  max: LOGIN_RATE_LIMIT_MAX,
  windowMs: LOGIN_RATE_LIMIT_WINDOW_MS,
  maxKeys: LOGIN_RATE_LIMIT_MAX_KEYS,
});

const trustProxy = trustProxyFromEnv(process.env);

if (!isDistributedRateLimitConfigured(process.env)) {
  // Per-instance only. The distributed limit must come from the edge/WAF layer.
  console.warn(
    '[auth] login rate limiting is in-memory and per-instance; enforce a distributed limit at the edge/WAF.',
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'E-posta', type: 'email' },
        password: { label: 'Parola', type: 'password' },
      },
      async authorize(credentials, request) {
        const email = credentials?.email;
        const password = credentials?.password;

        // 1. Shape + length bounds before any expensive work. Oversized input is
        // rejected here so bcrypt can never be fed an unbounded string.
        if (typeof email !== 'string' || typeof password !== 'string') {
          return null;
        }
        if (!isAcceptableCredentialInput(email, password)) {
          return null;
        }

        const normalizedEmail = email.toLowerCase().trim();
        if (!normalizedEmail) return null;

        // 2. Bounded, local rate limit keyed on the account digest, plus the
        // client IP only when a trusted proxy is explicitly configured.
        const ip = clientIpFromHeaders(request?.headers ?? new Headers(), {
          trustProxy,
        });
        const key = rateLimitKey({
          accountDigest: accountDigest(normalizedEmail, ACCOUNT_DIGEST_SALT),
          ip,
        });

        const decision = loginLimiter.check(key);
        if (!decision.allowed) {
          // Generic failure: never reveal that the limit was hit or for which key.
          console.warn('[auth] login attempt rate limited');
          return null;
        }

        // 3. Credential check. Both branches pay one bcrypt comparison so the
        // timing of a missing account matches a wrong password.
        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (!user) {
          await bcrypt.compare(password, TIMING_EQUALIZER_HASH);
          return null;
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
});
