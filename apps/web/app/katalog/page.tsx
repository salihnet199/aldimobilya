import type { Metadata } from 'next';
import Link from 'next/link';
import AdaptiveImage from '@/components/ui/AdaptiveImage';
import ScrollReveal from '@/components/ui/ScrollReveal';
import { getSiteSettings, getInstagramHref } from '@/lib/site-settings';
import { listPublicRooms } from '@/lib/rooms';
import { pageMetadata } from '@/lib/seo';
import styles from './page.module.css';

export const metadata: Metadata = pageMetadata(
  'Yatak Odası Koleksiyonu',
  'ALDi Mobilya lüks yatak odası tasarımları — tüm koleksiyonumuzu inceleyin.',
  '/katalog',
);

// Rooms are authored in the admin panel; ISR keeps the catalogue CDN-cached
// and refreshes within 5 minutes of a publish.
export const revalidate = 0;

export default async function KatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ kategori?: string; ara?: string }>;
}) {
  const params = await searchParams;
  const [{ rooms, categories }, settings] = await Promise.all([
    listPublicRooms({ category: params.kategori, search: params.ara }),
    getSiteSettings(),
  ]);
  const instagramHref = getInstagramHref(settings.instagram);

  return (
    <div className={styles.page}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div className="container">
          <span className="section-eyebrow">Koleksiyon</span>
          <h1 className="display-lg">Yatak Odaları</h1>
          <div className="gold-line" />
          <p className="body-lg text-muted" style={{ maxWidth: 520 }}>
            Zamansız zarafet ve konfor için el işçiliğiyle üretilen lüks yatak odası takımları.
          </p>
        </div>
      </div>

      <div className="container section">
        {/* Filters */}
        <div className={styles.controls}>
          {categories.length > 0 && (
            <div className={styles.chips}>
              <Link href="/katalog" className={`chip ${!params.kategori ? 'active' : ''}`}>
                Tümü
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat}
                  href={`/katalog?kategori=${encodeURIComponent(cat)}`}
                  className={`chip ${params.kategori === cat ? 'active' : ''}`}
                >
                  {cat}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Rooms Grid */}
        {rooms.length > 0 ? (
          <div className={styles.grid}>
            {rooms.map((room, idx) => {
              const displayName = room.nameTr || room.nameEn || room.slug;
              const displayImage = room.images[0]?.url || room.heroImage;

              return (
                <ScrollReveal key={room.id} staggerIndex={(idx % 6) + 1}>
                  <Link
                    href={`/katalog/${room.slug}`}
                    className={`room-card ${styles.card}`}
                    aria-label={`${displayName} — detayları gör`}
                  >
                    <AdaptiveImage
                      src={displayImage}
                      alt={displayName}
                      fill
                      sizes="(max-width: 640px) calc(50vw - 12px), (max-width: 1024px) calc(50vw - 24px), calc(33vw - 24px)"
                      style={{ objectFit: 'cover' }}
                    />
                    <div className="room-card-overlay">
                      <div className="room-card-info">
                        {room.category && <p className="room-card-category">{room.category}</p>}
                        <p className="room-card-name">{displayName}</p>
                      </div>
                    </div>
                  </Link>
                </ScrollReveal>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
            </div>
            <h2 className="heading-lg" style={{ marginBottom: 'var(--space-3)' }}>
              Koleksiyon Hazırlanıyor
            </h2>
            <p className="body-md text-muted" style={{ maxWidth: 420, margin: '0 auto var(--space-8)' }}>
              Yeni modellerimiz yakında eklenecek. Güncellemeler için bizi takip edin.
            </p>
            <a
              href={instagramHref ?? '/iletisim'}
              {...(instagramHref ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className="btn btn-outline"
            >
              {instagramHref ? 'Instagram Profilimiz' : 'Bize Ulaşın'}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

