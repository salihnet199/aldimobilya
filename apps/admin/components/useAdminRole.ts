'use client';

import { useEffect, useState } from 'react';
import { getSession } from 'next-auth/react';
import { normalizeRole, type AdminRole } from '@/lib/roles';

/**
 * Client-side role hint for hiding/disabling controls the current account
 * cannot use.
 *
 * This is presentation only: the admin API re-reads the role from the database
 * on every request (`lib/auth-guard.ts`), so a stale or forged hint can never
 * grant a capability. `role` is `null` until the session has been fetched, and
 * stays `null` for unknown roles (fail closed), which lets callers keep
 * destructive controls disabled until the role is known.
 */
export function useAdminRole(): { role: AdminRole | null; loading: boolean } {
  const [role, setRole] = useState<AdminRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getSession()
      .then((session) => {
        if (!cancelled) setRole(normalizeRole(session?.user?.role));
      })
      .catch(() => {
        if (!cancelled) setRole(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { role, loading };
}
