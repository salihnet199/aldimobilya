/**
 * Pure role/capability policy for the admin surface.
 *
 * Policy (backward-compatible with the previous "any authenticated session"
 * behaviour for reads and writes):
 *
 *   ADMIN  — read + create/update rooms & videos, upload, delete rooms &
 *            videos, read + write site settings.
 *   EDITOR — read + create/update rooms & videos, upload, read site settings.
 *            Cannot delete and cannot write site settings.
 *
 * `session.user.role` is only a hint: the authoritative role is re-read from the
 * database in `lib/auth-guard.ts`, so a stale JWT issued before a demotion can
 * never grant a capability the account no longer has.
 *
 * This module is intentionally dependency-free so it can be imported from the
 * Edge middleware and unit tested directly with the Node test runner.
 */

export type AdminRole = 'ADMIN' | 'EDITOR';

export type AdminCapability =
  | 'rooms:read'
  | 'rooms:write'
  | 'rooms:delete'
  | 'videos:read'
  | 'videos:write'
  | 'videos:delete'
  | 'settings:read'
  | 'settings:write'
  | 'upload';

/** Capabilities shared by every authenticated staff role. */
const EDITOR_CAPABILITIES: readonly AdminCapability[] = [
  'rooms:read',
  'rooms:write',
  'videos:read',
  'videos:write',
  'settings:read',
  'upload',
];

const ADMIN_CAPABILITIES: readonly AdminCapability[] = [
  ...EDITOR_CAPABILITIES,
  'rooms:delete',
  'videos:delete',
  'settings:write',
];

const CAPABILITY_MATRIX: Record<AdminRole, readonly AdminCapability[]> = {
  ADMIN: ADMIN_CAPABILITIES,
  EDITOR: EDITOR_CAPABILITIES,
};

/** Returns the role when it is a known role, otherwise `null`. */
export function normalizeRole(value: unknown): AdminRole | null {
  return value === 'ADMIN' || value === 'EDITOR' ? value : null;
}

/** Unknown/missing roles hold no capability at all (fail closed). */
export function can(role: unknown, capability: AdminCapability): boolean {
  const normalized = normalizeRole(role);
  if (!normalized) return false;
  return CAPABILITY_MATRIX[normalized].includes(capability);
}

/** Full capability list for a role; empty for unknown roles. */
export function capabilitiesFor(role: unknown): AdminCapability[] {
  const normalized = normalizeRole(role);
  return normalized ? [...CAPABILITY_MATRIX[normalized]] : [];
}
