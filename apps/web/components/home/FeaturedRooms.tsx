import Link from 'next/link';
import Image from 'next/image';
import styles from './FeaturedRooms.module.css';

// This data will come from the DB/API once rooms are added via Admin Panel.
// For now we show an empty/coming-soon state.
const FEATURED_ROOMS: {
  id: string;
  slug: string;
  nameTr: string;
  category?: string;
  heroImage: string;
}[] = [];

export default function FeaturedRooms() {
  return (
    <section className={`section ${styles.section}`} aria-labelledby="featured-heading">
      <div className="container">
        {/* Header */}
        <div className="section-header">
          <span className="section-eyebrow">Öne Çıkan Tasarımlar</span>
          <h2 id="featured-heading" className="display-md">
            Seçkin Koleksiyonumuz
          </h2>
          <div className="gold-line gold-line-center" />
          <p className="body-lg text-muted" style={{ maxWidth: 540, margin: '0 auto' }}>
            Her tasarım, yaşam alanınıza özgün bir karakter ve rafine bir estetik katar.
          </p>
        </div>

        {/* Grid */}
        {FEATURED_ROOMS.length > 0 ? (
          <div className={styles.grid}>
            {FEATURED_ROOMS.map((room, i) => (
              <Link
                key={room.id}
                href={`/katalog/${room.slug}`}
                className={`room-card ${styles.card} ${i === 0 ? styles.cardLarge : ''}`}
                aria-label={`${room.nameTr} — detayları görüntüle`}
              >
                <Image
                  src={room.heroImage}
                  alt={room.nameTr}
                  fill
                  priority={i < 2}
                  unoptimized
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="room-card-overlay">
                  <div className="room-card-info">
                    {room.category && (
                      <p className="room-card-category">{room.category}</p>
                    )}
                    <p className="room-card-name">{room.nameTr}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className={styles.comingSoon}>
            <div className={styles.comingSoonIcon} aria-hidden="true">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M3 9h18M9 21V9"/>
              </svg>
            </div>
            <p className="heading-md" style={{ marginBottom: 'var(--space-3)' }}>
              Koleksiyon Hazırlanıyor
            </p>
            <p className="body-md text-muted">
              Tasarımlarımız yakında burada görünecek. Lütfen takipte kalın.
            </p>
          </div>
        )}

        {/* View All */}
        <div className={styles.viewAll}>
          <Link href="/katalog" className="btn btn-outline">
            Tüm Koleksiyonu Gör
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
