'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[dashboard]', error);
  }, [error]);

  return (
    <div className={styles.page}>
      <div className={styles.errorBox} role="alert">
        <h1 className={styles.errorTitle}>Bir şeyler ters gitti</h1>
        <p className={styles.errorText}>
          {error.message || 'Veriler yüklenirken beklenmeyen bir hata oluştu.'}
        </p>
        <div className={styles.errorActions}>
          <button type="button" className="admin-btn admin-btn-primary" onClick={() => reset()}>
            Tekrar Dene
          </button>
          <Link href="/dashboard" className="admin-btn admin-btn-ghost">
            Dashboard&apos;a Dön
          </Link>
        </div>
      </div>
    </div>
  );
}
