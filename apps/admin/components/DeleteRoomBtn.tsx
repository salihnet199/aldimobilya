'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { readErrorMessage } from './upload';
import styles from './DeleteRoomBtn.module.css';

interface Props { slug: string; name: string }

export default function DeleteRoomBtn({ slug, name }: Props) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(slug)}`, { method: 'DELETE' });

      if (!res.ok) {
        // Keep the confirmation row open so the user can retry without re-clicking.
        setError(await readErrorMessage(res, 'Model silinemedi'));
        return;
      }

      setConfirm(false);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? `Bağlantı hatası: ${err.message}`
          : 'Bağlantı hatası oluştu. Tekrar deneyiniz.',
      );
    } finally {
      setLoading(false);
    }
  }

  function cancel() {
    setError('');
    setConfirm(false);
  }

  if (confirm) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.confirmRow}>
          <span className={styles.confirmText}>Emin misin?</span>
          <button type="button" onClick={handleDelete} disabled={loading} className={styles.yesBtn}>
            {loading ? 'Siliniyor…' : 'Evet, Sil'}
          </button>
          <button type="button" onClick={cancel} disabled={loading} className={styles.noBtn}>
            Hayır
          </button>
        </div>
        {error && <p className={styles.error} role="alert">{error}</p>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => { setError(''); setConfirm(true); }}
      className={styles.deleteBtn}
      aria-label={`${name} sil`}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
      </svg>
      Sil
    </button>
  );
}
