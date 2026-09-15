import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@aldimobilya/db';
import styles from './FeaturedRooms.module.css';

async function getFeaturedRooms() {
  try {
    const rooms = await prisma.room.findMany({
      where: { isVisible: true, isFeatured: true },
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: { images: { orderBy: { order: 'asc' }, take: 1 } },
    });
    return rooms;
  } catch (err) {
    console.error('getFeaturedRooms error:', err);
    return [];
  }
}

export default async function FeaturedRooms() {
  const rooms = await getFeaturedRooms();

  return (
    <section className={`section ${styles.section}`} aria-labelledby="featured-heading">
      <div className="container">
        {/* Header */}
        <div className="section-header">
          <span className="section-eyebrow">Featured Designs / Öne Çıkan Tasarımlar</span>
          <h2 id="featured-heading" className="display-md">
            Seçkin Koleksiyonumuz
          </h2>
          <div className="gold-line gold-line-center" />
          <p className="body-lg text-muted" style={{ maxWidth: 540, margin: '0 auto' }}>
            Her tasarım, yaşam alanınıza özgün bir karakter ve rafine bir estetik katar.
          </p>
        </div>

        {/* Grid */}
        {rooms.length > 0 ? (
          <div className={styles.grid}>
            {rooms.map((room, i) => {
              const displayName = room.nameEn || room.nameTr;
              const displayImage = room.images[0]?.url || room.heroImage;

              return (
                <Link
                  key={room.id}
                  href={`/katalog/${room.slug}`}
                  className={`room-card ${styles.card} ${i === 0 ? styles.cardLarge : ''}`}
                  aria-label={`${displayName} — View Details`}
                >
                  <Image
                    src={displayImage}
                    alt={displayName}
                    fill
                    priority={i < 2}
                    unoptimized
                    sizes="(max-width: 768px) 100vw, 50vw"
                    style={{ objectFit: 'cover' }}
                  />
                  <div className="room-card-overlay">
                    <div className="room-card-info">
                      {room.category && (
                        <p className="room-card-category">{room.category}</p>
                      )}
                      <p className="room-card-name">{displayName}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
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
