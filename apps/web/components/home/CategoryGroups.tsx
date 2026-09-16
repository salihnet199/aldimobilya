import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@aldimobilya/db';
import { imageProps } from '@/lib/media';
import styles from './CategoryGroups.module.css';

interface CategoryGroup {
  name: string;
  image: string | null;
  count: number;
}

/**
 * Groups the visible catalogue by the real `Room.category` values stored in the
 * database. No categories are invented here — when the catalogue has none the
 * whole section stays out of the page.
 */
async function getCategoryGroups(): Promise<CategoryGroup[]> {
  try {
    const rooms = await prisma.room.findMany({
      where: { isVisible: true, category: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: {
        category: true,
        heroImage: true,
        images: { orderBy: { order: 'asc' }, take: 1, select: { url: true } },
      },
    });

    const groups = new Map<string, CategoryGroup>();
    for (const room of rooms) {
      const name = room.category?.trim();
      if (!name) continue;

      const image = room.images[0]?.url ?? room.heroImage;
      const existing = groups.get(name);
      if (existing) {
        existing.count += 1;
        if (!existing.image) existing.image = image;
      } else {
        groups.set(name, { name, image, count: 1 });
      }
    }

    return [...groups.values()].sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name, 'tr'),
    );
  } catch (err) {
    console.error('getCategoryGroups error:', err);
    return [];
  }
}

export default async function CategoryGroups() {
  const groups = await getCategoryGroups();
  if (groups.length === 0) return null;

  return (
    <section className={`section ${styles.section}`} aria-labelledby="categories-heading">
      <div className="container">
        {/* Header */}
        <div className="section-header">
          <span className="section-eyebrow">Koleksiyon Grupları</span>
          <h2 id="categories-heading" className="display-md">
            Kategorilere Göz Atın
          </h2>
          <div className="gold-line gold-line-center" />
          <p className="body-lg text-muted" style={{ maxWidth: 520, margin: '0 auto' }}>
            Tüm modellerimiz kendi koleksiyon grubunda. Size en yakın tarzı keşfedin.
          </p>
        </div>

        {/* Groups */}
        <ul className={styles.grid}>
          {groups.map((group) => (
            <li key={group.name}>
              <Link
                href={`/katalog?kategori=${encodeURIComponent(group.name)}`}
                className={styles.card}
                aria-label={`${group.name} kategorisindeki modelleri gör`}
              >
                <div className={styles.media}>
                  {group.image ? (
                    <Image
                      {...imageProps(group.image)}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 50vw, 25vw"
                      style={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <span className={styles.mediaFallback} aria-hidden="true" />
                  )}
                </div>
                <div className={styles.meta}>
                  <span className={styles.name}>{group.name}</span>
                  <span className={styles.count}>{group.count} model</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
