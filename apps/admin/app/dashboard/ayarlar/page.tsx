'use client';

import { useState } from 'react';
import styles from './page.module.css';

export default function AyarlarPage() {
  const [saved, setSaved] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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
              <input className="admin-input" type="tel" placeholder="+90 5XX XXX XX XX" defaultValue="+905000000000" />
              <span className={styles.hint}>Uluslararası format: +90...</span>
            </div>
            <div className="field-group">
              <label className="admin-label">Telefon</label>
              <input className="admin-input" type="tel" placeholder="+90 5XX XXX XX XX" />
            </div>
            <div className="field-group">
              <label className="admin-label">E-posta</label>
              <input className="admin-input" type="email" placeholder="info@aldimobilya.com" />
            </div>
            <div className="field-group">
              <label className="admin-label">Adres</label>
              <input className="admin-input" type="text" placeholder="İstanbul, Türkiye" />
            </div>
          </div>
        </div>

        {/* Social */}
        <div className="admin-card">
          <h2 className={styles.sectionLabel}>Sosyal Medya</h2>
          <div className={`${styles.fields} form-grid-2`}>
            <div className="field-group">
              <label className="admin-label">Instagram</label>
              <input className="admin-input" type="text" placeholder="@aldimobilya" defaultValue="aldimobilya" />
            </div>
            <div className="field-group">
              <label className="admin-label">Facebook</label>
              <input className="admin-input" type="text" placeholder="aldimobilya" />
            </div>
            <div className="field-group">
              <label className="admin-label">TikTok</label>
              <input className="admin-input" type="text" placeholder="@aldimobilya" />
            </div>
            <div className="field-group">
              <label className="admin-label">YouTube</label>
              <input className="admin-input" type="text" placeholder="Kanal URL" />
            </div>
          </div>
        </div>

        {/* Homepage */}
        <div className="admin-card">
          <h2 className={styles.sectionLabel}>Ana Sayfa İçeriği</h2>
          <div className={styles.fields}>
            <div className="field-group">
              <label className="admin-label">Hero Başlık (Türkçe)</label>
              <input className="admin-input" type="text" placeholder="ör. Sonsuz Şıklık" />
            </div>
            <div className="field-group">
              <label className="admin-label">Hero Alt Başlık (Türkçe)</label>
              <textarea className="admin-input admin-textarea" placeholder="ör. Her tasarım, yaşam alanınıza özgün bir karakter katar." rows={2} />
            </div>
            <div className="field-group">
              <label className="admin-label">Hero Görsel / Video URL</label>
              <input className="admin-input" type="url" placeholder="https://... (Cloudinary önerilen)" />
            </div>
          </div>
        </div>

        {/* Instagram Widget */}
        <div className="admin-card">
          <h2 className={styles.sectionLabel}>Instagram Widget (ElfSight)</h2>
          <div className={styles.fields}>
            <div className="field-group">
              <label className="admin-label">ElfSight App ID</label>
              <input className="admin-input" type="text" placeholder="ör. a1b2c3d4-..." />
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
                defaultValue="ALDi Mobilya — El işçiliğiyle üretilen lüks yatak odası takımları. Kalite, estetik ve özgünlük bir arada."
              />
            </div>
          </div>
        </div>

        {/* Save */}
        <div className={styles.saveRow}>
          <button type="submit" className="admin-btn admin-btn-primary">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            Ayarları Kaydet
          </button>
        </div>
      </form>
    </div>
  );
}
