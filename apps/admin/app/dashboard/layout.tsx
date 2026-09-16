import Sidebar from '@/components/Sidebar';
import { auth } from '@/auth';
import styles from './DashboardLayout.module.css';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className={styles.shell}>
      <Sidebar user={session?.user ?? null} />
      <div className={styles.main}>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
