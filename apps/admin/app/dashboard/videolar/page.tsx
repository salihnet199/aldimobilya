import type { Metadata } from 'next';
import styles from './page.module.css';

export const metadata: Metadata = { title: 'Videolar' };

async function getVideos() {
  return [];
}

export default async function VideolarPage() {
  const videos = await getVideos();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Videolar</h1>
          <p className={styles.subtitle}>{videos.length} video kayıtlı</p>
        </div>
        <button className="admin-btn admin-btn-primary">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Video Ekle
        </button>
      </div>

      {/* Upload Zone */}
      <div className="admin-card">
        <h2 className={styles.sectionLabel}>Yeni Video Yükle</h2>
        <div className={styles.fields}>
          <div className="field-group">
            <label className="admin-label">Video Başlığı *</label>
            <input className="admin-input" type="text" placeholder="ör. Elegance Koleksiyon Tanıtımı" />
          </div>
          <div className="field-group">
            <label className="admin-label">Video URL (Cloudinary / YouTube / mp4)</label>
            <input className="admin-input" type="url" placeholder="https://..." />
          </div>
          <div className="field-group">
            <label className="admin-label">Küçük Resim (Thumbnail) URL</label>
            <input className="admin-input" type="url" placeholder="https://... (opsiyonel)" />
          </div>
          <div className={styles.actions}>
            <button className="admin-btn admin-btn-primary" type="button">
              Videoyu Kaydet
            </button>
          </div>
        </div>
      </div>

      {/* Video List */}
      <div className={styles.tableWrap}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Thumbnail</th>
              <th>Başlık</th>
              <th>Durum</th>
              <th style={{ textAlign: 'right' }}>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {videos.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <div className={styles.emptyState}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                    </svg>
                    <p>Henüz video eklenmemiş.</p>
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
