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
    console.error('Route error boundary caught:', error);
  }, [error]);

  return (
    <div
      className="container section"
      style={{
        minHeight: '70vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 'var(--space-4)',
      }}
    >
      <span className="section-eyebrow">Bir şeyler ters gitti</span>
      <h1 className="display-lg">Beklenmedik Bir Hata Oluştu</h1>
      <div className="gold-line gold-line-center" />
      <p className="body-lg text-muted" style={{ maxWidth: 460 }}>
        Sayfa yüklenirken bir sorun oluştu. Lütfen tekrar deneyin, sorun devam ederse bizimle
        iletişime geçin.
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-4)', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button type="button" onClick={reset} className="btn btn-gold" data-magnetic>
          Tekrar Dene
        </button>
        <Link href="/" className="btn btn-outline" data-magnetic>
          Ana Sayfaya Dön
        </Link>
      </div>
    </div>
  );
}
