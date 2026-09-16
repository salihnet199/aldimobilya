import type { Metadata } from 'next';
import { prisma } from '@aldimobilya/db';
import MediaPlayer from '@/components/MediaPlayer';
import { getSiteSettings, getInstagramHref } from '@/lib/site-settings';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Medya & Videolar',
  description: 'ALDi Mobilya tanıtım videoları ve görsel galeri.',
};

// Videos are managed from the admin panel, so the public page must reflect
// changes immediately instead of serving a cached snapshot.
export const dynamic = 'force-dynamic';

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

export default async function MedyaPage() {
  const [videos, settings] = await Promise.all([getPublicVideos(), getSiteSettings()]);
  const instagramHref = getInstagramHref(settings.instagram);

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
          <ul className={styles.grid}>
            {videos.map((video) => (
              <li key={video.id} className={styles.card}>
                <MediaPlayer
                  url={video.url}
                  title={video.title}
                  thumbnail={video.thumbnail}
                />
                <h2 className={styles.videoTitle}>{video.title}</h2>
              </li>
            ))}
          </ul>
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
