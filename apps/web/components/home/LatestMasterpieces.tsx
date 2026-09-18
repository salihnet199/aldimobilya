import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@aldimobilya/db';
import { imageProps } from '@/lib/media';
import styles from './LatestMasterpieces.module.css';

async function getLatestPublishedRooms() {
  try {
    return await prisma.room.findMany({
      where: { isVisible: true },
      orderBy: { createdAt: 'desc' },
      take: 7,
      include: {
        images: { orderBy: { order: 'asc' } },
      },
    });
  } catch (err) {
    console.error('getLatestPublishedRooms error:', err);
    return [];
  }
}

export default async function LatestMasterpieces() {
  const rooms = await getLatestPublishedRooms();

  if (rooms.length === 0) return null;

  return (
    <section className={styles.section} aria-labelledby="latest-masterpieces-heading">
      <div className="container">
        {/* Section Header */}
        <div className={styles.header}>
          <div className={styles.eyebrow}>Özel Koleksiyon & Yeni Tasarımlar</div>
          <h2 id="latest-masterpieces-heading" className={styles.title}>
            En Son Eklenen <span className={styles.titleGold}>Şaheserler</span>
          </h2>
          <div className="gold-line gold-line-center" style={{ margin: '16px auto 20px' }} />
          <p className={styles.subtitle}>
            İnegöl zanaatkarlarımızın el işçiliğiyle ürettiği en yeni yatak odası ve yemek odası tasarımları.
            Her model özgün, her açı büyüleyici.
          </p>
        </div>

        {/* High-Definition Photography Showcase Grid */}
        <div className={styles.grid}>
          {rooms.map((room, idx) => {
            const displayName = room.nameTr || room.nameEn || room.slug;
            // Best high-res photograph
            const primaryPhoto = room.images[0]?.url || room.heroImage;
            const totalPhotos = room.images.length > 0 ? room.images.length : (room.heroImage ? 1 : 0);
            const isLead = idx === 0;

            const categoryName = room.category === 'yemek-odasi'
              ? 'Yemek Odası'
              : 'Lüks Yatak Odası';

            return (
              <Link
                key={room.id}
                href={`/katalog/${room.slug}`}
                className={`${styles.card} ${isLead ? styles.cardLead : ''}`}
                aria-label={`${displayName} — Fotoğrafları ve Detayları Gör`}
              >
                {/* Image Container with Ultra-HD resolution */}
                <div className={styles.imageWrap}>
                  <Image
                    {...imageProps(primaryPhoto, 1600)}
                    alt={`${displayName} - ALDi Mobilya Özel Üretim`}
                    fill
                    priority={idx < 2}
                    sizes={isLead ? '(max-width: 1024px) 100vw, 66vw' : '(max-width: 680px) 100vw, (max-width: 1024px) 50vw, 33vw'}
                    className={styles.image}
                  />

                  {/* Badges */}
                  <div className={styles.badgeRow}>
                    <span className={styles.newBadge}>Yeni Model</span>
                    {totalPhotos > 0 && (
                      <span className={styles.photoCount}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                          <circle cx="9" cy="9" r="2"/>
                          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                        </svg>
                        {totalPhotos} Fotoğraf
                      </span>
                    )}
                  </div>

                  <div className={styles.overlayGradient} aria-hidden="true" />
                </div>

                {/* Typography & Card Content */}
                <div className={styles.cardContent}>
                  <span className={styles.categoryPill}>{categoryName}</span>
                  <h3 className={styles.roomName}>{displayName}</h3>
                  {room.descTr && (
                    <p className={styles.cardDesc}>{room.descTr}</p>
                  )}

                  <div className={styles.cardFooter}>
                    <span className={styles.exploreLink}>
                      Fotoğraf Galerisini İncele
                      <svg className={styles.arrowIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* View Entire Catalogue Action */}
        <div className={styles.actionsBottom}>
          <Link href="/katalog" className={styles.viewAllBtn}>
            Tüm Koleksiyonu ve Fotoğrafları Gör ({rooms.length}+ Model)
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
