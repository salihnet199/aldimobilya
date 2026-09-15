import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Room, RoomImage } from '@aldimobilya/types';
import styles from './page.module.css';

interface Props {
  params: Promise<{ slug: string }>;
}

// TODO: Replace with real DB call
async function getRoom(slug: string): Promise<Room | null> {
  if (!slug) return null;
  return null; // Will return Room object when catalog is populated
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const room = await getRoom(slug);
  if (!room) return { title: 'Model Bulunamadı' };
  return {
    title: room.nameTr,
    description: room.descTr ?? `ALDi Mobilya ${room.nameTr} yatak odası modeli.`,
  };
}

export default async function RoomDetailPage({ params }: Props) {
  const { slug } = await params;
  const room = await getRoom(slug);

  if (!room) notFound();

  const r: Room = room;

  return (
    <div className={styles.page}>
      {/* Breadcrumb */}
      <div className={`container ${styles.breadcrumb}`}>
        <Link href="/">Ana Sayfa</Link>
        <span aria-hidden="true">›</span>
        <Link href="/katalog">Yatak Odaları</Link>
        <span aria-hidden="true">›</span>
        <span>{r.nameTr}</span>
      </div>

      <div className="container section">
        <div className={styles.grid}>
          {/* Gallery */}
          <div className={styles.gallery}>
            {/* Main Image */}
            <div className={styles.mainImage}>
              <Image
                src={r.heroImage}
                alt={r.nameTr}
                width={800}
                height={600}
                priority
                unoptimized
              />
            </div>
            {/* Thumbnails */}
            {r.images?.length > 0 && (
              <div className={styles.thumbs}>
                {r.images.map((img: RoomImage, i: number) => (
                  <div key={img.id} className={styles.thumb}>
                    <Image
                      src={img.url}
                      alt={img.alt ?? `${r.nameTr} ${i + 1}`}
                      width={160}
                      height={120}
                      unoptimized
                    />
                  </div>
                ))}
              </div>
            )}
            {/* Video */}
            {r.video && (
              <div className={styles.videoWrap}>
                <video
                  src={r.video}
                  controls
                  playsInline
                  preload="metadata"
                  aria-label={`${r.nameTr} tanıtım videosu`}
                />
              </div>
            )}
          </div>

          {/* Info */}
          <div className={styles.info}>
            {r.category && (
              <span className="badge badge-gold">{r.category}</span>
            )}
            <h1 className="display-md" style={{ marginTop: 'var(--space-4)', marginBottom: 'var(--space-3)' }}>
              {r.nameTr}
            </h1>
            <div className="gold-line" />

            {r.descTr && (
              <p className="body-lg text-muted" style={{ marginBottom: 'var(--space-8)' }}>
                {r.descTr}
              </p>
            )}

            {/* Specs */}
            {r.specs && Object.keys(r.specs).length > 0 && (
              <div className={styles.specs}>
                <p className="caption text-gold" style={{ marginBottom: 'var(--space-4)' }}>
                  Teknik Özellikler
                </p>
                <div className={styles.specsGrid}>
                  {r.specs.material && (
                    <div className={styles.specItem}>
                      <span className={styles.specLabel}>Malzeme</span>
                      <span className={styles.specValue}>{r.specs.material}</span>
                    </div>
                  )}
                  {r.specs.dimensions && (
                    <div className={styles.specItem}>
                      <span className={styles.specLabel}>Boyut</span>
                      <span className={styles.specValue}>{r.specs.dimensions}</span>
                    </div>
                  )}
                  {r.specs.style && (
                    <div className={styles.specItem}>
                      <span className={styles.specLabel}>Stil</span>
                      <span className={styles.specValue}>{r.specs.style}</span>
                    </div>
                  )}
                  {r.specs.colors && r.specs.colors.length > 0 && (
                    <div className={styles.specItem}>
                      <span className={styles.specLabel}>Renkler</span>
                      <span className={styles.specValue}>{r.specs.colors.join(', ')}</span>
                    </div>
                  )}
                  {r.specs.warranty && (
                    <div className={styles.specItem}>
                      <span className={styles.specLabel}>Garanti</span>
                      <span className={styles.specValue}>{r.specs.warranty}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CTA */}
            <div className={styles.cta}>
              <a
                href={`https://wa.me/905000000000?text=${encodeURIComponent(`Merhaba, "${r.nameTr}" modeli hakkında bilgi almak istiyorum.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-whatsapp"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Bu Model Hakkında Bilgi Al
              </a>
              <p className={styles.ctaNote}>Ücretsiz danışmanlık • Hızlı yanıt</p>
            </div>

            {/* Back */}
            <Link href="/katalog" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: 'var(--space-4)' }}>
              ← Koleksiyona Dön
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
