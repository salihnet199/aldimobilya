'use client';

import { useEffect, useState } from 'react';
import ImageUploader, { type UploadedImage } from '@/components/ImageUploader';
import styles from './page.module.css';

interface SettingsState {
  whatsapp: string;
  phone: string;
  email: string;
  address: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  youtube: string;
  heroTitleTr: string;
  heroSubtitleTr: string;
  elfSightCode: string;
  metaDescTr: string;
}

const EMPTY_SETTINGS: SettingsState = {
  whatsapp: '',
  phone: '',
  email: '',
  address: '',
  instagram: '',
  facebook: '',
  tiktok: '',
  youtube: '',
  heroTitleTr: '',
  heroSubtitleTr: '',
  elfSightCode: '',
  metaDescTr: '',
};

export default function AyarlarPage() {
  const [form, setForm] = useState<SettingsState>(EMPTY_SETTINGS);
  const [heroImages, setHeroImages] = useState<UploadedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (cancelled) return;

        if (res.ok && data.settings) {
          const s = data.settings;
          setForm({
            whatsapp: s.whatsapp ?? '',
            phone: s.phone ?? '',
            email: s.email ?? '',
            address: s.address ?? '',
            instagram: s.instagram ?? '',
            facebook: s.facebook ?? '',
            tiktok: s.tiktok ?? '',
            youtube: s.youtube ?? '',
            heroTitleTr: s.heroTitleTr ?? '',
            heroSubtitleTr: s.heroSubtitleTr ?? '',
            elfSightCode: s.elfSightCode ?? '',
            metaDescTr: s.metaDescTr ?? '',
          });
          const urls: string[] = Array.isArray(s.heroImages) ? s.heroImages : [];
          setHeroImages(urls.map((url, i) => ({ url, publicId: `hero-${i}` })));
        }
      } catch (err) {
        console.error('Ayarlar yüklenemedi:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  function update<K extends keyof SettingsState>(key: K, value: SettingsState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          heroImages: heroImages.map((img) => img.url),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Ayarlar kaydedilemedi.');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ayarlar kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.subtitle}>Ayarlar yükleniyor…</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Site Ayarları</h1>
          <p className={styles.subtitle}>İletişim bilgileri, sosyal medya ve içerik ayarları</p>
        </div>
        {saved && (
          <div className={styles.savedBadge}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5"/></svg>
            Kaydedildi!
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className={styles.form}>
        {/* Contact */}
        <div className="admin-card">
          <h2 className={styles.sectionLabel}>İletişim Bilgileri</h2>
          <div className={`${styles.fields} form-grid-2`}>
            <div className="field-group">
              <label className="admin-label">WhatsApp Numarası</label>
              <input
                className="admin-input"
                type="tel"
                placeholder="+90 5XX XXX XX XX"
                value={form.whatsapp}
                onChange={(e) => update('whatsapp', e.target.value)}
              />
              <span className={styles.hint}>Uluslararası format: +90...</span>
            </div>
            <div className="field-group">
              <label className="admin-label">Telefon</label>
              <input
                className="admin-input"
                type="tel"
                placeholder="+90 5XX XXX XX XX"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
              />
            </div>
            <div className="field-group">
              <label className="admin-label">E-posta</label>
              <input
                className="admin-input"
                type="email"
                placeholder="info@aldimobilya.com"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
              />
            </div>
            <div className="field-group">
              <label className="admin-label">Adres</label>
              <input
                className="admin-input"
                type="text"
                placeholder="İstanbul, Türkiye"
                value={form.address}
                onChange={(e) => update('address', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Social */}
        <div className="admin-card">
          <h2 className={styles.sectionLabel}>Sosyal Medya</h2>
          <div className={`${styles.fields} form-grid-2`}>
            <div className="field-group">
              <label className="admin-label">Instagram</label>
              <input
                className="admin-input"
                type="text"
                placeholder="aldimobilya"
                value={form.instagram}
                onChange={(e) => update('instagram', e.target.value)}
              />
            </div>
            <div className="field-group">
              <label className="admin-label">Facebook</label>
              <input
                className="admin-input"
                type="text"
                placeholder="aldimobilya"
                value={form.facebook}
                onChange={(e) => update('facebook', e.target.value)}
              />
            </div>
            <div className="field-group">
              <label className="admin-label">TikTok</label>
              <input
                className="admin-input"
                type="text"
                placeholder="@aldimobilya"
                value={form.tiktok}
                onChange={(e) => update('tiktok', e.target.value)}
              />
            </div>
            <div className="field-group">
              <label className="admin-label">YouTube</label>
              <input
                className="admin-input"
                type="text"
                placeholder="Kanal URL"
                value={form.youtube}
                onChange={(e) => update('youtube', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Homepage */}
        <div className="admin-card">
          <h2 className={styles.sectionLabel}>Ana Sayfa İçeriği</h2>
          <div className={styles.fields}>
            <div className="field-group">
              <label className="admin-label">Hero Başlık (Türkçe)</label>
              <input
                className="admin-input"
                type="text"
                placeholder="ör. Sonsuz Şıklık"
                value={form.heroTitleTr}
                onChange={(e) => update('heroTitleTr', e.target.value)}
              />
              <span className={styles.hint}>Son kelime otomatik olarak altın renkte vurgulanır.</span>
            </div>
            <div className="field-group">
              <label className="admin-label">Hero Alt Başlık (Türkçe)</label>
              <textarea
                className="admin-input admin-textarea"
                placeholder="ör. Her tasarım, yaşam alanınıza özgün bir karakter katar."
                rows={2}
                value={form.heroSubtitleTr}
                onChange={(e) => update('heroSubtitleTr', e.target.value)}
              />
            </div>

            <div className="field-group">
              <label className="admin-label">Ana Sayfa Kayan Görselleri (Hero Slider)</label>
              <span className={styles.hint}>
                Birden fazla görsel eklerseniz ana sayfada otomatik geçişli bir slayt gösterisi
                olarak görünür. Sıralama, görüntülenme sırasını belirler.
              </span>
              <ImageUploader
                value={heroImages}
                onChange={setHeroImages}
                folder="aldimobilya/hero"
                maxFiles={8}
                reorderable
              />
            </div>
          </div>
        </div>

        {/* Instagram Widget */}
        <div className="admin-card">
          <h2 className={styles.sectionLabel}>Instagram Widget (ElfSight)</h2>
          <div className={styles.fields}>
            <div className="field-group">
              <label className="admin-label">ElfSight App ID</label>
              <input
                className="admin-input"
                type="text"
                placeholder="ör. a1b2c3d4-..."
                value={form.elfSightCode}
                onChange={(e) => update('elfSightCode', e.target.value)}
              />
              <span className={styles.hint}>
                <a href="https://elfsight.com/instagram-feed-widget/" target="_blank" rel="noopener noreferrer" className={styles.link}>
                  ElfSight Instagram Widget
                </a>{' '}oluşturun ve App ID&apos;yi buraya yapıştırın.
              </span>
            </div>
          </div>
        </div>

        {/* SEO */}
        <div className="admin-card">
          <h2 className={styles.sectionLabel}>SEO & Meta</h2>
          <div className={styles.fields}>
            <div className="field-group">
              <label className="admin-label">Site Açıklaması (Türkçe)</label>
              <textarea
                className="admin-input admin-textarea"
                placeholder="Arama motorlarında görünecek açıklama..."
                rows={3}
                value={form.metaDescTr}
                onChange={(e) => update('metaDescTr', e.target.value)}
              />
            </div>
          </div>
        </div>

        {error && <p className={styles.hint} style={{ color: '#ef4444' }}>{error}</p>}

        {/* Save */}
        <div className={styles.saveRow}>
          <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            {saving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
          </button>
        </div>
      </form>
    </div>
  );
}
