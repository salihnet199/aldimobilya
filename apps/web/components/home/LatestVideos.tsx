import Link from 'next/link';
import { prisma } from '@aldimobilya/db';
import MediaPlayer from '@/components/MediaPlayer';
import styles from './LatestVideos.module.css';

async function getLatestVideos() {
  try {
    return await prisma.video.findMany({
      where: { isPublic: true },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });
  } catch (err) {
    console.error('getLatestVideos error:', err);
    return [];
  }
}

export default async function LatestVideos() {
  const videos = await getLatestVideos();
  if (videos.length === 0) return null;

  return (
    <section className={`section ${styles.section}`} aria-labelledby="videos-heading">
      <div className="container">
        {/* Header */}
        <div className="section-header">
          <span className="section-eyebrow">Video Galeri</span>
          <h2 id="videos-heading" className="display-md">
            Koleksiyonu Hareket Halinde İzleyin
          </h2>
          <div className="gold-line gold-line-center" />
          <p className="body-lg text-muted" style={{ maxWidth: 520, margin: '0 auto' }}>
            Atölyemizden ve yeni koleksiyonlarımızdan kısa videolar.
          </p>
        </div>

        {/* Videos */}
        <ul className={styles.grid}>
          {videos.map((video) => (
            <li key={video.id} className={styles.card}>
              <MediaPlayer url={video.url} title={video.title} thumbnail={video.thumbnail} />
              <h3 className={styles.title}>{video.title}</h3>
            </li>
          ))}
        </ul>

        {/* View All */}
        <div className={styles.viewAll}>
          <Link href="/medya" className="btn btn-outline">
            Tüm Videoları Gör
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
