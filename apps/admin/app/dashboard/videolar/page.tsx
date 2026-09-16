'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import styles from './page.module.css';

interface VideoItem {
  id: string;
  title: string;
  url: string;
  thumbnail: string | null;
  isPublic: boolean;
  createdAt: string;
}

async function uploadDirect(file: File, folder: string): Promise<string> {
  // Direct Cloudinary Upload via signature to bypass 4.5MB limit
  const signRes = await fetch(`/api/upload/sign?folder=${encodeURIComponent(folder)}`);
  if (signRes.ok) {
    const { signature, timestamp, apiKey, cloudName } = await signRes.json();
    const fd = new FormData();
    fd.append('file', file);
    fd.append('api_key', apiKey);
    fd.append('timestamp', String(timestamp));
    fd.append('signature', signature);
    fd.append('folder', folder);

    const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
      method: 'POST',
      body: fd,
    });
    const cloudData = await cloudRes.json();
    if (cloudRes.ok && cloudData.secure_url) {
      return cloudData.secure_url;
    }
  }

  // Fallback to internal route
  const fd = new FormData();
  fd.append('file', file);
  fd.append('folder', folder);
  const res = await fetch('/api/upload', { method: 'POST', body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Yükleme başarısız oldu.');
  return data.url;
}

export default function VideolarPage() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const videoFileRef = useRef<HTMLInputElement>(null);
  const thumbFileRef = useRef<HTMLInputElement>(null);

  async function fetchVideos() {
    try {
      setLoading(true);
      const res = await fetch('/api/videos');
      const data = await res.json();
      if (res.ok && data.videos) {
        setVideos(data.videos);
      }
    } catch (err) {
      console.error('Videolar alınamadı:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/videos');
        const data = await res.json();
        if (!cancelled && res.ok && data.videos) {
          setVideos(data.videos);
        }
      } catch (err) {
        console.error('Videolar alınamadı:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleVideoFileUpload(files: FileList | null) {
    if (!files?.length) return;
    const file = files[0];
    setUploadingVideo(true);
    setError('');
    setSuccess('');
    try {
      const uploadedUrl = await uploadDirect(file, 'aldimobilya/videos');
      setUrl(uploadedUrl);
      if (!title) {
        // Dosya adından başlık türet
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setTitle(cleanName);
      }
      setSuccess('Video başarıyla yüklendi!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Video yüklenemedi.';
      setError(msg);
    } finally {
      setUploadingVideo(false);
      if (videoFileRef.current) videoFileRef.current.value = '';
    }
  }

  async function handleThumbFileUpload(files: FileList | null) {
    if (!files?.length) return;
    const file = files[0];
    setUploadingThumb(true);
    setError('');
    try {
      const uploadedUrl = await uploadDirect(file, 'aldimobilya/videos/thumbnails');
      setThumbnail(uploadedUrl);
      setSuccess('Küçük resim yüklendi!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Resim yüklenemedi.';
      setError(msg);
    } finally {
      setUploadingThumb(false);
      if (thumbFileRef.current) thumbFileRef.current.value = '';
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!title.trim()) {
      setError('Lütfen video başlığını giriniz.');
      return;
    }
    if (!url.trim()) {
      setError('Lütfen bir video dosyası yükleyin veya bağlantı (URL) girin.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          url: url.trim(),
          thumbnail: thumbnail.trim() || null,
          isPublic: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Video kaydedilemedi.');
        return;
      }

      setSuccess('Video başarıyla eklendi!');
      setTitle('');
      setUrl('');
      setThumbnail('');
      fetchVideos();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Bağlantı hatası.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu videoyu silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/api/videos/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setVideos((prev) => prev.filter((v) => v.id !== id));
      }
    } catch {
      alert('Video silinirken hata oluştu.');
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Videolar</h1>
          <p className={styles.subtitle}>{videos.length} adet video kayıtlı</p>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8, color: '#f87171' }}>
          ✕ {error}
        </div>
      )}

      {success && (
        <div style={{ padding: '12px 16px', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: 8, color: '#4ade80' }}>
          ✓ {success}
        </div>
      )}

      {/* Video Yükleme Formu */}
      <div className="admin-card">
        <h2 className={styles.sectionLabel}>Yeni Video Ekle</h2>
        <form onSubmit={handleSubmit} className={styles.fields}>
          <div className="field-group">
            <label className="admin-label">Video Başlığı *</label>
            <input
              className="admin-input"
              type="text"
              placeholder="ör. Elegance Koleksiyon Tanıtımı"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="field-group">
            <label className="admin-label">Video Dosyası Yükle (Doğrudan Yükleme)</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                type="button"
                className="admin-btn"
                style={{ background: '#334155', color: '#fff', padding: '9px 16px', borderRadius: 8, cursor: 'pointer' }}
                onClick={() => videoFileRef.current?.click()}
                disabled={uploadingVideo}
              >
                {uploadingVideo ? 'Video Yükleniyor...' : '📁 Bilgisayardan Video Seç'}
              </button>
              <input
                ref={videoFileRef}
                type="file"
                accept="video/*"
                style={{ display: 'none' }}
                onChange={(e) => handleVideoFileUpload(e.target.files)}
              />
              <span style={{ fontSize: 13, color: '#94a3b8' }}>MP4, MOV, WebM formatları</span>
            </div>
          </div>

          <div className="field-group">
            <label className="admin-label">Veya Video URL (YouTube / Cloudinary)</label>
            <input
              className="admin-input"
              type="url"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>

          <div className="field-group">
            <label className="admin-label">Küçük Resim (Thumbnail - Opsiyonel)</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
              <button
                type="button"
                className="admin-btn"
                style={{ background: '#1e293b', color: '#cbd5e1', padding: '8px 14px', borderRadius: 8, cursor: 'pointer' }}
                onClick={() => thumbFileRef.current?.click()}
                disabled={uploadingThumb}
              >
                {uploadingThumb ? 'Yükleniyor...' : 'Kapak Resmi Seç'}
              </button>
              <input
                ref={thumbFileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => handleThumbFileUpload(e.target.files)}
              />
            </div>
            <input
              className="admin-input"
              type="url"
              placeholder="https://... (veya yukarıdan görsel seçin)"
              value={thumbnail}
              onChange={(e) => setThumbnail(e.target.value)}
            />
          </div>

          <div className={styles.actions}>
            <button
              className="admin-btn admin-btn-primary"
              type="submit"
              disabled={saving || uploadingVideo || uploadingThumb}
            >
              {saving ? 'Kaydediliyor...' : 'Videoyu Kaydet'}
            </button>
          </div>
        </form>
      </div>

      {/* Kayıtlı Videolar Listesi */}
      <div className={styles.tableWrap}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Önizleme</th>
              <th>Başlık</th>
              <th>Bağlantı</th>
              <th style={{ textAlign: 'right' }}>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                  Videolar yükleniyor...
                </td>
              </tr>
            ) : videos.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <div className={styles.emptyState}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8">
                      <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                    </svg>
                    <p>Henüz kayıtlı video bulunmuyor.</p>
                  </div>
                </td>
              </tr>
            ) : (
              videos.map((vid) => (
                <tr key={vid.id}>
                  <td>
                    {vid.thumbnail ? (
                      <Image
                        src={vid.thumbnail}
                        alt={vid.title}
                        width={72}
                        height={48}
                        unoptimized
                        className={styles.videoThumb}
                      />
                    ) : (
                      <div className={styles.videoThumb} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                        ▶
                      </div>
                    )}
                  </td>
                  <td style={{ fontWeight: 600 }}>{vid.title}</td>
                  <td>
                    <a
                      href={vid.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#c5a880', fontSize: 13, textDecoration: 'underline' }}
                    >
                      İzle / Bağlantı
                    </a>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => handleDelete(vid.id)}
                      className="admin-btn"
                      style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', padding: '6px 12px', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
