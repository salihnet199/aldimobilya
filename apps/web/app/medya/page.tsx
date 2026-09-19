import type { Metadata } from 'next';
import { prisma } from '@aldimobilya/db';
import MediaPlayer from '@/components/MediaPlayer';
import { getSiteSettings, getInstagramHref } from '@/lib/site-settings';
import { pageMetadata } from '@/lib/seo';
import styles from './page.module.css';

export const metadata: Metadata = pageMetadata(
  'Medya & Videolar',
  'ALDi Mobilya tanıtım videoları ve görsel galeri.',
  '/medya',
);

// Videos are published from the admin panel. A short ISR window keeps the page
// fast and still reflects a publish within 5 minutes.
export const revalidate = 0;

async function getPublicVideos() {
  try {
    return await prisma.video.findMany({
      where: { isPublic: true },
      orderBy: { createdAt: 'desc' },
    });
  } catch (err) {
    console.error('getPublicVideos error:', err);
    return [];
  }
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export default async function MedyaPage() {
  const [videos, settings] = await Promise.all([getPublicVideos(), getSiteSettings()]);
  const instagramHref = getInstagramHref(settings.instagram);

  const [feature, ...rest] = videos;

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div className="container">
          <span className="section-eyebrow">Galeri</span>
          <h1 className="display-lg">Medya & Videolar</h1>
          <div className="gold-line" />
          <p className="body-lg text-muted" style={{ maxWidth: 480 }}>
            Koleksiyonlarımızı video ve fotoğraf galerimizden keşfedin.
          </p>
        </div>
      </div>

      <div className="container section">
        {videos.length > 0 ? (
          <>
            {/* Featured — the newest publish gets editorial presence. */}
            {feature && (
              <div className={styles.feature}>
                <MediaPlayer
                  url={feature.url}
                  title={feature.title}
                  thumbnail={feature.thumbnail}
                />
                <div className={styles.featureMeta}>
                  <span className={styles.date}>{formatDate(feature.createdAt)}</span>
                  <h2 className={styles.featureTitle}>{feature.title}</h2>
                </div>
              </div>
            )}

            {/* Rest of the showcase. */}
            {rest.length > 0 && (
              <ul className={styles.grid}>
                {rest.map((video) => (
                  <li key={video.id} className={styles.card}>
                    <MediaPlayer
                      url={video.url}
                      title={video.title}
                      thumbnail={video.thumbnail}
                    />
                    <div className={styles.cardMeta}>
                      <span className={styles.date}>{formatDate(video.createdAt)}</span>
                      <h2 className={styles.videoTitle}>{video.title}</h2>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            </div>
            <h2 className="heading-lg" style={{ marginBottom: 'var(--space-3)' }}>
              Videolar Yakında
            </h2>
            <p className="body-md text-muted" style={{ maxWidth: 400, margin: '0 auto var(--space-8)' }}>
              Tanıtım videolarımız çok yakında burada yayınlanacak.
            </p>
            <a
              href={instagramHref ?? '/iletisim'}
              {...(instagramHref ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className="btn btn-outline"
            >
              {instagramHref ? 'Instagram Videolarımızı İzle' : 'Bize Ulaşın'}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

