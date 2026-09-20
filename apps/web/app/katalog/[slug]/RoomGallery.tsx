'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
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

// Autoplay is intentionally off by default on touch devices and with
// reduced-motion. Users can enable it explicitly with the play/pause button.
const AUTOPLAY_INTERVAL = 4500;

export default function RoomGallery({ images, name }: RoomGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const dialog = useRef<HTMLDialogElement>(null);
  const thumbnailsRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const interactingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const safeIndex = Math.min(activeIndex, images.length - 1);
  const total = images.length;

  // Respect prefers-reduced-motion via useSyncExternalStore (React-idiomatic pattern)
  const reducedMotion = useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  );

  const step = useCallback((delta: number) => {
    setActiveIndex((i) => (i + delta + total) % total);
  }, [total]);

  // Autoplay: only when explicitly enabled, not interacting, and reduced-motion is off
  useEffect(() => {
    if (!isPlaying || isInteracting || total <= 1 || reducedMotion) return;
    const timer = setInterval(() => step(1), AUTOPLAY_INTERVAL);
    return () => clearInterval(timer);
  }, [isPlaying, isInteracting, total, step, reducedMotion]);

  // Scroll active thumbnail into view
  useEffect(() => {
    if (!thumbnailsRef.current || total <= 1) return;
    const activeThumb = thumbnailsRef.current.children[safeIndex] as HTMLElement | undefined;
    if (activeThumb) {
      activeThumb.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [safeIndex, total, reducedMotion]);

  const openLightbox = useCallback((index: number) => {
    setActiveIndex(index);
    setLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => {
    dialog.current?.close();
    setLightboxOpen(false);
  }, []);

  // Native <dialog> handles Escape and focus restoration
  useEffect(() => {
    if (lightboxOpen && dialog.current && !dialog.current.open) {
      dialog.current.showModal();
    }
  }, [lightboxOpen]);

  // Keyboard navigation inside lightbox
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!lightboxOpen) return;
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen, step]);

  // Touch / swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setIsInteracting(true);
    if (interactingTimer.current) clearTimeout(interactingTimer.current);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    const dy = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 35) {
      step(dx > 0 ? 1 : -1);
    }
    touchStartX.current = null;
    touchStartY.current = null;
    interactingTimer.current = setTimeout(() => setIsInteracting(false), 2000);
  };

  const scrollThumbnails = (direction: 'left' | 'right') => {
    thumbnailsRef.current?.scrollBy({ left: direction === 'left' ? -220 : 220, behavior: 'smooth' });
  };

  if (total === 0) return null;

  return (
    <div className={styles.gallery} aria-label={`${name} görsel galerisi`}>
      {/* --- Main Slider Viewport --- */}
      <div
        className={styles.sliderViewport}
        onMouseEnter={() => setIsInteracting(true)}
        onMouseLeave={() => setIsInteracting(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Sliding track */}
        <div
          className={styles.sliderTrack}
          style={{ transform: `translateX(-${safeIndex * 100}%)` }}
        >
          {images.map((img, idx) => (
            <div
              key={img.id}
              className={styles.slideItem}
              onClick={() => openLightbox(idx)}
              role="button"
              tabIndex={idx === safeIndex ? 0 : -1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(idx); }
              }}
              aria-label={`${name} — ${idx + 1}. görseli tam ekran göster`}
            >
              <Image
                {...imageProps(img.url)}
                alt={img.alt || `${name} - fotoğraf ${idx + 1}`}
                fill
                priority={idx === 0}
                loading={idx < 2 ? 'eager' : 'lazy'}
                // Gallery column is ~66vw on desktop, full width on mobile
                sizes="(max-width: 600px) 100vw, (max-width: 900px) 100vw, (max-width: 1100px) calc(100vw - 420px), calc(100vw - 520px)"
                className={styles.slideImg}
              />
            </div>
          ))}
        </div>

        {/* Overlay controls */}
        <div className={styles.overlayControls}>
          {/* Counter */}
          <div className={styles.counterBadge} aria-live="polite" aria-atomic="true">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
            </svg>
            <span>{safeIndex + 1} / {total}</span>
          </div>

          {/* Play/pause — only shown if more than 1 image and reduced motion is off */}
          {total > 1 && !reducedMotion && (
            <button
              type="button"
              className={styles.playToggleBtn}
              onClick={(e) => { e.stopPropagation(); setIsPlaying((p) => !p); }}
              aria-label={isPlaying ? 'Otomatik kaydırmayı duraklat' : 'Otomatik kaydırmayı başlat'}
              aria-pressed={isPlaying}
            >
              {isPlaying && !isInteracting ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              )}
              <span>{isPlaying && !isInteracting ? 'Otomatik Akış' : 'Oynat'}</span>
            </button>
          )}

          {/* Expand / fullscreen */}
          <button
            type="button"
            className={styles.expandBtn}
            onClick={() => openLightbox(safeIndex)}
            aria-label="Tam ekran görüntüle"
            title="Tam ekran"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </button>
        </div>

        {/* Prev / Next nav arrows */}
        {total > 1 && (
          <>
            <button
              type="button"
              className={`${styles.navBtn} ${styles.prevBtn}`}
              onClick={(e) => { e.stopPropagation(); step(-1); }}
              aria-label="Önceki fotoğraf"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              className={`${styles.navBtn} ${styles.nextBtn}`}
              onClick={(e) => { e.stopPropagation(); step(1); }}
              aria-label="Sonraki fotoğraf"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </>
        )}

        {/* Autoplay progress bar */}
        {total > 1 && isPlaying && !reducedMotion && (
          <div
            key={`progress-${safeIndex}-${isInteracting ? 'paused' : 'running'}`}
            className={`${styles.progressBar} ${isInteracting ? styles.progressPaused : ''}`}
          />
        )}
      </div>

      {/* --- Thumbnails Strip --- */}
      {total > 1 && (
        <div className={styles.thumbsWrapper}>
          {total > 4 && (
            <button type="button" className={`${styles.thumbScrollBtn} ${styles.thumbScrollLeft}`} onClick={() => scrollThumbnails('left')} aria-label="Fotoğrafları sola kaydır">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
            </button>
          )}

          <div ref={thumbnailsRef} className={styles.thumbs} role="group" aria-label={`${name} fotoğraf listesi (${total} fotoğraf)`}>
            {images.map((img, index) => {
              const isActive = index === safeIndex;
              return (
                <button
                  key={img.id}
                  type="button"
                  className={`${styles.thumb} ${isActive ? styles.thumbActive : ''}`}
                  onClick={() => setActiveIndex(index)}
                  aria-label={`${img.alt || name} — fotoğraf ${index + 1}`}
                  aria-pressed={isActive}
                >
                  <Image
                    {...imageProps(img.url)}
                    alt=""
                    width={96}
                    height={72}
                    sizes="96px"
                    style={{ objectFit: 'cover' }}
                  />
                  <span className={styles.thumbIndex} aria-hidden="true">{index + 1}</span>
                </button>
              );
            })}
          </div>

          {total > 4 && (
            <button type="button" className={`${styles.thumbScrollBtn} ${styles.thumbScrollRight}`} onClick={() => scrollThumbnails('right')} aria-label="Fotoğrafları sağa kaydır">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          )}
        </div>
      )}

      {/* --- Fullscreen Lightbox --- */}
      <dialog
        ref={dialog}
        className={styles.lightbox}
        aria-label={`${name} galerisi — tam ekran`}
        onClose={() => setLightboxOpen(false)}
        onClick={(e) => { if (e.target === e.currentTarget) closeLightbox(); }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className={styles.lightboxStage}>
          {images.map((img, i) => (
            <div
              key={img.id}
              className={`${styles.lightboxSlide} ${i === safeIndex ? styles.lightboxSlideActive : ''}`}
            >
              <Image
                {...imageProps(img.url)}
                alt={img.alt || name}
                fill
                // Lightbox is full-screen; load highest quality for current + adjacent
                sizes="100vw"
                priority={i === safeIndex}
                style={{ objectFit: 'contain' }}
              />
            </div>
          ))}
        </div>

        <div className={styles.lightboxCounter} aria-live="polite" aria-atomic="true">
          {safeIndex + 1} / {total} — {name}
        </div>

        {total > 1 && (
          <>
            <button type="button" className={`${styles.lightboxNav} ${styles.lightboxPrev}`} onClick={() => step(-1)} aria-label="Önceki fotoğraf">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button type="button" className={`${styles.lightboxNav} ${styles.lightboxNext}`} onClick={() => step(1)} aria-label="Sonraki fotoğraf">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </>
        )}

        <button type="button" className={styles.lightboxClose} onClick={closeLightbox} aria-label="Kapat">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </dialog>
    </div>
  );
}
