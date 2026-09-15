import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { prisma, type Room, type RoomImage } from '@aldimobilya/db';
import styles from './page.module.css';
import DeleteRoomBtn from './DeleteRoomBtn';

type RoomWithCover = Room & { images: RoomImage[] };

export const metadata: Metadata = { title: 'Oda Modelleri' };
export const dynamic = 'force-dynamic';

export default async function OdalarPage() {
  const rooms = await prisma.room.findMany({
    orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    include: { images: { orderBy: { order: 'asc' }, take: 1 } },
  });

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Oda Modelleri</h1>
          <p className={styles.subtitle}>{rooms.length} model kayıtlı</p>
        </div>
        <Link href="/dashboard/odalar/yeni" className="admin-btn admin-btn-primary">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Yeni Model Ekle
        </Link>
      </div>

      {rooms.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>Henüz model eklenmedi</p>
          <p className={styles.emptyDesc}>İlk yatak odası modelinizi ekleyin.</p>
          <Link href="/dashboard/odalar/yeni" className="admin-btn admin-btn-primary">Şimdi Ekle</Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {rooms.map((room: RoomWithCover) => {
            const cover = room.images[0]?.url ?? room.heroImage;
            return (
              <div key={room.id} className={styles.card}>
                <div className={styles.cardImg}>
                  {cover ? (
                    <Image src={cover} alt={room.nameTr} fill sizes="260px" style={{ objectFit: 'cover' }} />
                  ) : (
                    <div className={styles.noImg}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                      </svg>
                    </div>
                  )}
                  {room.isFeatured && <span className={styles.featuredBadge}>Öne Çıkan</span>}
                  {!room.isVisible && <span className={styles.hiddenBadge}>Gizli</span>}
                </div>
                <div className={styles.cardBody}>
                  <p className={styles.cardName}>{room.nameTr}</p>
                  {room.category && <span className={styles.cardCat}>{room.category}</span>}
                  <div className={styles.cardActions}>
                    <Link href={`/dashboard/odalar/${room.slug}/duzenle`} className="admin-btn admin-btn-ghost" style={{ fontSize: '0.8rem', padding: '5px 10px' }}>
                      Düzenle
                    </Link>
                    <DeleteRoomBtn slug={room.slug} name={room.nameTr} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
