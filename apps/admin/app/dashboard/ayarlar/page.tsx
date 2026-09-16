'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import HeroSlideshowEditor from '@/components/HeroSlideshowEditor';
import { normalizeHeroSettings, toHeroSettingsPayload, type HeroSlideshowSettings } from '@/components/heroSettings';
import { readErrorMessage } from '@/components/upload';
import { useAdminRole } from '@/components/useAdminRole';
import { can } from '@/lib/roles';
import styles from './page.module.css';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

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
  const [hero, setHero] = useState<HeroSlideshowSettings>(() => normalizeHeroSettings(null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  // A failed load leaves the form empty; saving it would wipe the stored
  // settings, so writes stay blocked until a reload succeeds.
  const [loadFailed, setLoadFailed] = useState(false);

  // Presentation-only hint; the API re-checks `settings:write` per request.
  const { role, loading: roleLoading } = useAdminRole();
  const canWrite = can(role, 'settings:write');
  const readOnly = roleLoading || !canWrite;
  const locked = readOnly || loadFailed;

  // Guards against a stale response overwriting a newer one (and against
  // setting state after unmount).
  const loadSeq = useRef(0);
  const loadController = useRef<AbortController | null>(null);
  const saveController = useRef<AbortController | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial loading state is established by useState, not by the effect.
  // Retry UI transitions belong to the click handler below.
  const loadSettings = useCallback(async () => {
    const seq = ++loadSeq.current;
    loadController.current?.abort();
    const controller = new AbortController();
    loadController.current = controller;
    const isCurrent = () => !controller.signal.aborted && seq === loadSeq.current;

    try {
      const res = await fetch('/api/settings', { signal: controller.signal, cache: 'no-store' });
      if (!isCurrent()) return;

      if (!res.ok) {
        const message = await readErrorMessage(res, 'Ayarlar yüklenemedi');
        if (!isCurrent()) return;
        setError(message);
        setLoadFailed(true);
        return;
      }

      const data: unknown = await res.json();
      if (!isCurrent()) return;

      const settings = isRecord(data) ? data.settings : null;
      if (!isRecord(settings)) throw new Error('Geçersiz ayarlar yanıtı.');
      setForm({
        whatsapp: typeof settings.whatsapp === 'string' ? settings.whatsapp : '',
        phone: typeof settings.phone === 'string' ? settings.phone : '',
        email: typeof settings.email === 'string' ? settings.email : '',
        address: typeof settings.address === 'string' ? settings.address : '',
        instagram: typeof settings.instagram === 'string' ? settings.instagram : '',
        facebook: typeof settings.facebook === 'string' ? settings.facebook : '',
        tiktok: typeof settings.tiktok === 'string' ? settings.tiktok : '',
        youtube: typeof settings.youtube === 'string' ? settings.youtube : '',
        heroTitleTr: typeof settings.heroTitleTr === 'string' ? settings.heroTitleTr : '',
        heroSubtitleTr: typeof settings.heroSubtitleTr === 'string' ? settings.heroSubtitleTr : '',
        elfSightCode: typeof settings.elfSightCode === 'string' ? settings.elfSightCode : '',
        metaDescTr: typeof settings.metaDescTr === 'string' ? settings.metaDescTr : '',
      });
      // Preserve both the legacy array and full slideshow response contracts.
      setHero(normalizeHeroSettings(settings.heroSlideshow ?? settings.heroImages));
    } catch (err) {
      if (!isCurrent()) return;
      setError(err instanceof Error ? `Bağlantı hatası: ${err.message}` : 'Ayarlar yüklenemedi.');
      setLoadFailed(true);
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
    return () => {
      loadSeq.current += 1;
      loadController.current?.abort();
      saveController.current?.abort();
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, [loadSettings]);

  function retryLoad() {
    setLoading(true);
    setError('');
    setLoadFailed(false);
    void loadSettings();
  }

  function update<K extends keyof SettingsState>(key: K, value: SettingsState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (locked || loading || saving || saveController.current) return;
    const controller = new AbortController();
    saveController.current = controller;
    if (savedTimer.current) clearTimeout(savedTimer.current);
    setSaving(true);
    setError('');
    setSaved(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, heroImages: toHeroSettingsPayload(hero) }),
      });
      if (controller.signal.aborted) return;
      if (!res.ok) {
        const message = await readErrorMessage(res, 'Ayarlar kaydedilemedi');
        if (!controller.signal.aborted) setError(message);
        return;
      }
      setSaved(true);
      savedTimer.current = setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? `Bağlantı hatası: ${err.message}` : 'Ayarlar kaydedilemedi. Tekrar deneyiniz.');
    } finally {
      if (!controller.signal.aborted) setSaving(false);
      if (saveController.current === controller) saveController.current = null;
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

      {error && (
        <div className={styles.errorBanner} role="alert">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      {loadFailed && (
        <div className={styles.errorBanner} role="alert">
          <span>
            Ayarlar yüklenemediği için kaydetme geçici olarak kapatıldı; boş bir formun mevcut
            ayarların üzerine yazmasını önlemek için önce yeniden yükleyin.
          </span>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={retryLoad}>
            Tekrar Dene
          </button>
        </div>
      )}

      {!roleLoading && !canWrite && (
        <div className={styles.readOnlyBanner} role="status">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          Bu sayfayı görüntüleyebilirsiniz, ancak site ayarlarını yalnızca yönetici (ADMIN)
          kaydedebilir.
        </div>
      )}

      <form onSubmit={handleSave} className={styles.form}>
        <fieldset className={styles.fieldset} disabled={locked}>
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
              <HeroSlideshowEditor value={hero} onChange={setHero} />
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

        {/* Save */}
        <div className={styles.saveRow}>
          <button
            type="submit"
            className="admin-btn admin-btn-primary"
            disabled={saving || locked}
            title={
              canWrite
                ? undefined
                : 'Ayarları yalnızca yönetici (ADMIN) kaydedebilir.'
            }
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            {saving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
          </button>
        </div>
        </fieldset>
      </form>
    </div>
  );
}
