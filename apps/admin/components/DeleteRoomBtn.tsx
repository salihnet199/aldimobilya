'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './DeleteRoomBtn.module.css';

interface Props { slug: string; name: string }

export default function DeleteRoomBtn({ slug, name }: Props) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      await fetch(`/api/rooms/${slug}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setLoading(false);
      setConfirm(false);
    }
  }

  if (confirm) {
    return (
      <div className={styles.confirmRow}>
        <span className={styles.confirmText}>Emin misin?</span>
        <button onClick={handleDelete} disabled={loading} className={styles.yesBtn}>
          {loading ? '…' : 'Evet, Sil'}
        </button>
        <button onClick={() => setConfirm(false)} className={styles.noBtn}>Hayır</button>
      </div>
    );
  }

  return (
    <button onClick={() => setConfirm(true)} className={styles.deleteBtn} aria-label={`${name} sil`}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
      </svg>
      Sil
    </button>
  );
}
