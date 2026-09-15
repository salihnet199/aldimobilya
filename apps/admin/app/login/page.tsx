'use client';

import { useState } from 'react';
import styles from './page.module.css';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    // TODO: wire up to NextAuth signIn when credentials are configured
    await new Promise((r) => setTimeout(r, 900));
    setError('Veritabanı henüz bağlı değil. .env.local dosyasını yapılandırın.');
    setLoading(false);
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logoArea}>
          <span className={styles.logoName}>ALDi</span>
          <span className={styles.logoSub}>Mobilya Admin</span>
        </div>

        <h1 className={styles.heading}>Yönetici Girişi</h1>
        <p className={styles.sub}>Panel erişimi için kimlik bilgilerinizi girin</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className="field-group">
            <label className="admin-label">E-posta Adresi</label>
            <input
              className="admin-input"
              type="email"
              placeholder="admin@aldimobilya.com"
              required
              autoFocus
            />
          </div>
          <div className="field-group">
            <label className="admin-label">Parola</label>
            <input
              className="admin-input"
              type="password"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className={styles.errorBox}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            className={`admin-btn admin-btn-primary ${styles.submitBtn}`}
            disabled={loading}
          >
            {loading ? (
              <svg className={styles.spinner} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                <polyline points="10 17 15 12 10 7"/>
                <line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
            )}
            {loading ? 'Giriş yapılıyor…' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  );
}
