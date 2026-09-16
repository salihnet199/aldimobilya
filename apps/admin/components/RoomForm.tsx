'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ImageUploader, { type UploadedImage } from './ImageUploader';
import {
  MAX_VIDEO_BYTES,
  formatBytes,
  isSafeMediaUrl,
  readErrorMessage,
  uploadMedia,
  validateVideoFile,
} from './upload';
import { buildSpecsPayload, readSpecString, type RoomSpecFields } from '@/lib/room-specs';
import { publicRoomHref } from '@/lib/public-site';
import styles from './RoomForm.module.css';

export type RoomFormSpecs = RoomSpecFields;

export interface RoomFormValues {
  nameTr: string;
  nameEn: string;
  slug: string;
  descTr: string;
  descEn: string;
  category: string;
  video: string;
  isVisible: boolean;
  isFeatured: boolean;
  specs: RoomFormSpecs;
}

export const EMPTY_ROOM_FORM_VALUES: RoomFormValues = {
  nameTr: '',
  nameEn: '',
  slug: '',
  descTr: '',
  descEn: '',
  category: '',
  video: '',
  isVisible: true,
  isFeatured: false,
  specs: { material: '', dimensions: '', style: '', colors: '', warranty: '' },
};

/** Shape of the room object returned directly by GET/POST/PUT /api/rooms. */
export interface ApiRoom {
  slug: string;
  nameTr?: string | null;
  nameEn?: string | null;
  descTr?: string | null;
  descEn?: string | null;
  category?: string | null;
  heroImage?: string | null;
  video?: string | null;
  isVisible?: boolean;
  isFeatured?: boolean;
  specs?: unknown;
  images?: { id?: string; url: string; order?: number | null }[] | null;
}

/** Maps an API room into form state, keeping the stored cover image first. */
export function roomToFormState(room: ApiRoom): {
  values: RoomFormValues;
  images: UploadedImage[];
  /**
   * The raw persisted `specs` object, carried through so unknown spec keys and
   * array values survive an edit round-trip (see `buildSpecsPayload`).
   */
  originalSpecs: unknown;
} {
  const stored = (room.images ?? []).map((img, index) => ({
    url: img.url,
    publicId: img.id ?? `room-${index}`,
  }));

  // GET returns images ordered by `order`; make sure the stored heroImage leads.
  const coverIndex = room.heroImage ? stored.findIndex((img) => img.url === room.heroImage) : -1;
  const images = coverIndex > 0 ? [stored[coverIndex], ...stored.filter((_, i) => i !== coverIndex)] : stored;

  return {
    values: {
      nameTr: room.nameTr ?? '',
      nameEn: room.nameEn ?? '',
      slug: room.slug ?? '',
      descTr: room.descTr ?? '',
      descEn: room.descEn ?? '',
      category: room.category ?? '',
      video: room.video ?? '',
      isVisible: room.isVisible ?? true,
      isFeatured: room.isFeatured ?? false,
      specs: {
        material: readSpecString(room.specs, 'material'),
        dimensions: readSpecString(room.specs, 'dimensions'),
        style: readSpecString(room.specs, 'style'),
        colors: readSpecString(room.specs, 'colors'),
        warranty: readSpecString(room.specs, 'warranty'),
      },
    },
    images,
    originalSpecs: room.specs ?? null,
  };
}

export function slugify(text: string) {
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

interface Props {
  mode: 'create' | 'edit';
  /** Edit mode only: the slug currently stored in the database, used for PUT /api/rooms/[slug]. */
  originalSlug?: string;
  initialValues?: RoomFormValues;
  initialImages?: UploadedImage[];
  /**
   * Edit mode only: the persisted `specs` object, so spec keys this form does
   * not render are preserved instead of being dropped on save.
   */
  originalSpecs?: unknown;
}

export default function RoomForm({ mode, originalSlug, initialValues, initialImages, originalSpecs }: Props) {
  const router = useRouter();
  const isEdit = mode === 'edit';

  const [values, setValues] = useState<RoomFormValues>(initialValues ?? EMPTY_ROOM_FORM_VALUES);
  const [images, setImages] = useState<UploadedImage[]>(initialImages ?? []);
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [imagesUploading, setImagesUploading] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoProgress, setVideoProgress] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const videoInputRef = useRef<HTMLInputElement>(null);

  function update<K extends keyof RoomFormValues>(key: K, value: RoomFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleNameChange(value: string) {
    setValues((prev) => ({
      ...prev,
      nameTr: value,
      // Auto-fill the slug from the Turkish name until the user edits it manually.
      slug: slugTouched ? prev.slug : slugify(value),
    }));
  }

  async function handleVideoUpload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    setError('');
    setSuccess('');

    const rejection = validateVideoFile(file);
    if (rejection) {
      setError(rejection);
      if (videoInputRef.current) videoInputRef.current.value = '';
      return;
    }

    setVideoUploading(true);
    setVideoProgress(`Video yükleniyor: ${file.name}…`);
    try {
      const uploaded = await uploadMedia(file, 'aldimobilya/videos', 'video');
      update('video', uploaded.url);
      setSuccess('Video yüklendi. Kaydetmeyi unutmayın.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Video yüklenirken bir hata oluştu.');
    } finally {
      setVideoUploading(false);
      setVideoProgress('');
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    const nameTr = values.nameTr.trim();
    if (!nameTr) {
      setError('Lütfen model adını giriniz.');
      return;
    }

    const finalSlug = values.slug.trim() || slugify(nameTr);
    if (!finalSlug) {
      setError('Lütfen URL bağlantısını (slug) belirleyiniz.');
      return;
    }

    if (!images.length) {
      setError('Lütfen modele ait en az bir görsel yükleyiniz.');
      return;
    }

    const video = values.video.trim();
    if (video && !isSafeMediaUrl(video)) {
      setError('Video bağlantısı geçersiz. Yalnızca https:// adresleri veya / ile başlayan yollar kullanılabilir.');
      return;
    }

    const nameEn = values.nameEn.trim() || nameTr;
    // Preserve spec keys the form does not render (and stored array shapes).
    const specs = buildSpecsPayload(values.specs, originalSpecs ?? null);
    const payload = {
      nameTr,
      nameEn,
      slug: finalSlug,
      descTr: values.descTr.trim() || null,
      descEn: values.descEn.trim() || null,
      category: values.category.trim() || null,
      heroImage: images[0].url,
      images: images.map((img) => ({ url: img.url, alt: nameTr })),
      video: video || null,
      isVisible: values.isVisible,
      isFeatured: values.isFeatured,
      specs,
    };

    setSaving(true);
    try {
      const res = await fetch(isEdit ? `/api/rooms/${encodeURIComponent(originalSlug ?? finalSlug)}` : '/api/rooms', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        setError(await readErrorMessage(res, 'Model kaydedilemedi'));
        return;
      }

      setSuccess(isEdit ? 'Model güncellendi.' : 'Model eklendi.');
      router.push('/dashboard/odalar');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bağlantı hatası oluştu. Tekrar deneyiniz.');
    } finally {
      setSaving(false);
    }
  }

  const busy = saving || imagesUploading || videoUploading;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/dashboard/odalar" className={styles.backLink}>
          Odalar Listesine Dön
        </Link>
        <h1 className={styles.title}>{isEdit ? 'Oda Modelini Düzenle' : 'Yeni Oda Modeli Ekle'}</h1>
        {isEdit && originalSlug && (
          values.isVisible ? (
            <p className={styles.subtitle}>
              Sitedeki adres:{' '}
              <a
                href={publicRoomHref(originalSlug)}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.siteLink}
              >
                {publicRoomHref(originalSlug)}
              </a>
            </p>
          ) : (
            <p className={styles.subtitle}>
              Bu model <strong>gizli</strong>; site üzerinde yayınlanmıyor.
            </p>
          )
        )}
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
          {success}
        </div>
      )}

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formGrid}>
          {/* Main column */}
          <div className={styles.mainCol}>
            <div className="admin-card">
              <h2 className={styles.sectionLabel}>Model Bilgileri</h2>
              <div className={styles.fields}>
                <div className="field-group">
                  <label className="admin-label" htmlFor="room-name-tr">Model Adı (Türkçe) *</label>
                  <input
                    id="room-name-tr"
                    className="admin-input"
                    value={values.nameTr}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="ör. Hürrem Sultan Yatak Odası"
                    maxLength={200}
                    required
                  />
                </div>

                <div className="field-group">
                  <label className="admin-label" htmlFor="room-name-en">Model Adı (İngilizce)</label>
                  <input
                    id="room-name-en"
                    className="admin-input"
                    value={values.nameEn}
                    onChange={(e) => update('nameEn', e.target.value)}
                    placeholder="Boş bırakılırsa Türkçe ad kullanılır"
                    maxLength={200}
                  />
                </div>

                <div className="field-group">
                  <label className="admin-label" htmlFor="room-slug">Sayfa Bağlantısı (Slug) *</label>
                  <input
                    id="room-slug"
                    className="admin-input"
                    value={values.slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      update('slug', slugify(e.target.value));
                    }}
                    placeholder="ör. hurrem-sultan-yatak-odasi"
                    required
                  />
                  <span className={styles.hint}>
                    Model adından otomatik üretilir • Sitedeki adres: /katalog/<strong>{values.slug || '...'}</strong>
                  </span>
                </div>

                <div className="field-group">
                  <label className="admin-label" htmlFor="room-category">Kategori</label>
                  <input
                    id="room-category"
                    className="admin-input"
                    value={values.category}
                    onChange={(e) => update('category', e.target.value)}
                    placeholder="ör. Klasik Yatak Odası, Modern, Avangard, Lüks"
                    maxLength={200}
                  />
                </div>

                <div className="field-group">
                  <label className="admin-label" htmlFor="room-desc-tr">Model Açıklaması (Türkçe)</label>
                  <textarea
                    id="room-desc-tr"
                    className="admin-input admin-textarea"
                    rows={4}
                    value={values.descTr}
                    onChange={(e) => update('descTr', e.target.value)}
                    placeholder="Koleksiyon hakkında detaylı bilgi, kumaş ve ahşap detayları..."
                    maxLength={5000}
                  />
                </div>

                <div className="field-group">
                  <label className="admin-label" htmlFor="room-desc-en">Model Açıklaması (İngilizce)</label>
                  <textarea
                    id="room-desc-en"
                    className="admin-input admin-textarea"
                    rows={3}
                    value={values.descEn}
                    onChange={(e) => update('descEn', e.target.value)}
                    placeholder="Boş bırakılırsa Türkçe açıklama kullanılır"
                    maxLength={5000}
                  />
                </div>
              </div>
            </div>

            {/* Photos */}
            <div className="admin-card">
              <h2 className={styles.sectionLabel}>Model Görselleri *</h2>
              <p className={styles.subtext}>
                İlk görsel ana kapak görseli olur. Sıralamak için ok tuşlarını, kapak yapmak için
                görselin üzerindeki <strong>Kapak Yap</strong> düğmesini kullanın.
              </p>

              <ImageUploader
                value={images}
                onChange={setImages}
                folder="aldimobilya/rooms"
                maxFiles={50}
                reorderable
                coverBadge
                onUploadingChange={setImagesUploading}
              />
            </div>

            {/* Video */}
            <div className="admin-card">
              <h2 className={styles.sectionLabel}>Model Videosu (Opsiyonel)</h2>
              <p className={styles.subtext}>
                Video dosyası yükleyebilir veya güvenli bir medya bağlantısı (https) ekleyebilirsiniz.
              </p>

              <div className={styles.fields}>
                <div className="field-group">
                  <label className="admin-label" htmlFor="room-video-file">Video Dosyası Yükle</label>
                  <div className={styles.inlineRow}>
                    <button
                      id="room-video-file"
                      type="button"
                      className="admin-btn admin-btn-ghost"
                      onClick={() => videoInputRef.current?.click()}
                      disabled={videoUploading}
                    >
                      {videoUploading ? 'Video Yükleniyor…' : 'Video Dosyası Seç'}
                    </button>
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      className={styles.hiddenInput}
                      onChange={(e) => handleVideoUpload(e.target.files)}
                    />
                    <span className={styles.hint}>
                      MP4, MOV, WebM — maks. {formatBytes(MAX_VIDEO_BYTES)}
                    </span>
                  </div>
                  {videoProgress && <span className={styles.progress}>{videoProgress}</span>}
                </div>

                <div className="field-group">
                  <label className="admin-label" htmlFor="room-video-url">Veya Güvenli Video Bağlantısı (URL)</label>
                  <input
                    id="room-video-url"
                    className="admin-input"
                    value={values.video}
                    onChange={(e) => update('video', e.target.value)}
                    placeholder="https://... (Cloudinary video linki veya YouTube)"
                  />
                </div>

                {values.video && isSafeMediaUrl(values.video) && (
                  <div className={styles.videoPreview}>
                    <span className={styles.videoPreviewLabel}>Tanımlı video:</span>
                    <a href={values.video} target="_blank" rel="noreferrer">
                      {values.video}
                    </a>
                    <button
                      type="button"
                      className={styles.clearVideoBtn}
                      onClick={() => update('video', '')}
                    >
                      Kaldır
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Specs */}
            <div className="admin-card">
              <h2 className={styles.sectionLabel}>Teknik Özellikler</h2>
              <div className={`${styles.fields} form-grid-2`}>
                <div className="field-group">
                  <label className="admin-label" htmlFor="spec-material">Malzeme</label>
                  <input
                    id="spec-material"
                    className="admin-input"
                    value={values.specs.material}
                    onChange={(e) => setValues((p) => ({ ...p, specs: { ...p.specs, material: e.target.value } }))}
                    placeholder="ör. Doğal Masif Meşe, Lake Cila"
                    maxLength={200}
                  />
                </div>
                <div className="field-group">
                  <label className="admin-label" htmlFor="spec-dimensions">Ölçüler / Boyutlar</label>
                  <input
                    id="spec-dimensions"
                    className="admin-input"
                    value={values.specs.dimensions}
                    onChange={(e) => setValues((p) => ({ ...p, specs: { ...p.specs, dimensions: e.target.value } }))}
                    placeholder="ör. Yatak: 180x200cm | Dolap: 260x220x65cm"
                    maxLength={200}
                  />
                </div>
                <div className="field-group">
                  <label className="admin-label" htmlFor="spec-style">Tasarım Stili</label>
                  <input
                    id="spec-style"
                    className="admin-input"
                    value={values.specs.style}
                    onChange={(e) => setValues((p) => ({ ...p, specs: { ...p.specs, style: e.target.value } }))}
                    placeholder="ör. Modern Lüks, Klasik Neoklasik"
                    maxLength={200}
                  />
                </div>
                <div className="field-group">
                  <label className="admin-label" htmlFor="spec-colors">Renk Seçenekleri</label>
                  <input
                    id="spec-colors"
                    className="admin-input"
                    value={values.specs.colors}
                    onChange={(e) => setValues((p) => ({ ...p, specs: { ...p.specs, colors: e.target.value } }))}
                    placeholder="ör. Krem, Antrasit, Ceviz"
                    maxLength={200}
                  />
                </div>
                <div className="field-group">
                  <label className="admin-label" htmlFor="spec-warranty">Garanti Süresi</label>
                  <input
                    id="spec-warranty"
                    className="admin-input"
                    value={values.specs.warranty}
                    onChange={(e) => setValues((p) => ({ ...p, specs: { ...p.specs, warranty: e.target.value } }))}
                    placeholder="ör. 2 Yıl Üretici Garantisi"
                    maxLength={200}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Side column */}
          <div className={styles.sideCol}>
            <div className="admin-card">
              <h2 className={styles.sectionLabel}>Yayınlama Durumu</h2>
              <div className={styles.fields}>
                <label className={styles.checkboxLabel} htmlFor="room-visible">
                  <input
                    id="room-visible"
                    type="checkbox"
                    checked={values.isVisible}
                    onChange={(e) => update('isVisible', e.target.checked)}
                  />
                  <span>Sitede Yayınla (Aktif)</span>
                </label>

                <label className={styles.checkboxLabel} htmlFor="room-featured">
                  <input
                    id="room-featured"
                    type="checkbox"
                    checked={values.isFeatured}
                    onChange={(e) => update('isFeatured', e.target.checked)}
                  />
                  <span>Ana Sayfada Öne Çıkar</span>
                </label>

                <div className={styles.formActions}>
                  <button
                    type="submit"
                    className="admin-btn admin-btn-primary"
                    disabled={busy}
                  >
                    {saving ? 'Kaydediliyor…' : isEdit ? 'Değişiklikleri Kaydet' : 'Modeli Kaydet'}
                  </button>
                  <Link href="/dashboard/odalar" className="admin-btn admin-btn-ghost">
                    İptal
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile sticky action bar */}
        <div className={styles.mobileBar}>
          <button type="submit" className="admin-btn admin-btn-primary" disabled={busy}>
            {saving ? 'Kaydediliyor…' : isEdit ? 'Kaydet' : 'Modeli Kaydet'}
          </button>
          <Link href="/dashboard/odalar" className="admin-btn admin-btn-ghost">
            İptal
          </Link>
        </div>
      </form>
    </div>
  );
}
