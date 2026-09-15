import Sidebar from '@/components/Sidebar';
import styles from './DashboardLayout.module.css';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.main}>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
