import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@aldimobilya/db';
import type { RoomSpecs } from '@aldimobilya/types';
import MediaPlayer from '@/components/MediaPlayer';
import { getSiteSettings, getWhatsAppHref } from '@/lib/site-settings';
import { jsonLd, siteUrl } from '@/lib/seo';
import RoomGallery, { type GalleryImage } from './RoomGallery';
import styles from './page.module.css';

interface Props {
  params: Promise<{ slug: string }>;
}

export const revalidate = 300;

// Hidden rooms (isVisible = false) must never be reachable on the public site,
// so the visibility flag is part of the lookup rather than a post-filter.
async function getRoom(slug: string) {
  if (!slug) return null;
  try {
    const room = await prisma.room.findFirst({
      where: { slug, isVisible: true },
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
  if (!room) return { title: 'Model Bulunamadı | ALDi Mobilya' };
  const displayName = room.nameTr || room.nameEn || room.slug;
  return {
    title: `${displayName} | ALDi Mobilya`,
    description:
      room.descTr || room.descEn || `ALDi Mobilya ${displayName} lüks yatak odası tasarımı.`,
  };
}

export default async function RoomDetailPage({ params }: Props) {
  const { slug } = await params;
  const [room, settings] = await Promise.all([getRoom(slug), getSiteSettings()]);

  if (!room) notFound();

  const displayName = room.nameTr || room.nameEn || room.slug;
  const displayDesc = room.descTr || room.descEn;

  // Hero image first, then gallery images, de-duplicated by URL.
  const galleryImages: GalleryImage[] = [];
  const seenUrls = new Set<string>();
  const pushImage = (image: GalleryImage) => {
    if (!image.url || seenUrls.has(image.url)) return;
    seenUrls.add(image.url);
    galleryImages.push(image);
  };
  pushImage({ id: 'hero', url: room.heroImage, alt: displayName });
  room.images.forEach((img) => pushImage({ id: img.id, url: img.url, alt: img.alt }));

  const specs = (room.specs as RoomSpecs | null) ?? {};
  const whatsappHref = getWhatsAppHref(
    settings.whatsapp,
    `Merhaba, "${displayName}" modeli hakkında bilgi almak istiyorum.`,
  );

  // Product structured data so search engines can render rich results. Only
  // absolute https (or root-relative, resolved against the site origin) image
  // URLs are emitted — the JSON-LD helper escapes script delimiters.
  const productImages = galleryImages
    .map((img) => {
      try {
        return new URL(img.url, siteUrl).href;
      } catch {
        return null;
      }
    })
    .filter((url): url is string => !!url);

  const productLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: displayName,
    ...(displayDesc ? { description: displayDesc } : {}),
    url: `${siteUrl}/katalog/${room.slug}`,
    ...(productImages.length ? { image: productImages } : {}),
    brand: { '@type': 'Brand', name: 'ALDi Mobilya' },
    ...(room.category ? { category: room.category } : {}),
    offers: {
      '@type': 'Offer',
      availability: 'https://schema.org/InStock',
      priceCurrency: 'TRY',
      ...(settings.phone ? { telephone: settings.phone } : {}),
    },
  };

  return (
    <div className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(productLd) }} />

      {/* Breadcrumb */}
      <nav className={`container ${styles.breadcrumb}`} aria-label="Sayfa yolu">
        <Link href="/">Ana Sayfa</Link>
        <span aria-hidden="true">›</span>
        <Link href="/katalog">Yatak Odaları</Link>
        <span aria-hidden="true">›</span>
        <span>{displayName}</span>
      </nav>

      <div className="container section">
        <div className={styles.grid}>
          {/* Gallery */}
          <div className={styles.galleryCol}>
            <RoomGallery images={galleryImages} name={displayName} />

            {/* Video */}
            {room.video && (
              <div className={styles.videoWrap}>
                <MediaPlayer url={room.video} title={`${displayName} tanıtım videosu`} />
              </div>
            )}
          </div>

          {/* Info */}
          <div className={styles.info}>
            {room.category && <span className="badge badge-gold">{room.category}</span>}
            <h1
              className="display-md"
              style={{ marginTop: 'var(--space-4)', marginBottom: 'var(--space-3)' }}
            >
              {displayName}
            </h1>
            <div className="gold-line" />

            {displayDesc && (
              <p className="body-lg text-muted" style={{ marginBottom: 'var(--space-8)' }}>
                {displayDesc}
              </p>
            )}

            {/* Specs */}
            {Object.keys(specs).length > 0 && (
              <div className={styles.specs}>
                <p className="caption text-gold" style={{ marginBottom: 'var(--space-4)' }}>
                  Teknik Özellikler
                </p>
                <div className={styles.specsGrid}>
                  {specs.material && (
                    <div className={styles.specItem}>
                      <span className={styles.specLabel}>Malzeme</span>
                      <span className={styles.specValue}>{specs.material}</span>
                    </div>
                  )}
                  {specs.dimensions && (
                    <div className={styles.specItem}>
                      <span className={styles.specLabel}>Ölçüler</span>
                      <span className={styles.specValue}>{specs.dimensions}</span>
                    </div>
                  )}
                  {specs.style && (
                    <div className={styles.specItem}>
                      <span className={styles.specLabel}>Stil</span>
                      <span className={styles.specValue}>{specs.style}</span>
                    </div>
                  )}
                  {specs.colors && (
                    <div className={styles.specItem}>
                      <span className={styles.specLabel}>Renkler</span>
                      {Array.isArray(specs.colors) && specs.colors.length > 0 ? (
                        <div className={styles.colorChips}>
                          {specs.colors.map((color) => (
                            <span key={color} className={styles.colorChip}>
                              {color}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className={styles.specValue}>
                          {String(specs.colors)}
                        </span>
                      )}
                    </div>
                  )}
                  {specs.warranty && (
                    <div className={styles.specItem}>
                      <span className={styles.specLabel}>Garanti</span>
                      <span className={styles.specValue}>{specs.warranty}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CTA */}
            <div className={styles.cta}>
              <a
                href={whatsappHref}
                {...(whatsappHref.startsWith('http')
                  ? { target: '_blank', rel: 'noopener noreferrer' }
                  : {})}
                className="btn btn-whatsapp"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                WhatsApp ile Bilgi Al
              </a>
              <p className={styles.ctaNote}>Hızlı yanıt • Ücretsiz danışmanlık</p>
            </div>

            {/* Back */}
            <Link
              href="/katalog"
              className="btn btn-ghost"
              style={{ width: '100%', justifyContent: 'center', marginTop: 'var(--space-4)' }}
            >
              ← Koleksiyona Dön
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
