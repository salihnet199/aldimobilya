'use client';

import { useCallback, useRef, useState } from 'react';
import Image from 'next/image';
import { MAX_IMAGE_BYTES, formatBytes, uploadMedia, validateImageFile } from './upload';
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
  /**
   * Label the first image as the cover and offer a "make cover" action on the
   * others. Defaults to the previous behaviour: on when reordering is off.
   */
  coverBadge?: boolean;
  /** Notifies the parent so it can disable its own submit button while uploading. */
  onUploadingChange?: (uploading: boolean) => void;
}

export default function ImageUploader({
  value = [],
  onChange,
  maxFiles = 10,
  folder = 'aldimobilya/rooms',
  reorderable = false,
  coverBadge,
  onUploadingChange,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const showCover = coverBadge ?? !reorderable;

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files);
      if (!arr.length) return;

      const remaining = maxFiles - value.length;
      if (remaining <= 0) {
        setError(`En fazla ${maxFiles} görsel ekleyebilirsiniz.`);
        return;
      }

      const rejected: string[] = [];
      const accepted: File[] = [];
      for (const file of arr) {
        const reason = validateImageFile(file);
        if (reason) rejected.push(reason);
        else accepted.push(file);
      }

      const toUpload = accepted.slice(0, remaining);
      if (accepted.length > toUpload.length) {
        rejected.push(`En fazla ${maxFiles} görsel ekleyebilirsiniz; ${accepted.length - toUpload.length} dosya yüklenmedi.`);
      }

      setError(rejected.join(' '));

      if (!toUpload.length) return;

      setUploading(true);
      onUploadingChange?.(true);
      try {
        const results: UploadedImage[] = [];
        for (const file of toUpload) {
          results.push(await uploadMedia(file, folder, 'image'));
        }
        onChange?.([...value, ...results]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Yükleme başarısız. Tekrar deneyin.');
      } finally {
        setUploading(false);
        onUploadingChange?.(false);
        if (inputRef.current) inputRef.current.value = '';
      }
    },
    [value, onChange, maxFiles, folder, onUploadingChange],
  );

  const handleRemove = (index: number) => {
    setError('');
    onChange?.(value.filter((_, i) => i !== index));
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange?.(next);
  };

  const makeCover = (index: number) => {
    if (index === 0) return;
    const next = [...value];
    const [item] = next.splice(index, 1);
    next.unshift(item);
    onChange?.(next);
  };

  return (
    <div className={styles.root}>
      {/* Thumbnails */}
      {value.length > 0 && (
        <div className={styles.grid}>
          {value.map((img, i) => (
            <div key={img.publicId || img.url || i} className={styles.thumb}>
              <Image
                src={img.url}
                alt={`Görsel ${i + 1}`}
                fill
                sizes="(max-width: 640px) 33vw, 120px"
                unoptimized
                style={{ objectFit: 'cover' }}
              />
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => handleRemove(i)}
                aria-label={`Görsel ${i + 1} kaldır`}
              >
                ×
              </button>
              {showCover && i === 0 && <span className={styles.heroBadge}>Kapak</span>}
              {showCover && i > 0 && (
                <button
                  type="button"
                  className={styles.coverBtn}
                  onClick={() => makeCover(i)}
                  aria-label={`Görsel ${i + 1} kapak yap`}
                >
                  Kapak Yap
                </button>
              )}
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
              <span className={styles.hint}>
                JPG, PNG, WebP, AVIF, GIF — maks. {formatBytes(MAX_IMAGE_BYTES)} • {value.length}/{maxFiles}
              </span>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
            className={styles.hiddenInput}
            onChange={(e) => e.target.files && uploadFiles(e.target.files)}
          />
        </div>
      )}

      {error && <p className={styles.error} role="alert">{error}</p>}
    </div>
  );
}
