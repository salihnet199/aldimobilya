import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { prisma, type Room, type RoomImage } from '@aldimobilya/db';
import { auth } from '@/auth';
import { can, normalizeRole } from '@/lib/roles';
import { publicRoomHref } from '@/lib/public-site';
import styles from './page.module.css';
import DeleteRoomBtn from '@/components/DeleteRoomBtn';

type RoomWithCover = Room & { images: RoomImage[] };

export const metadata: Metadata = { title: 'Oda Modelleri' };
export const dynamic = 'force-dynamic';

export default async function OdalarPage() {
  const [rooms, session] = await Promise.all([
    prisma.room.findMany({
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      include: { images: { orderBy: { order: 'asc' }, take: 1 } },
    }),
    auth(),
  ]);

  // UI hint only — the API re-checks `rooms:delete` against the live DB role.
  const canDelete = can(normalizeRole(session?.user?.role), 'rooms:delete');

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
            // Turkish name is the canonical display name; English is the fallback.
            const displayName = room.nameTr || room.nameEn || room.slug;
            return (
              <div key={room.id} className={styles.card}>
                <div className={styles.cardImg}>
                  {cover ? (
                    <Image
                      src={cover}
                      alt={displayName}
                      fill
                      sizes="(max-width: 640px) 100vw, 260px"
                      unoptimized
                      style={{ objectFit: 'cover' }}
                    />
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
                  <p className={styles.cardName}>{displayName}</p>
                  {room.category && <span className={styles.cardCat}>{room.category}</span>}
                  <div className={styles.cardActions}>
                    <Link href={`/dashboard/odalar/${room.slug}/duzenle`} className="admin-btn admin-btn-ghost" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                      Düzenle / Edit
                    </Link>
                    {room.isVisible ? (
                      <a
                        href={publicRoomHref(room.slug)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.viewLink}
                      >
                        Sitede Gör
                      </a>
                    ) : (
                      <span className={styles.hiddenNote}>Yayında değil</span>
                    )}
                    {canDelete ? (
                      <DeleteRoomBtn slug={room.slug} name={displayName} />
                    ) : (
                      <span className={styles.lockedNote}>Silme: yönetici yetkisi</span>
                    )}
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
