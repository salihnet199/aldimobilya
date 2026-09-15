import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@aldimobilya/db';
import styles from './page.module.css';

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamic = 'force-dynamic';

async function getRoom(slug: string) {
  if (!slug) return null;
  try {
    const room = await prisma.room.findUnique({
      where: { slug },
      include: { images: { orderBy: { order: 'asc' } } },
    });
    return room;
  } catch (err) {
    console.error('getRoom error:', err);
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const room = await getRoom(slug);
  if (!room) return { title: 'Model Not Found | ALDi Mobilya' };
  const displayName = room.nameEn || room.nameTr;
  return {
    title: `${displayName} | ALDi Mobilya`,
    description: room.descEn || room.descTr || `ALDi Mobilya ${displayName} luxury bedroom design.`,
  };
}

export default async function RoomDetailPage({ params }: Props) {
  const { slug } = await params;
  const room = await getRoom(slug);

  if (!room) notFound();

  const displayName = room.nameEn || room.nameTr;
  const displayDesc = room.descEn || room.descTr;
  const displayHero = room.heroImage || room.images[0]?.url;

  // Cast or inspect specs
  const specs = (room.specs as Record<string, any>) || {};

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <div className={`container ${styles.breadcrumb}`}>
        <Link href="/">Home / Ana Sayfa</Link>
        <span aria-hidden="true">›</span>
        <Link href="/katalog">Collection / Yatak Odaları</Link>
        <span aria-hidden="true">›</span>
        <span>{displayName}</span>
      </div>

      <div className="container section">
        <div className={styles.grid}>
          {/* Gallery */}
          <div className={styles.gallery}>
            {/* Main Image */}
            <div className={styles.mainImage}>
              <Image
                src={displayHero}
                alt={displayName}
                width={900}
                height={650}
                priority
                unoptimized
                style={{ objectFit: 'cover' }}
              />
            </div>

            {/* Thumbnails */}
            {room.images?.length > 1 && (
              <div className={styles.thumbs}>
                {room.images.map((img, i: number) => (
                  <div key={img.id} className={styles.thumb}>
                    <Image
                      src={img.url}
                      alt={img.alt ?? `${displayName} - ${i + 1}`}
                      width={180}
                      height={130}
                      unoptimized
                      style={{ objectFit: 'cover' }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Video */}
            {room.video && (
              <div className={styles.videoWrap}>
                <video
                  src={room.video}
                  controls
                  playsInline
                  preload="metadata"
                  aria-label={`${displayName} video`}
                />
              </div>
            )}
          </div>

          {/* Info */}
          <div className={styles.info}>
            {room.category && (
              <span className="badge badge-gold">{room.category}</span>
            )}
            <h1 className="display-md" style={{ marginTop: 'var(--space-4)', marginBottom: 'var(--space-3)' }}>
              {displayName}
            </h1>
            <div className="gold-line" />

            {displayDesc && (
              <p className="body-lg text-muted" style={{ marginBottom: 'var(--space-8)' }}>
                {displayDesc}
              </p>
            )}

            {/* Specs */}
            {specs && Object.keys(specs).length > 0 && (
              <div className={styles.specs}>
                <p className="caption text-gold" style={{ marginBottom: 'var(--space-4)' }}>
                  Specifications / المواصفات
                </p>
                <div className={styles.specsGrid}>
                  {specs.material && (
                    <div className={styles.specItem}>
                      <span className={styles.specLabel}>Material / المواد</span>
                      <span className={styles.specValue}>{specs.material}</span>
                    </div>
                  )}
                  {specs.dimensions && (
                    <div className={styles.specItem}>
                      <span className={styles.specLabel}>Dimensions / المقاس</span>
                      <span className={styles.specValue}>{specs.dimensions}</span>
                    </div>
                  )}
                  {specs.style && (
                    <div className={styles.specItem}>
                      <span className={styles.specLabel}>Style / النمط</span>
                      <span className={styles.specValue}>{specs.style}</span>
                    </div>
                  )}
                  {specs.colors && (
                    <div className={styles.specItem}>
                      <span className={styles.specLabel}>Colors / الألوان</span>
                      <span className={styles.specValue}>{Array.isArray(specs.colors) ? specs.colors.join(', ') : specs.colors}</span>
                    </div>
                  )}
                  {specs.warranty && (
                    <div className={styles.specItem}>
                      <span className={styles.specLabel}>Warranty / الضمان</span>
                      <span className={styles.specValue}>{specs.warranty}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CTA */}
            <div className={styles.cta}>
              <a
                href={`https://wa.me/905000000000?text=${encodeURIComponent(`Hello, I would like to inquire about "${displayName}".`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-whatsapp"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Inquire via WhatsApp / استفسار عبر واتساب
              </a>
              <p className={styles.ctaNote}>Fast Response • Free Consultation</p>
            </div>

            {/* Back */}
            <Link href="/katalog" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: 'var(--space-4)' }}>
              ← Back to Collection / العودة للكتالوج
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
