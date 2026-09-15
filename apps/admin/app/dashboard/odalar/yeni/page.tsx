'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import styles from './page.module.css';

interface UploadedImage { url: string; publicId: string }

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function YeniOdaPage() {
  const router = useRouter();

  const [nameTr, setNameTr]       = useState('');
  const [nameEn, setNameEn]       = useState('');
  const [slug, setSlug]           = useState('');
  const [descTr, setDescTr]       = useState('');
  const [category, setCategory]   = useState('');
  const [video, setVideo]         = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [specs, setSpecs]         = useState({ malzeme: '', boyutlar: '', stil: '', garanti: '', renkler: '' });

  const [images, setImages]       = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const fileRef = useRef<HTMLInputElement>(null);

  // Auto-slug from Turkish name
  function handleNameTr(v: string) {
    setNameTr(v);
    if (!slug || slug === slugify(nameTr)) setSlug(slugify(v));
  }

  async function handleImageUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError('');
    try {
      const uploaded: UploadedImage[] = [];
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('folder', 'aldimobilya/rooms');
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        if (!res.ok) throw new Error('Upload başarısız');
        uploaded.push(await res.json());
      }
      setImages((prev) => [...prev, ...uploaded]);
    } catch {
      setError('Görsel yüklenirken hata oluştu. Tekrar deneyin.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!nameTr.trim()) { setError('Model adı (Türkçe) zorunludur.'); return; }
    if (!slug.trim())   { setError('URL slug zorunludur.'); return; }
    if (!images.length) { setError('En az bir görsel yükleyin.'); return; }

    setSaving(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nameTr: nameTr.trim(),
          nameEn: nameEn.trim() || null,
          slug: slug.trim(),
          descTr: descTr.trim() || null,
          category: category.trim() || null,
          heroImage: images[0].url,
          images: images.map((img) => ({ url: img.url, alt: nameTr })),
          video: video.trim() || null,
          isVisible,
          isFeatured,
          specs: Object.values(specs).some(Boolean) ? specs : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Hata oluştu.'); return; }

      router.push('/dashboard/odalar');
      router.refresh();
    } catch {
      setError('Bağlantı hatası. Tekrar deneyin.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/dashboard/odalar" className={styles.backLink}>← Geri Dön</Link>
        <h1 className={styles.title}>Yeni Oda Modeli Ekle</h1>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {error}
        </div>
      )}

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formGrid}>
          {/* ── Left Column ── */}
          <div className={styles.mainCol}>
            {/* Temel Bilgiler */}
            <div className="admin-card">
              <h2 className={styles.sectionLabel}>Temel Bilgiler</h2>
              <div className={styles.fields}>
                <div className="field-group">
                  <label className="admin-label">Model Adı (Türkçe) *</label>
                  <input className="admin-input" value={nameTr} onChange={(e) => handleNameTr(e.target.value)} placeholder="ör. Elegance Premium" required />
                </div>
                <div className="field-group">
                  <label className="admin-label">Model Adı (İngilizce)</label>
                  <input className="admin-input" value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="ör. Elegance Premium" />
                </div>
                <div className="field-group">
                  <label className="admin-label">URL Slug *</label>
                  <input className="admin-input" value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder="ör. elegance-premium" required />
                  <span className={styles.hint}>Otomatik oluşturulur • /katalog/<strong>{slug || '...'}</strong></span>
                </div>
                <div className="field-group">
                  <label className="admin-label">Açıklama (Türkçe)</label>
                  <textarea className="admin-input admin-textarea" value={descTr} onChange={(e) => setDescTr(e.target.value)} placeholder="Bu modeli anlatan kısa bir açıklama..." rows={4} />
                </div>
                <div className="field-group">
                  <label className="admin-label">Kategori</label>
                  <input className="admin-input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="ör. Klasik, Modern, Avangard" />
                </div>
              </div>
            </div>

            {/* Specs */}
            <div className="admin-card">
              <h2 className={styles.sectionLabel}>Teknik Özellikler</h2>
              <div className={`${styles.fields} form-grid-2`}>
                {[
                  { key: 'malzeme', label: 'Malzeme', placeholder: 'ör. Masif Meşe' },
                  { key: 'boyutlar', label: 'Boyutlar', placeholder: 'ör. 160x200cm' },
                  { key: 'stil', label: 'Stil', placeholder: 'ör. Modern Klasik' },
                  { key: 'garanti', label: 'Garanti', placeholder: 'ör. 2 Yıl' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key} className="field-group">
                    <label className="admin-label">{label}</label>
                    <input
                      className="admin-input"
                      value={specs[key as keyof typeof specs]}
                      onChange={(e) => setSpecs((s) => ({ ...s, [key]: e.target.value }))}
                      placeholder={placeholder}
                    />
                  </div>
                ))}
                <div className="field-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="admin-label">Renk Seçenekleri</label>
                  <input className="admin-input" value={specs.renkler} onChange={(e) => setSpecs((s) => ({ ...s, renkler: e.target.value }))} placeholder="ör. Beyaz, Ceviz, Antrasit" />
                </div>
              </div>
            </div>

            {/* Görseller */}
            <div className="admin-card">
              <h2 className={styles.sectionLabel}>Görseller *</h2>
              {images.length > 0 && (
                <div className={styles.thumbGrid}>
                  {images.map((img, i) => (
                    <div key={img.publicId} className={styles.thumb}>
                      <Image src={img.url} alt="" fill style={{ objectFit: 'cover' }} sizes="120px" />
                      {i === 0 && <span className={styles.coverBadge}>Kapak</span>}
                      <button
                        type="button"
                        className={styles.removeImg}
                        onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
              <div
                className={`${styles.uploadZone} ${uploading ? styles.uploading : ''}`}
                onClick={() => !uploading && fileRef.current?.click()}
              >
                {uploading ? (
                  <><div className={styles.spinner} /><span>Yükleniyor…</span></>
                ) : (
                  <>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    <span>Görselleri sürükleyin veya seçin</span>
                    <span className={styles.hint}>PNG, JPG, WebP — Maks 10MB</span>
                  </>
                )}
                <input ref={fileRef} type="file" multiple accept="image/*" className={styles.fileInput} onChange={(e) => handleImageUpload(e.target.files)} />
              </div>
            </div>

            {/* Video */}
            <div className="admin-card">
              <h2 className={styles.sectionLabel}>Video Bağlantısı</h2>
              <div className="field-group">
                <label className="admin-label">Video URL</label>
                <input className="admin-input" type="url" value={video} onChange={(e) => setVideo(e.target.value)} placeholder="https://... (mp4 veya Cloudinary URL)" />
              </div>
            </div>
          </div>

          {/* ── Right Column ── */}
          <div className={styles.sideCol}>
            <div className="admin-card">
              <h2 className={styles.sectionLabel}>Yayın Ayarları</h2>
              <div className={styles.toggleRow}>
                <div>
                  <p className={styles.toggleTitle}>Yayında</p>
                  <p className={styles.toggleDesc}>Sitede görünür</p>
                </div>
                <label className="toggle">
                  <input type="checkbox" checked={isVisible} onChange={(e) => setIsVisible(e.target.checked)} />
                  <span className="toggle-track" />
                </label>
              </div>
              <div className={`${styles.toggleRow} ${styles.toggleRowBorder}`}>
                <div>
                  <p className={styles.toggleTitle}>Öne Çıkan</p>
                  <p className={styles.toggleDesc}>Ana sayfada göster</p>
                </div>
                <label className="toggle">
                  <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
                  <span className="toggle-track" />
                </label>
              </div>
            </div>

            <div className={styles.submitArea}>
              <button type="submit" disabled={saving || uploading} className="admin-btn admin-btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                {saving ? <><div className={styles.spinnerSm}/> Kaydediliyor…</> : <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                  Kaydet ve Yayınla
                </>}
              </button>
              <Link href="/dashboard/odalar" className="admin-btn admin-btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>İptal Et</Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
