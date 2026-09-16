import { getSiteSettings, getInstagramHref, getInstagramHandle } from '@/lib/site-settings';
import styles from './InstagramSection.module.css';

export default async function InstagramSection() {
  const settings = await getSiteSettings();
  const instagramHref = getInstagramHref(settings.instagram);
  const instagramHandle = getInstagramHandle(settings.instagram);
  const isExternal = instagramHref !== null;

  return (
    <section className={`section ${styles.section}`} aria-labelledby="instagram-heading">
      <div className="container">
        {/* Header */}
        <div className="section-header">
          {instagramHref && (
            <a
              href={instagramHref}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.handle}
              aria-label="Instagram sayfamızı ziyaret edin"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
              {instagramHandle ? `@${instagramHandle}` : 'Instagram'}
            </a>
          )}
          <h2 id="instagram-heading" className="display-md" style={{ marginTop: 'var(--space-3)' }}>
            Instagram&apos;da Bizi Takip Edin
          </h2>
          <div className="gold-line gold-line-center" />
          <p className="body-lg text-muted" style={{ maxWidth: 480, margin: '0 auto' }}>
            En yeni tasarımlarımız, ilham veren interiyörler ve koleksiyon hikayeleri için bizi takip edin.
          </p>
        </div>

        {/* Safe external profile link — no third-party scripts or injected markup */}
        <div className={styles.ctaCard}>
          <p className={styles.ctaText}>
            {isExternal
              ? 'Güncel koleksiyonumuzu ve müşteri çalışmalarımızı Instagram profilimizde paylaşıyoruz.'
              : 'Instagram hesabımız yakında aktif olacak. Bu süreçte bize iletişim sayfamızdan ulaşabilirsiniz.'}
          </p>
          <a
            href={instagramHref ?? '/iletisim'}
            {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className="btn btn-outline"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z" />
            </svg>
            {isExternal ? 'Profilimizi Ziyaret Et' : 'Bize Ulaşın'}
          </a>
        </div>
      </div>
    </section>
  );
}
