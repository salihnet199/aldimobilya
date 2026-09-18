'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';
import { imageProps } from '@/lib/media';
import styles from './RoomGallery.module.css';

export interface GalleryImage {
  id: string;
  url: string;
  alt?: string | null;
}

interface RoomGalleryProps {
  images: GalleryImage[];
  name: string;
}

export default function RoomGallery({ images, name }: RoomGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const baseId = useId();
  const dialog = useRef<HTMLDialogElement>(null);

  const safeIndex = Math.min(activeIndex, images.length - 1);

  const openLightbox = useCallback((index: number) => {
    setActiveIndex(index);
    setLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => {
    dialog.current?.close();
    setLightboxOpen(false);
  }, []);

  // Native <dialog> handles Escape and restores focus automatically.
  useEffect(() => {
    if (lightboxOpen && dialog.current && !dialog.current.open) {
      dialog.current.showModal();
    }
  }, [lightboxOpen]);

  // Keyboard navigation inside the lightbox (Escape is handled natively).
  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        setActiveIndex((i) => (i - 1 + images.length) % images.length);
      } else if (event.key === 'ArrowRight') {
        setActiveIndex((i) => (i + 1) % images.length);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen, images.length]);

  if (images.length === 0) return null;

  const active = images[safeIndex];

  const step = (delta: number) =>
    setActiveIndex((i) => (i + delta + images.length) % images.length);

  return (
    <div className={styles.gallery}>
      <button
        type="button"
        id={`${baseId}-main`}
        className={styles.mainImage}
        onClick={() => openLightbox(safeIndex)}
        aria-label={`${name} — ${safeIndex + 1}. görseli tam ekran göster`}
      >
        <Image
          {...imageProps(active.url, 1800)}
          alt={active.alt || name}
          fill
          priority
          sizes="(max-width: 900px) 100vw, 66vw"
          style={{ objectFit: 'cover' }}
        />
        <span className={styles.expandHint} aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        </span>
      </button>

      {images.length > 1 && (
        <div className={styles.thumbs} role="group" aria-label={`${name} görsel galerisi`}>
          {images.map((img, index) => {
            const isActive = index === safeIndex;
            return (
              <button
                key={img.id}
                type="button"
                className={`${styles.thumb} ${isActive ? styles.thumbActive : ''}`}
                onClick={() => setActiveIndex(index)}
                aria-label={`${img.alt || name} — görsel ${index + 1}`}
                aria-pressed={isActive}
                aria-controls={`${baseId}-main`}
              >
                <Image
                  {...imageProps(img.url, 400)}
                  alt=""
                  width={180}
                  height={180}
                  sizes="120px"
                  style={{ objectFit: 'cover' }}
                />
              </button>
            );
          })}
        </div>
      )}

      <dialog
        ref={dialog}
        className={styles.lightbox}
        aria-label={`${name} görsel galerisi — tam ekran`}
        onClose={() => setLightboxOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeLightbox();
        }}
      >
        <div className={styles.lightboxStage}>
          {images.map((img, i) => (
            <div
              key={img.id}
              className={`${styles.lightboxSlide} ${i === safeIndex ? styles.lightboxSlideActive : ''}`}
            >
              <Image
                {...imageProps(img.url, 2400)}
                alt={img.alt || name}
                fill
                sizes="100vw"
                priority={i === safeIndex}
                style={{ objectFit: 'contain' }}
              />
            </div>
          ))}
        </div>

        <p className={styles.lightboxCounter} aria-live="polite">
          {safeIndex + 1} / {images.length}
        </p>

        {images.length > 1 && (
          <>
            <button
              type="button"
              className={`${styles.lightboxNav} ${styles.lightboxPrev}`}
              onClick={() => step(-1)}
              aria-label="Önceki görsel"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              className={`${styles.lightboxNav} ${styles.lightboxNext}`}
              onClick={() => step(1)}
              aria-label="Sonraki görsel"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </>
        )}

        <button
          type="button"
          className={styles.lightboxClose}
          onClick={closeLightbox}
          aria-label="Galeriyi kapat"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </dialog>
    </div>
  );
}
