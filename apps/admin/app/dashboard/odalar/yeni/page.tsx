'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import styles from './page.module.css';

interface UploadedImage {
  url: string;
  publicId: string;
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function uploadFileDirect(file: File, folder = 'aldimobilya/rooms'): Promise<{ url: string; publicId: string }> {
  // 1. First attempt: Direct client upload to Cloudinary (bypasses Vercel 4.5MB limit, supports large images & videos)
  try {
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
        return {
          url: cloudData.secure_url,
          publicId: cloudData.public_id || '',
        };
      }
    }
  } catch (err) {
    console.warn('Direct upload attempt failed, falling back to server route:', err);
  }

  // 2. Fallback: Internal Next.js API route
  const fd = new FormData();
  fd.append('file', file);
  fd.append('folder', folder);

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: fd,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `${file.name} yüklenemedi. (Hata kodu: ${res.status})`);
  }

  return {
    url: data.url,
    publicId: data.publicId || '',
  };
}

export default function YeniOdaPage() {
  const router = useRouter();

  // Model Bilgileri (Türkçe)
  const [nameTr, setNameTr]       = useState('');
  const [slug, setSlug]           = useState('');
  const [descTr, setDescTr]       = useState('');
  const [category, setCategory]   = useState('');
  const [video, setVideo]         = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [specs, setSpecs]         = useState({
    material: '',
    dimensions: '',
    style: '',
    warranty: '',
    colors: '',
  });

  // Medya durumları
  const [images, setImages]           = useState<UploadedImage[]>([]);
  const [uploading, setUploading]     = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoProgress, setVideoProgress]   = useState('');
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Model adından otomatik Türkçe SEO slug oluşturma
  function handleNameChange(v: string) {
    setNameTr(v);
    if (!slug || slug === slugify(nameTr)) {
      setSlug(slugify(v));
    }
  }

  // Toplu Fotoğraf Yükleme
  async function handleImageUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const uploaded: UploadedImage[] = [];
      const fileList = Array.from(files);

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        setUploadProgress(`Yükleniyor: ${i + 1} / ${fileList.length} (${file.name})`);

        const result = await uploadFileDirect(file, 'aldimobilya/rooms');
        uploaded.push(result);
      }

      setImages((prev) => [...prev, ...uploaded]);
      setSuccess(`${uploaded.length} adet görsel başarıyla yüklendi.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Görseller yüklenirken bir hata oluştu.';
      setError(msg);
    } finally {
      setUploading(false);
      setUploadProgress('');
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  }

  // Video Dosyası Yükleme
  async function handleVideoUpload(files: FileList | null) {
    if (!files?.length) return;
    const file = files[0];
    setUploadingVideo(true);
    setError('');
    setSuccess('');
    setVideoProgress(`Video yükleniyor: ${file.name}...`);

    try {
      const result = await uploadFileDirect(file, 'aldimobilya/videos');
      setVideo(result.url);
      setSuccess('Video başarıyla yüklendi!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Video yüklenirken bir hata oluştu.';
      setError(msg);
    } finally {
      setUploadingVideo(false);
      setVideoProgress('');
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  function setAsHero(idx: number) {
    if (idx === 0) return;
    setImages((prev) => {
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.unshift(item);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    const trimmedName = nameTr.trim();
    if (!trimmedName) {
      setError('Lütfen model adını giriniz.');
      return;
    }

    const finalSlug = slug.trim() || slugify(trimmedName);
    if (!finalSlug) {
      setError('Lütfen URL bağlantısını (slug) belirleyiniz.');
      return;
    }

    if (!images.length) {
      setError('Lütfen modele ait en az bir görsel yükleyiniz.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nameTr: trimmedName,
          nameEn: trimmedName, // DB uyumluluğu için Türkçe isim kopyalanır
          slug: finalSlug,
          descTr: descTr.trim() || null,
          descEn: descTr.trim() || null,
          category: category.trim() || null,
          heroImage: images[0].url,
          images: images.map((img) => ({ url: img.url, alt: trimmedName })),
          video: video.trim() || null,
          isVisible,
          isFeatured,
          specs: Object.values(specs).some(Boolean) ? specs : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Model kaydedilirken hata oluştu.');
        return;
      }

      setSuccess('Model başarıyla eklendi!');
      router.push('/dashboard/odalar');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Bağlantı hatası oluştu. Tekrar deneyiniz.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/dashboard/odalar" className={styles.backLink}>
          ← Odalar Listesine Dön
        </Link>
        <h1 className={styles.title}>Yeni Oda Modeli Ekle</h1>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      {success && (
        <div style={{ padding: '12px 16px', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: 8, color: '#4ade80', marginBottom: 20 }}>
          ✓ {success}
        </div>
      )}

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formGrid}>
          {/* ── Sol Kolon (Temel Bilgiler) ── */}
          <div className={styles.mainCol}>
            {/* Model Bilgileri */}
            <div className="admin-card">
              <h2 className={styles.sectionLabel}>Model Bilgileri</h2>
              <div className={styles.fields}>
                <div className="field-group">
                  <label className="admin-label">Model Adı *</label>
                  <input
                    className="admin-input"
                    value={nameTr}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="ör. Hürrem Sultan Yatak Odası"
                    required
                  />
                </div>

                <div className="field-group">
                  <label className="admin-label">Sayfa Bağlantısı (Slug) *</label>
                  <input
                    className="admin-input"
                    value={slug}
                    onChange={(e) => setSlug(slugify(e.target.value))}
                    placeholder="ör. hurrem-sultan-yatak-odasi"
                    required
                  />
                  <span className={styles.hint}>
                    Model adından otomatik üretilir • Sitedeki adres: /katalog/<strong>{slug || '...'}</strong>
                  </span>
                </div>

                <div className="field-group">
                  <label className="admin-label">Kategori</label>
                  <input
                    className="admin-input"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="ör. Klasik Yatak Odası, Modern, Avangard, Lüks"
                  />
                </div>

                <div className="field-group">
                  <label className="admin-label">Model Açıklaması</label>
                  <textarea
                    className="admin-textarea"
                    rows={4}
                    value={descTr}
                    onChange={(e) => setDescTr(e.target.value)}
                    placeholder="Koleksiyon hakkında detaylı bilgi, kumaş ve ahşap detayları..."
                  />
                </div>
              </div>
            </div>

            {/* Görseller */}
            <div className="admin-card">
              <h2 className={styles.sectionLabel}>Model Görselleri *</h2>
              <p className={styles.subtext}>
                İlk görsel otomatik olarak ana kapak görseli yapılır. Sürükleyip bırakabilir veya dosya seçebilirsiniz.
              </p>

              {/* Görsel Yükleme Alanı */}
              <div
                className={styles.uploadDropzone}
                onClick={() => imageInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleImageUpload(e.dataTransfer.files);
                }}
              >
                <input
                  ref={imageInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => handleImageUpload(e.target.files)}
                />
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <div style={{ marginTop: 10, fontWeight: 600, color: '#f1f5f9' }}>
                  {uploading ? uploadProgress : 'Görselleri seçmek için tıklayın veya buraya sürükleyin'}
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                  JPG, PNG, WebP formatları desteklenir • Çoklu seçim yapabilirsiniz
                </div>
              </div>

              {/* Yüklenen Fotoğrafların Önizleme Listesi */}
              {images.length > 0 && (
                <div className={styles.imageList}>
                  {images.map((img, idx) => (
                    <div key={idx} className={`${styles.imageCard} ${idx === 0 ? styles.heroCard : ''}`}>
                      <div className={styles.thumbWrapper}>
                        <Image
                          src={img.url}
                          alt={`Görsel ${idx + 1}`}
                          fill
                          sizes="160px"
                          style={{ objectFit: 'cover' }}
                        />
                        {idx === 0 && <span className={styles.heroBadge}>Kapak</span>}
                      </div>
                      <div className={styles.imageActions}>
                        {idx !== 0 && (
                          <button
                            type="button"
                            className={styles.heroBtn}
                            onClick={() => setAsHero(idx)}
                            title="Kapak Görseli Yap"
                          >
                            ★ Kapak Yap
                          </button>
                        )}
                        <button
                          type="button"
                          className={styles.deleteImgBtn}
                          onClick={() => removeImage(idx)}
                          title="Sil"
                        >
                          ✕ Sil
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Video Alanı */}
            <div className="admin-card">
              <h2 className={styles.sectionLabel}>Model Videosu (Opsiyonel)</h2>
              <p className={styles.subtext}>
                Modele ait video yükleyebilir veya YouTube / Cloudinary / MP4 linki ekleyebilirsiniz.
              </p>

              <div className={styles.fields}>
                <div className="field-group">
                  <label className="admin-label">Video Dosyası Yükle</label>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button
                      type="button"
                      className="admin-btn"
                      style={{ background: '#334155', color: '#fff', padding: '9px 16px', borderRadius: 8, cursor: 'pointer' }}
                      onClick={() => videoInputRef.current?.click()}
                      disabled={uploadingVideo}
                    >
                      {uploadingVideo ? 'Video Yükleniyor...' : '📹 Video Dosyası Seç'}
                    </button>
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      style={{ display: 'none' }}
                      onChange={(e) => handleVideoUpload(e.target.files)}
                    />
                    {videoProgress && <span style={{ fontSize: 13, color: '#c5a880' }}>{videoProgress}</span>}
                  </div>
                </div>

                <div className="field-group">
                  <label className="admin-label">Veya Video Bağlantısı (URL)</label>
                  <input
                    className="admin-input"
                    value={video}
                    onChange={(e) => setVideo(e.target.value)}
                    placeholder="https://... (ör. Cloudinary video linki veya YouTube)"
                  />
                </div>

                {video && (
                  <div style={{ marginTop: 10, padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
                    <span style={{ fontSize: 12, color: '#4ade80', display: 'block', marginBottom: 6 }}>✓ Tanımlı Video:</span>
                    <a href={video} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: '#c5a880', wordBreak: 'break-all' }}>
                      {video}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Teknik Özellikler */}
            <div className="admin-card">
              <h2 className={styles.sectionLabel}>Teknik Özellikler</h2>
              <div className={styles.fields}>
                <div className="field-group">
                  <label className="admin-label">Malzeme</label>
                  <input
                    className="admin-input"
                    value={specs.material}
                    onChange={(e) => setSpecs((s) => ({ ...s, material: e.target.value }))}
                    placeholder="ör. Doğal Masif Meşe, Lake Cila, Paslanmaz Gold Metal"
                  />
                </div>
                <div className="field-group">
                  <label className="admin-label">Ölçüler / Boyutlar</label>
                  <input
                    className="admin-input"
                    value={specs.dimensions}
                    onChange={(e) => setSpecs((s) => ({ ...s, dimensions: e.target.value }))}
                    placeholder="ör. Yatak: 180x200cm | Dolap: 260x220x65cm"
                  />
                </div>
                <div className="field-group">
                  <label className="admin-label">Tasarım Stili</label>
                  <input
                    className="admin-input"
                    value={specs.style}
                    onChange={(e) => setSpecs((s) => ({ ...s, style: e.target.value }))}
                    placeholder="ör. Modern Lüks, Klasik Neoklasik"
                  />
                </div>
                <div className="field-group">
                  <label className="admin-label">Renk Seçenekleri</label>
                  <input
                    className="admin-input"
                    value={specs.colors}
                    onChange={(e) => setSpecs((s) => ({ ...s, colors: e.target.value }))}
                    placeholder="ör. Krem, Antrasit, Ceviz, Özel Renk Seçenekleri"
                  />
                </div>
                <div className="field-group">
                  <label className="admin-label">Garanti Süresi</label>
                  <input
                    className="admin-input"
                    value={specs.warranty}
                    onChange={(e) => setSpecs((s) => ({ ...s, warranty: e.target.value }))}
                    placeholder="ör. 2 Yıl Üretici Garantisi"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Sağ Kolon (Yayınlama ve Durum) ── */}
          <div className={styles.sideCol}>
            <div className="admin-card">
              <h2 className={styles.sectionLabel}>Yayınlama Durumu</h2>
              <div className={styles.fields}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={(e) => setIsVisible(e.target.checked)}
                  />
                  <span>Sitede Yayınla (Aktif)</span>
                </label>

                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                  />
                  <span>Ana Sayfada Öne Çıkar</span>
                </label>

                <div className={styles.formActions}>
                  <button
                    type="submit"
                    className="admin-btn admin-btn-primary"
                    style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                    disabled={saving || uploading || uploadingVideo}
                  >
                    {saving ? 'Kaydediliyor...' : 'Modeli Kaydet ve Yayınla'}
                  </button>
                  <Link
                    href="/dashboard/odalar"
                    className="admin-btn admin-btn-secondary"
                    style={{ width: '100%', justifyContent: 'center', textAlign: 'center' }}
                  >
                    İptal
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
