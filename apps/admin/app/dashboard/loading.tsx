import styles from './page.module.css';

export default function DashboardLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>Veriler yükleniyor…</p>
        </div>
      </div>

      <div className={styles.skeletonGrid}>
        <div className={styles.skeletonCard} />
        <div className={styles.skeletonCard} />
        <div className={styles.skeletonCard} />
        <div className={styles.skeletonCard} />
      </div>

      <div className={styles.skeletonBlock} />
      <p className={styles.loadingText}>Yükleniyor…</p>
    </div>
  );
}
