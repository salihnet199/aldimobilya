import type { Metadata } from 'next';
import { getSiteSettings, getWhatsAppHref, getInstagramHref, getInstagramHandle } from '@/lib/site-settings';
import { pageMetadata } from '@/lib/seo';
import styles from './page.module.css';

export const metadata: Metadata = pageMetadata(
  'İletişim',
  'ALDi Mobilya ile iletişime geçin. WhatsApp danışma hattı, showroom adresi ve detaylı bilgi.',
  '/iletisim',
);

// Contact details are admin-managed; ISR refreshes them within 5 minutes.
export const revalidate = 0;

export default async function ContactPage() {
  const settings = await getSiteSettings();
  const whatsappHref = getWhatsAppHref(settings.whatsapp, 'Merhaba, bilgi almak istiyorum.');
  const instagramHref = getInstagramHref(settings.instagram);
  const instagramHandle = getInstagramHandle(settings.instagram);

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div className="container">
          <span className="section-eyebrow">Bize Ulaşın</span>
          <h1 className="display-lg">İletişim</h1>
          <div className="gold-line" />
          <p className="body-lg text-muted" style={{ maxWidth: 540 }}>
            Tüm model ve özel sipariş talepleriniz için bize kolayca ulaşabilirsiniz.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container section">
        <div className={styles.grid}>
          {/* Info cards */}
          <div className={styles.infoCol}>
            <div className={styles.card}>
              <div className={styles.cardIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
              <div>
                <h2 className="heading-md" style={{ marginBottom: 'var(--space-1)' }}>
                  Hızlı İletişim (WhatsApp)
                </h2>
                <p className="body-sm text-muted" style={{ marginBottom: 'var(--space-3)' }}>
                  Sorularınız ve fiyat danışmanlığı için bize WhatsApp üzerinden 7/24 yazabilirsiniz.
                </p>
                {settings.whatsapp ? (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-whatsapp btn-sm"
                  >
                    WhatsApp Sohbeti Başlat
                  </a>
                ) : (
                  <p className={styles.note}>
                    WhatsApp numaramız henüz eklenmedi. Kısa süre içinde burada olacak.
                  </p>
                )}
              </div>
            </div>

            {instagramHref && (
              <div className={styles.card}>
                <div className={styles.cardIcon}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z" />
                  </svg>
                </div>
                <div>
                  <h2 className="heading-md" style={{ marginBottom: 'var(--space-1)' }}>
                    Instagram
                  </h2>
                  <p className="body-sm text-muted" style={{ marginBottom: 'var(--space-3)' }}>
                    En yeni modellerimiz ve müşteri geri bildirimlerimizi takip edin.
                  </p>
                  <a
                    href={instagramHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline btn-sm"
                  >
                    {instagramHandle ? `@${instagramHandle}` : 'Instagram'} Profiline Git
                  </a>
                </div>
              </div>
            )}

            {(settings.phone || settings.email) && (
              <div className={styles.card}>
                <div className={styles.cardIcon}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </div>
                <div>
                  <h2 className="heading-md" style={{ marginBottom: 'var(--space-1)' }}>
                    Telefon & E-posta
                  </h2>
                  <div className={styles.contactLines}>
                    {settings.phone && (
                      <a href={`tel:${settings.phone.replace(/\s+/g, '')}`} className={styles.contactLink}>
                        {settings.phone}
                      </a>
                    )}
                    {settings.email && (
                      <a href={`mailto:${settings.email}`} className={styles.contactLink}>
                        {settings.email}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className={styles.card}>
              <div className={styles.cardIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div>
                <h2 className="heading-md" style={{ marginBottom: 'var(--space-1)' }}>
                  Showroom & Adres
                </h2>
                <p className="body-sm text-muted">
                  {settings.address ??
                    'Showroom ziyaretleri ve randevu için WhatsApp üzerinden bize bildirebilirsiniz.'}
                </p>
              </div>
            </div>
          </div>

          {/* Right info summary */}
          <div className={styles.summaryCol}>
            <div className={styles.summaryBox}>
              <span className="section-eyebrow">ALDi Mobilya</span>
              <h3 className="heading-lg" style={{ marginBottom: 'var(--space-4)' }}>
                Size Özel Yatak Odası Deneyimi
              </h3>
              <p className="body-md text-muted" style={{ marginBottom: 'var(--space-6)' }}>
                Tüm ürünlerimiz özel sipariş üzerine en yüksek kalite standartlarında hazırlanır.
                Her türlü soru, ölçü danışmanlığı veya katalog talepleriniz için bir mesaj uzağınızdayız.
              </p>
              <div className="gold-line" />
              <div className={styles.highlights}>
                <div className={styles.highlightItem}>
                  <span className={styles.highlightDot} aria-hidden="true" />
                  <span>Hızlı WhatsApp Yanıtı</span>
                </div>
                <div className={styles.highlightItem}>
                  <span className={styles.highlightDot} aria-hidden="true" />
                  <span>Özel Ölçü Danışmanlığı</span>
                </div>
                <div className={styles.highlightItem}>
                  <span className={styles.highlightDot} aria-hidden="true" />
                  <span>Kişiselleştirilebilir Malzeme & Renk Seçenekleri</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

