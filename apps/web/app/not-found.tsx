import Link from 'next/link';

export default function NotFound() {
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
      <span className="section-eyebrow">404</span>
      <h1 className="display-lg">Sayfa Bulunamadı</h1>
      <div className="gold-line gold-line-center" />
      <p className="body-lg text-muted" style={{ maxWidth: 460 }}>
        Aradığınız sayfa taşınmış ya da hiç var olmamış olabilir. Koleksiyonumuza göz atmaya
        ne dersiniz?
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-4)', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/" className="btn btn-gold" data-magnetic>
          Ana Sayfaya Dön
        </Link>
        <Link href="/katalog" className="btn btn-outline" data-magnetic>
          Koleksiyonu Görüntüle
        </Link>
      </div>
    </div>
  );
}
