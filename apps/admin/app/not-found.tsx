import Link from 'next/link';

export default function NotFound() {
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
        404
      </span>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 600 }}>Sayfa Bulunamadı</h1>
      <p style={{ color: 'var(--admin-text-muted)', maxWidth: 420 }}>
        Bu sayfa mevcut değil ya da taşınmış olabilir.
      </p>
      <Link href="/dashboard" className="admin-btn admin-btn-primary" style={{ marginTop: 8 }}>
        Panele Dön
      </Link>
    </div>
  );
}
