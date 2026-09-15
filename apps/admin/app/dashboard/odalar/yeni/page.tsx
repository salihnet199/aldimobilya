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
    .trim()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function YeniOdaPage() {
  const router = useRouter();

  const [nameEn, setNameEn]       = useState('');
  const [nameTr, setNameTr]       = useState('');
  const [slug, setSlug]           = useState('');
  const [descEn, setDescEn]       = useState('');
  const [category, setCategory]   = useState('');
  const [video, setVideo]         = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [specs, setSpecs]         = useState({ material: '', dimensions: '', style: '', warranty: '', colors: '' });

  const [images, setImages]       = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

  const fileRef = useRef<HTMLInputElement>(null);

  // Auto-slug from English name
  function handleNameEn(v: string) {
    setNameEn(v);
    if (!slug || slug === slugify(nameEn)) {
      setSlug(slugify(v));
    }
  }

  async function handleImageUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError('');
    setUploadProgress(`0 / ${files.length}`);

    try {
      const uploaded: UploadedImage[] = [];
      const fileList = Array.from(files);

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        setUploadProgress(`${i + 1} / ${fileList.length}: ${file.name}`);

        const fd = new FormData();
        fd.append('file', file);
        fd.append('folder', 'aldimobilya/rooms');

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: fd,
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || `Upload failed for ${file.name} (Status: ${res.status})`);
        }

        uploaded.push({
          url: data.url,
          publicId: data.publicId,
        });
      }

      setImages((prev) => [...prev, ...uploaded]);
      setSuccess(`Uploaded ${uploaded.length} image(s) successfully.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error uploading images. Please check Cloudinary credentials.';
      setError(msg);
    } finally {
      setUploading(false);
      setUploadProgress('');
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    const primaryName = nameEn.trim() || nameTr.trim();
    if (!primaryName) {
      setError('Model Name (English) is required.');
      return;
    }

    const finalSlug = slug.trim() || slugify(primaryName);
    if (!finalSlug) {
      setError('URL slug is required.');
      return;
    }

    if (!images.length) {
      setError('Please upload at least one image.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nameEn: primaryName,
          nameTr: nameTr.trim() || primaryName,
          slug: finalSlug,
          descEn: descEn.trim() || null,
          descTr: descEn.trim() || null,
          category: category.trim() || null,
          heroImage: images[0].url,
          images: images.map((img) => ({ url: img.url, alt: primaryName })),
          video: video.trim() || null,
          isVisible,
          isFeatured,
          specs: Object.values(specs).some(Boolean) ? specs : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Error saving room.');
        return;
      }

      setSuccess('Room published successfully!');
      router.push('/dashboard/odalar');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connection error. Please try again.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/dashboard/odalar" className={styles.backLink}>
          ← Back to Rooms / العودة للقائمة
        </Link>
        <h1 className={styles.title}>Add New Room / إضافة غرفة جديدة</h1>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
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
          {/* ── Left Column ── */}
          <div className={styles.mainCol}>
            {/* Basic Info */}
            <div className="admin-card">
              <h2 className={styles.sectionLabel}>Model Information / معلومات الموديل</h2>
              <div className={styles.fields}>
                <div className="field-group">
                  <label className="admin-label">Model Name (English) / اسم الموديل بالإنجليزية *</label>
                  <input
                    className="admin-input"
                    value={nameEn}
                    onChange={(e) => handleNameEn(e.target.value)}
                    placeholder="e.g. Royal Luxury Bedroom"
                    required
                  />
                </div>

                <div className="field-group">
                  <label className="admin-label">URL Slug (Page Link) / رابط الصفحة *</label>
                  <input
                    className="admin-input"
                    value={slug}
                    onChange={(e) => setSlug(slugify(e.target.value))}
                    placeholder="e.g. royal-luxury-bedroom"
                    required
                  />
                  <span className={styles.hint}>
                    Auto-generated from English name • Link: /katalog/<strong>{slug || '...'}</strong>
                  </span>
                </div>

                <div className="field-group">
                  <label className="admin-label">Category / الفئة</label>
                  <input
                    className="admin-input"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Classic, Modern, Royal, Luxury"
                  />
                </div>

                <div className="field-group">
                  <label className="admin-label">Description / الوصف</label>
                  <textarea
                    className="admin-input admin-textarea"
                    value={descEn}
                    onChange={(e) => setDescEn(e.target.value)}
                    placeholder="Describe this room model..."
                    rows={4}
                  />
                </div>

                <div className="field-group">
                  <label className="admin-label" style={{ opacity: 0.7 }}>Alternative Name (Turkish / Optional)</label>
                  <input
                    className="admin-input"
                    value={nameTr}
                    onChange={(e) => setNameTr(e.target.value)}
                    placeholder="Optional - will use English name if left empty"
                  />
                </div>
              </div>
            </div>

            {/* Images Upload */}
            <div className="admin-card">
              <h2 className={styles.sectionLabel}>Room Images / صور الغرفة *</h2>
              {images.length > 0 && (
                <div className={styles.thumbGrid}>
                  {images.map((img, i) => (
                    <div key={img.publicId} className={styles.thumb}>
                      <Image src={img.url} alt="" fill style={{ objectFit: 'cover' }} sizes="120px" unoptimized />
                      {i === 0 && <span className={styles.coverBadge}>Main Cover / الغلاف</span>}
                      <button
                        type="button"
                        className={styles.removeImg}
                        onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                        title="Remove image"
                      >×</button>
                    </div>
                  ))}
                </div>
              )}

              <div
                className={`${styles.uploadZone} ${uploading ? styles.uploading : ''}`}
                onClick={() => !uploading && fileRef.current?.click()}
                style={{ cursor: uploading ? 'wait' : 'pointer' }}
              >
                {uploading ? (
                  <>
                    <div className={styles.spinner} />
                    <span>Uploading images to Cloudinary… ({uploadProgress})</span>
                  </>
                ) : (
                  <>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    <span>Click to select images or drag & drop</span>
                    <span className={styles.hint}>PNG, JPG, WebP — Any size supported</span>
                  </>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className={styles.fileInput}
                  onChange={(e) => handleImageUpload(e.target.files)}
                />
              </div>
            </div>

            {/* Video */}
            <div className="admin-card">
              <h2 className={styles.sectionLabel}>Video URL / رابط فيديو (اختياري)</h2>
              <div className="field-group">
                <label className="admin-label">Video Link (YouTube, Vimeo, Cloudinary, mp4)</label>
                <input
                  className="admin-input"
                  type="url"
                  value={video}
                  onChange={(e) => setVideo(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Specifications */}
            <div className="admin-card">
              <h2 className={styles.sectionLabel}>Specifications / المواصفات (Optional)</h2>
              <div className={`${styles.fields} form-grid-2`}>
                {[
                  { key: 'material', label: 'Material / نوع الخشب والمواد', placeholder: 'e.g. Solid Oak, Velvet' },
                  { key: 'dimensions', label: 'Dimensions / المقاسات', placeholder: 'e.g. 200x200 cm' },
                  { key: 'style', label: 'Style / النمط', placeholder: 'e.g. Modern Luxury' },
                  { key: 'warranty', label: 'Warranty / الضمان', placeholder: 'e.g. 5 Years' },
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
                  <label className="admin-label">Colors / خيارات الألوان</label>
                  <input
                    className="admin-input"
                    value={specs.colors}
                    onChange={(e) => setSpecs((s) => ({ ...s, colors: e.target.value }))}
                    placeholder="e.g. White & Gold, Anthracite, Walnut"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Right Column ── */}
          <div className={styles.sideCol}>
            <div className="admin-card">
              <h2 className={styles.sectionLabel}>Publish Settings / إعدادات النشر</h2>
              <div className={styles.toggleRow}>
                <div>
                  <p className={styles.toggleTitle}>Published / معروض</p>
                  <p className={styles.toggleDesc}>Visible on website / يظهر في الموقع</p>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={(e) => setIsVisible(e.target.checked)}
                  />
                  <span className="toggle-track" />
                </label>
              </div>

              <div className={`${styles.toggleRow} ${styles.toggleRowBorder}`}>
                <div>
                  <p className={styles.toggleTitle}>Featured / مميز</p>
                  <p className={styles.toggleDesc}>Show on homepage / يظهر في الرئيسية</p>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                  />
                  <span className="toggle-track" />
                </label>
              </div>
            </div>

            <div className={styles.submitArea}>
              <button
                type="submit"
                disabled={saving || uploading}
                className="admin-btn admin-btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {saving ? (
                  <>
                    <div className={styles.spinnerSm} /> Saving to Database…
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                      <polyline points="17 21 17 13 7 13 7 21"/>
                      <polyline points="7 3 7 8 15 8"/>
                    </svg>
                    Save & Publish / حفظ ونشر
                  </>
                )}
              </button>

              <Link
                href="/dashboard/odalar"
                className="admin-btn admin-btn-ghost"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Cancel / إلغاء
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
