'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import RoomForm, {
  type ApiRoom,
  type RoomFormValues,
  roomToFormState,
} from '@/components/RoomForm';
import type { UploadedImage } from '@/components/ImageUploader';
import { readErrorMessage } from '@/components/upload';
import styles from './page.module.css';

type LoadState = 'loading' | 'ready' | 'missing' | 'error';

type LoadResult =
  | { kind: 'ok'; values: RoomFormValues; images: UploadedImage[]; originalSpecs: unknown }
  | { kind: 'missing' }
  | { kind: 'error'; message: string };

async function fetchRoomState(slug: string): Promise<LoadResult> {
  try {
    const res = await fetch(`/api/rooms/${encodeURIComponent(slug)}`);

    if (res.status === 404) return { kind: 'missing' };
    if (!res.ok) {
      return { kind: 'error', message: await readErrorMessage(res, 'Model bilgileri yüklenemedi') };
    }

    const data = (await res.json()) as ApiRoom;
    return { kind: 'ok', ...roomToFormState(data) };
  } catch (err) {
    return {
      kind: 'error',
      message:
        err instanceof Error
          ? `Bağlantı hatası: ${err.message}`
          : 'Bağlantı hatası oluştu. Tekrar deneyiniz.',
    };
  }
}

export default function OdaDuzenlePage() {
  const params = useParams<{ slug: string | string[] }>();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;

  const [state, setState] = useState<LoadState>('loading');
  const [error, setError] = useState('');
  const [room, setRoom] = useState<{
    values: RoomFormValues;
    images: UploadedImage[];
    originalSpecs: unknown;
  } | null>(null);

  const apply = useCallback((result: LoadResult) => {
    if (result.kind === 'ok') {
      setRoom({ values: result.values, images: result.images, originalSpecs: result.originalSpecs });
      setError('');
      setState('ready');
      return;
    }
    if (result.kind === 'missing') {
      setState('missing');
      return;
    }
    setError(result.message);
    setState('error');
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!slug) return;
      const result = await fetchRoomState(slug);
      if (!cancelled) apply(result);
    })();

    return () => {
      cancelled = true;
    };
  }, [slug, apply]);

  function retry() {
    if (!slug) return;
    setError('');
    setState('loading');
    void fetchRoomState(slug).then(apply);
  }

  const view: LoadState = slug ? state : 'missing';

  if (view === 'loading') {
    return (
      <div className={styles.statePage}>
        <div className={styles.spinner} aria-hidden="true" />
        <p className={styles.stateText}>Model bilgileri yükleniyor…</p>
      </div>
    );
  }

  if (view === 'missing') {
    return (
      <div className={styles.statePage}>
        <h1 className={styles.stateTitle}>Model bulunamadı</h1>
        <p className={styles.stateText}>
          <strong>{slug}</strong> bağlantısına sahip bir model yok. Silinmiş olabilir.
        </p>
        <Link href="/dashboard/odalar" className="admin-btn admin-btn-primary">
          Odalar Listesine Dön
        </Link>
      </div>
    );
  }

  if (view === 'error' || !room) {
    return (
      <div className={styles.statePage}>
        <h1 className={styles.stateTitle}>Model yüklenemedi</h1>
        <p className={styles.stateError} role="alert">{error}</p>
        <div className={styles.stateActions}>
          <button type="button" className="admin-btn admin-btn-primary" onClick={retry}>
            Tekrar Dene
          </button>
          <Link href="/dashboard/odalar" className="admin-btn admin-btn-ghost">
            Odalar Listesine Dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <RoomForm
      mode="edit"
      originalSlug={slug}
      initialValues={room.values}
      initialImages={room.images}
      originalSpecs={room.originalSpecs}
    />
  );
}
