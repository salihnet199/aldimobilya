import { redirect } from 'next/navigation';
import { prisma } from '@aldimobilya/db';
import Sidebar from '@/components/Sidebar';
import { auth } from '@/auth';
import { normalizeRole } from '@/lib/roles';
import styles from './DashboardLayout.module.css';

const LOGIN_REDIRECT = '/login?callbackUrl=%2Fdashboard';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const sessionUserId = session?.user?.id;

  if (!session?.user || typeof sessionUserId !== 'string' || !sessionUserId) {
    redirect(LOGIN_REDIRECT);
  }

  // Re-validate the session against the live user row so a deleted, revoked or
  // demoted account cannot keep browsing the dashboard with a stale JWT.
  // Throws to the dashboard error boundary if the database is unreachable
  // (fail closed rather than rendering admin pages on unverified identity).
  const dbUser = await prisma.user.findUnique({
    where: { id: sessionUserId },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!dbUser || !normalizeRole(dbUser.role)) {
    redirect(LOGIN_REDIRECT);
  }

  return (
    <div className={styles.shell}>
      <Sidebar user={{ name: dbUser.name, email: dbUser.email }} />
      <div className={styles.main}>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
