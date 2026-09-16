import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@aldimobilya/db';
import { imageProps } from '@/lib/media';
import styles from './FeaturedRooms.module.css';

async function getFeaturedRooms() {
  try {
    return await prisma.room.findMany({
      where: { isVisible: true, isFeatured: true },
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: { images: { orderBy: { order: 'asc' }, take: 1 } },
    });
  } catch (err) {
    console.error('getFeaturedRooms error:', err);
    return [];
  }
}

export default async function FeaturedRooms() {
  const rooms = await getFeaturedRooms();

  // Nothing curated yet — stay out of the way rather than showing a placeholder.
  // The homepage still shows real rooms through LatestRooms.
  if (rooms.length === 0) return null;

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
        <div className={styles.grid}>
          {rooms.map((room, i) => {
            const displayName = room.nameTr || room.nameEn || room.slug;
            const displayImage = room.images[0]?.url || room.heroImage;

            return (
              <Link
                key={room.id}
                href={`/katalog/${room.slug}`}
                className={`room-card ${styles.card} ${i === 0 ? styles.cardLarge : ''}`}
                aria-label={`${displayName} — detayları gör`}
              >
                <Image
                  {...imageProps(displayImage)}
                  alt={displayName}
                  fill
                  priority={i === 0}
                  sizes="(max-width: 768px) 100vw, 50vw"
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
