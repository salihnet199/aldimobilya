import Link from 'next/link';
import { prisma } from '@aldimobilya/db';
import ScrollReveal from '@/components/ui/ScrollReveal';
import MasterpieceCard from './MasterpieceCard';
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
        <ScrollReveal className={styles.header}>
          <div className={styles.eyebrow}>Özel Koleksiyon & Yeni Tasarımlar</div>
          <h2 id="latest-masterpieces-heading" className={styles.title}>
            En Son Eklenen <span className={styles.titleGold}>Şaheserler</span>
          </h2>
          <div className="gold-line gold-line-center" style={{ margin: '16px auto 20px' }} />
          <p className={styles.subtitle}>
            İnegöl zanaatkarlarımızın el işçiliğiyle ürettiği en yeni yatak odası ve yemek odası tasarımları.
            Her model özgün, her açı büyüleyici.
          </p>
        </ScrollReveal>

        {/* High-Definition Photography Showcase Grid */}
        <div className={styles.grid}>
          {rooms.map((room, idx) => (
            <ScrollReveal key={room.id} staggerIndex={(idx % 6) + 1}>
              <MasterpieceCard
                room={room}
                idx={idx}
                isLead={idx === 0}
              />
            </ScrollReveal>
          ))}
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
