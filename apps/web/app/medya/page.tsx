import type { Metadata } from 'next';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Medya & Videolar',
  description: 'ALDi Mobilya tanıtım videoları ve görsel galeri.',
};

interface MediaItem {
  id: string;
  title: string;
  url: string;
  thumbnail?: string;
}

// TODO: fetch from API
async function getVideos(): Promise<MediaItem[]> {
  return [];
}

export default async function MedyaPage() {
  const videos = await getVideos();

  return (
    <div style={{ paddingTop: 80 }}>
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
          <div className={styles.grid}>
            {videos.map((video) => (
              <div key={video.id} className={styles.videoCard}>
                <div className={styles.videoThumb}>
                  {video.thumbnail ? (
                    <img src={video.thumbnail} alt={video.title} loading="lazy" />
                  ) : (
                    <div className={styles.videoPlaceholder}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  )}
                  <div className={styles.playOverlay}>
                    <div className={styles.playBtn}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  </div>
                </div>
                <p className={styles.videoTitle}>{video.title}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8">
                <polygon points="23 7 16 12 23 17 23 7"/>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
              </svg>
            </div>
            <h2 className="heading-lg" style={{ marginBottom: 'var(--space-3)' }}>
              Videolar Yakında
            </h2>
            <p className="body-md text-muted" style={{ maxWidth: 400, margin: '0 auto var(--space-8)' }}>
              Tanıtım videolarımız çok yakında burada yayınlanacak.
            </p>
            <a
              href="https://www.instagram.com/aldimobilya/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
            >
              Instagram&apos;da Videolarımızı İzle
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
