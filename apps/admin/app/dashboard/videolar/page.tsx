'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  formatBytes,
  isSafeMediaUrl,
  readErrorMessage,
  uploadMedia,
  validateImageFile,
  validateVideoFile,
} from '@/components/upload';
import { useAdminRole } from '@/components/useAdminRole';
import { publicVideoHref } from '@/lib/public-site';
import styles from './page.module.css';

interface VideoItem {
  id: string;
  title: string;
  url: string;
  thumbnail: string | null;
  isPublic: boolean;
  createdAt: string;
}

type VideoListResult =
  | { kind: 'ok'; videos: VideoItem[] }
  | { kind: 'error'; message: string };

async function fetchVideoList(): Promise<VideoListResult> {
  try {
    const res = await fetch('/api/videos');
    if (!res.ok) {
      return { kind: 'error', message: await readErrorMessage(res, 'Videolar yüklenemedi') };
    }
    const data = await res.json();
    return { kind: 'ok', videos: Array.isArray(data.videos) ? (data.videos as VideoItem[]) : [] };
  } catch (err) {
    return {
      kind: 'error',
      message: err instanceof Error ? `Bağlantı hatası: ${err.message}` : 'Videolar yüklenemedi.',
    };
  }
}

export default function VideolarPage() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Form states
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Presentation-only hint; the API re-checks `videos:delete` per request.
  const { role, loading: roleLoading } = useAdminRole();
  const canDelete = role === 'ADMIN';

  const videoFileRef = useRef<HTMLInputElement>(null);
  const thumbFileRef = useRef<HTMLInputElement>(null);

  const applyList = useCallback((result: VideoListResult) => {
    if (result.kind === 'ok') {
      setVideos(result.videos);
      setLoadError('');
    } else {
      setLoadError(result.message);
    }
    setLoading(false);
  }, []);

  const fetchVideos = useCallback(async () => {
    applyList(await fetchVideoList());
  }, [applyList]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const result = await fetchVideoList();
      if (!cancelled) applyList(result);
    })();

    return () => {
      cancelled = true;
    };
  }, [applyList]);

  function reload() {
    setLoadError('');
    setLoading(true);
    void fetchVideos();
  }

  async function handleVideoFileUpload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    setError('');
    setSuccess('');

    const rejection = validateVideoFile(file);
    if (rejection) {
      setError(rejection);
      if (videoFileRef.current) videoFileRef.current.value = '';
      return;
    }

    setUploadingVideo(true);
    try {
      const uploaded = await uploadMedia(file, 'aldimobilya/videos', 'video');
      setUrl(uploaded.url);
      if (!title) {
        // Derive a title from the file name.
        setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
      }
      setSuccess('Video yüklendi. Kaydetmeyi unutmayın.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Video yüklenemedi.');
    } finally {
      setUploadingVideo(false);
      if (videoFileRef.current) videoFileRef.current.value = '';
    }
  }

  async function handleThumbFileUpload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    setError('');
    setSuccess('');

    const rejection = validateImageFile(file);
    if (rejection) {
      setError(rejection);
      if (thumbFileRef.current) thumbFileRef.current.value = '';
      return;
    }

    setUploadingThumb(true);
    try {
      const uploaded = await uploadMedia(file, 'aldimobilya/videos/thumbnails', 'image');
      setThumbnail(uploaded.url);
      setSuccess('Küçük resim yüklendi.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Resim yüklenemedi.');
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

    const videoUrl = url.trim();
    if (!videoUrl) {
      setError('Lütfen bir video dosyası yükleyin veya bağlantı (URL) girin.');
      return;
    }
    if (!isSafeMediaUrl(videoUrl)) {
      setError('Video bağlantısı geçersiz. Yalnızca https:// adresleri veya / ile başlayan yollar kullanılabilir.');
      return;
    }

    const thumbUrl = thumbnail.trim();
    if (thumbUrl && !isSafeMediaUrl(thumbUrl)) {
      setError('Küçük resim bağlantısı geçersiz. Yalnızca https:// adresleri veya / ile başlayan yollar kullanılabilir.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          url: videoUrl,
          thumbnail: thumbUrl || null,
          isPublic: true,
        }),
      });

      if (!res.ok) {
        setError(await readErrorMessage(res, 'Video kaydedilemedi'));
        return;
      }

      setSuccess('Video eklendi.');
      setTitle('');
      setUrl('');
      setThumbnail('');
      await fetchVideos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bağlantı hatası oluştu.');
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePublic(video: VideoItem) {
    const next = !video.isPublic;
    setBusyId(video.id);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/videos/${encodeURIComponent(video.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: next }),
      });

      if (!res.ok) {
        setError(await readErrorMessage(res, 'Video durumu güncellenemedi'));
        return;
      }

      setVideos((prev) => prev.map((v) => (v.id === video.id ? { ...v, isPublic: next } : v)));
      setSuccess(next ? `"${video.title}" yayına alındı.` : `"${video.title}" yayından kaldırıldı.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bağlantı hatası oluştu.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(video: VideoItem) {
    if (!confirm(`"${video.title}" videosunu silmek istediğinize emin misiniz?`)) return;

    setBusyId(video.id);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/videos/${encodeURIComponent(video.id)}`, { method: 'DELETE' });
      if (!res.ok) {
        setError(await readErrorMessage(res, 'Video silinemedi'));
        return;
      }
      setVideos((prev) => prev.filter((v) => v.id !== video.id));
      setSuccess('Video silindi.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Video silinirken bağlantı hatası oluştu.');
    } finally {
      setBusyId(null);
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
        <div className={styles.errorBanner} role="alert">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      {success && (
        <div className={styles.successBanner} role="status">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M20 6 9 17l-5-5"/>
          </svg>
          {success}
        </div>
      )}

      {/* Upload form */}
      <div className="admin-card">
        <h2 className={styles.sectionLabel}>Yeni Video Ekle</h2>
        <form onSubmit={handleSubmit} className={styles.fields}>
          <div className="field-group">
            <label className="admin-label" htmlFor="video-title">Video Başlığı *</label>
            <input
              id="video-title"
              className="admin-input"
              type="text"
              placeholder="ör. Elegance Koleksiyon Tanıtımı"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
            />
          </div>

          <div className="field-group">
            <label className="admin-label" htmlFor="video-file">Video Dosyası Yükle</label>
            <div className={styles.inlineRow}>
              <button
                id="video-file"
                type="button"
                className="admin-btn admin-btn-ghost"
                onClick={() => videoFileRef.current?.click()}
                disabled={uploadingVideo}
              >
                {uploadingVideo ? 'Video Yükleniyor…' : 'Bilgisayardan Video Seç'}
              </button>
              <input
                ref={videoFileRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                className={styles.hiddenInput}
                onChange={(e) => handleVideoFileUpload(e.target.files)}
              />
              <span className={styles.hint}>
                MP4, MOV, WebM — maks. {formatBytes(MAX_VIDEO_BYTES)}
              </span>
            </div>
          </div>

          <div className="field-group">
            <label className="admin-label" htmlFor="video-url">Veya Güvenli Video Bağlantısı (YouTube / Cloudinary)</label>
            <input
              id="video-url"
              className="admin-input"
              type="url"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>

          <div className="field-group">
            <label className="admin-label" htmlFor="video-thumb">Küçük Resim (Thumbnail - Opsiyonel)</label>
            <div className={styles.inlineRow}>
              <button
                id="video-thumb"
                type="button"
                className="admin-btn admin-btn-ghost"
                onClick={() => thumbFileRef.current?.click()}
                disabled={uploadingThumb}
              >
                {uploadingThumb ? 'Yükleniyor…' : 'Kapak Resmi Seç'}
              </button>
              <input
                ref={thumbFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                className={styles.hiddenInput}
                onChange={(e) => handleThumbFileUpload(e.target.files)}
              />
              <span className={styles.hint}>JPG, PNG, WebP — maks. {formatBytes(MAX_IMAGE_BYTES)}</span>
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
              {saving ? 'Kaydediliyor…' : 'Videoyu Kaydet'}
            </button>
          </div>
        </form>
      </div>

      {/* Saved videos */}
      <div className={styles.tableWrap}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Önizleme</th>
              <th>Başlık</th>
              <th>Durum</th>
              <th>Sitede</th>
              <th style={{ textAlign: 'right' }}>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className={styles.stateCell}>
                  <span className={styles.spinner} aria-hidden="true" /> Videolar yükleniyor…
                </td>
              </tr>
            ) : loadError ? (
              <tr>
                <td colSpan={5} className={styles.stateCell}>
                  <p className={styles.loadError} role="alert">{loadError}</p>
                  <button type="button" className="admin-btn admin-btn-ghost" onClick={reload}>
                    Tekrar Dene
                  </button>
                </td>
              </tr>
            ) : videos.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className={styles.emptyState}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8" aria-hidden="true">
                      <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                    </svg>
                    <p>Henüz kayıtlı video bulunmuyor.</p>
                    <p className={styles.emptyHint}>Yukarıdaki formdan ilk videonuzu ekleyin.</p>
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
                      <div className={styles.videoThumbPlaceholder}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                          <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                        </svg>
                      </div>
                    )}
                  </td>
                  <td className={styles.videoTitle}>{vid.title}</td>
                  <td>
                    <span className={`admin-badge ${vid.isPublic ? 'admin-badge-green' : 'admin-badge-yellow'}`}>
                      {vid.isPublic ? 'Yayında' : 'Gizli'}
                    </span>
                  </td>
                  <td>
                    <div className={styles.linkCell}>
                      {vid.isPublic ? (
                        <a
                          href={publicVideoHref(vid.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.videoLink}
                        >
                          Sitede Gör
                        </a>
                      ) : (
                        <span className={styles.unpublishedNote}>Yayında değil</span>
                      )}
                      {isSafeMediaUrl(vid.url) && (
                        <a href={vid.url} target="_blank" rel="noreferrer" className={styles.mediaLink}>
                          Dosyayı Aç
                        </a>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        onClick={() => void handleTogglePublic(vid)}
                        disabled={busyId === vid.id}
                        className={styles.publishBtn}
                      >
                        {busyId === vid.id ? '…' : vid.isPublic ? 'Yayından Kaldır' : 'Yayınla'}
                      </button>
                      {canDelete ? (
                        <button
                          type="button"
                          onClick={() => void handleDelete(vid)}
                          disabled={busyId === vid.id}
                          className={styles.deleteBtn}
                        >
                          Sil
                        </button>
                      ) : (
                        <span className={styles.lockedNote}>
                          {roleLoading ? '…' : 'Silme: yönetici'}
                        </span>
                      )}
                    </div>
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
