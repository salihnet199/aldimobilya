import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@aldimobilya/db';
import { imageProps } from '@/lib/media';
import styles from './LatestRooms.module.css';

/**
 * Newest visible, non-featured models. Featured models already appear in
 * FeaturedRooms, so filtering them out keeps the homepage free of duplicates.
 */
async function getLatestRooms() {
  try {
    return await prisma.room.findMany({
      where: { isVisible: true, isFeatured: false },
      take: 4,
      orderBy: { createdAt: 'desc' },
      include: { images: { orderBy: { order: 'asc' }, take: 1 } },
    });
  } catch (err) {
    console.error('getLatestRooms error:', err);
    return [];
  }
}

export default async function LatestRooms() {
  const rooms = await getLatestRooms();
  if (rooms.length === 0) return null;

  return (
    <section className={`section ${styles.section}`} aria-labelledby="latest-heading">
      <div className="container">
        {/* Header */}
        <div className="section-header">
          <span className="section-eyebrow">Son Eklenen Modeller</span>
          <h2 id="latest-heading" className="display-md">
            Yeni Eklenenler
          </h2>
          <div className="gold-line gold-line-center" />
          <p className="body-lg text-muted" style={{ maxWidth: 520, margin: '0 auto' }}>
            Atölyemizden en yeni yatak odası tasarımları.
          </p>
        </div>

        {/* Grid */}
        <div className={styles.grid}>
          {rooms.map((room) => {
            const displayName = room.nameTr || room.nameEn || room.slug;
            const displayImage = room.images[0]?.url || room.heroImage;

            return (
              <Link
                key={room.id}
                href={`/katalog/${room.slug}`}
                className="room-card"
                aria-label={`${displayName} — detayları gör`}
              >
                <Image
                  {...imageProps(displayImage)}
                  alt={displayName}
                  fill
                  sizes="(max-width: 600px) 50vw, (max-width: 1200px) 33vw, 25vw"
                  style={{ objectFit: 'cover' }}
                />
                <div className="room-card-overlay">
                  <div className="room-card-info">
                    {room.category && <p className="room-card-category">{room.category}</p>}
                    <p className="room-card-name">{displayName}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* View All */}
        <div className={styles.viewAll}>
          <Link href="/katalog" className="btn btn-outline">
            Tüm Modelleri Gör
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
