'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin route error boundary caught:', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 16,
        padding: 24,
      }}
    >
      <span style={{ color: 'var(--admin-gold)', fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        Hata
      </span>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 600 }}>Beklenmedik Bir Hata Oluştu</h1>
      <p style={{ color: 'var(--admin-text-muted)', maxWidth: 420 }}>
        Bir sorun oluştu. Tekrar deneyebilir ya da panele dönebilirsiniz.
      </p>
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <button type="button" onClick={reset} className="admin-btn admin-btn-primary">
          Tekrar Dene
        </button>
        <Link href="/dashboard" className="admin-btn">
          Panele Dön
        </Link>
      </div>
    </div>
  );
}
