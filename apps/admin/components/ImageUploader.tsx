'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import styles from './ImageUploader.module.css';

export interface UploadedImage {
  url: string;
  publicId: string;
}

interface Props {
  value?: UploadedImage[];
  onChange?: (images: UploadedImage[]) => void;
  maxFiles?: number;
  folder?: string;
  /** Show up/down controls to reorder images (e.g. for a homepage slider sequence). */
  reorderable?: boolean;
}

async function uploadFileDirect(file: File, folder: string): Promise<UploadedImage> {
  // 1. Direct client upload to Cloudinary (bypasses the platform's request body
  //    size limit and is faster for large photography).
  try {
    const signRes = await fetch(`/api/upload/sign?folder=${encodeURIComponent(folder)}`);
    if (signRes.ok) {
      const { signature, timestamp, apiKey, cloudName } = await signRes.json();
      const fd = new FormData();
      fd.append('file', file);
      fd.append('api_key', apiKey);
      fd.append('timestamp', String(timestamp));
      fd.append('signature', signature);
      fd.append('folder', folder);

      const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: 'POST',
        body: fd,
      });
      const cloudData = await cloudRes.json();
      if (cloudRes.ok && cloudData.secure_url) {
        return { url: cloudData.secure_url, publicId: cloudData.public_id || '' };
      }
    }
  } catch {
    // fall through to the server-side route below
  }

  // 2. Fallback: internal Next.js API route (server-side Cloudinary upload).
  const fd = new FormData();
  fd.append('file', file);
  fd.append('folder', folder);
  const res = await fetch('/api/upload', { method: 'POST', body: fd });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `${file.name} yüklenemedi.`);
  }
  const data = await res.json();
  return { url: data.url, publicId: data.publicId || '' };
}

export default function ImageUploader({
  value = [],
  onChange,
  maxFiles = 10,
  folder = 'aldimobilya/rooms',
  reorderable = false,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files).filter((f) => f.type.startsWith('image/'));
      if (!arr.length) return;

      const remaining = maxFiles - value.length;
      const toUpload = arr.slice(0, remaining);

      setUploading(true);
      setError('');

      try {
        const results: UploadedImage[] = [];
        for (const file of toUpload) {
          results.push(await uploadFileDirect(file, folder));
        }
        onChange?.([...value, ...results]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Yükleme başarısız. Tekrar deneyin.');
      } finally {
        setUploading(false);
      }
    },
    [value, onChange, maxFiles, folder],
  );

  const handleRemove = (publicId: string) => {
    onChange?.(value.filter((img) => img.publicId !== publicId));
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange?.(next);
  };

  return (
    <div className={styles.root}>
      {/* Thumbnails */}
      {value.length > 0 && (
        <div className={styles.grid}>
          {value.map((img, i) => (
            <div key={img.publicId} className={styles.thumb}>
              <Image
                src={img.url}
                alt={`Görsel ${i + 1}`}
                fill
                sizes="120px"
                style={{ objectFit: 'cover' }}
              />
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => handleRemove(img.publicId)}
                aria-label="Görseli kaldır"
              >
                ×
              </button>
              {i === 0 && !reorderable && <span className={styles.heroBadge}>Kapak</span>}
              {reorderable && value.length > 1 && (
                <div className={styles.reorderControls}>
                  <button
                    type="button"
                    className={styles.reorderBtn}
                    onClick={() => moveImage(i, -1)}
                    disabled={i === 0}
                    aria-label="Sola taşı"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className={styles.reorderBtn}
                    onClick={() => moveImage(i, 1)}
                    disabled={i === value.length - 1}
                    aria-label="Sağa taşı"
                  >
                    ›
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      {value.length < maxFiles && (
        <div
          className={`${styles.dropZone} ${dragOver ? styles.dragOver : ''} ${uploading ? styles.loading : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            uploadFiles(e.dataTransfer.files);
          }}
        >
          {uploading ? (
            <>
              <div className={styles.spinner} />
              <span>Yükleniyor…</span>
            </>
          ) : (
            <>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <span>Görselleri sürükleyin veya <u>seçin</u></span>
              <span className={styles.hint}>PNG, JPG, WebP — Maks 10MB</span>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*"
            className={styles.hiddenInput}
            onChange={(e) => e.target.files && uploadFiles(e.target.files)}
          />
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
