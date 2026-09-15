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
}

export default function ImageUploader({
  value = [],
  onChange,
  maxFiles = 10,
  folder = 'aldimobilya/rooms',
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
        const results = await Promise.all(
          toUpload.map(async (file) => {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('folder', folder);
            const res = await fetch('/api/upload', { method: 'POST', body: fd });
            if (!res.ok) throw new Error(await res.text());
            return res.json() as Promise<UploadedImage>;
          }),
        );
        onChange?.([...value, ...results]);
      } catch {
        setError('Yükleme başarısız. Tekrar deneyin.');
      } finally {
        setUploading(false);
      }
    },
    [value, onChange, maxFiles, folder],
  );

  const handleRemove = (publicId: string) => {
    onChange?.(value.filter((img) => img.publicId !== publicId));
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
              {i === 0 && <span className={styles.heroBadge}>Kapak</span>}
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
