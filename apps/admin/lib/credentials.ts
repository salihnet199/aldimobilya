/**
 * Credential input bounds shared by the login form and the Credentials provider.
 *
 * The provider must reject oversized input before it reaches bcrypt (bcrypt
 * silently truncates at 72 bytes and hashing very long strings is a cheap CPU
 * exhaustion vector). The same constants drive the form's `maxLength` attributes
 * so the browser cannot even submit an oversized value.
 *
 * Dependency-free and client-safe.
 */

/** RFC 5321 practical maximum for an e-mail address. */
export const MAX_EMAIL_LENGTH = 254;

/** Generous upper bound for a password; bcrypt only consumes the first 72 bytes. */
export const MAX_PASSWORD_LENGTH = 200;

/** True when both fields are non-empty strings within the configured bounds. */
export function isAcceptableCredentialInput(email: unknown, password: unknown): boolean {
  if (typeof email !== 'string' || typeof password !== 'string') return false;
  if (!email || !password) return false;
  return email.length <= MAX_EMAIL_LENGTH && password.length <= MAX_PASSWORD_LENGTH;
}
