'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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

const AUTOPLAY_INTERVAL = 3800; // 3.8s per slide

export default function RoomGallery({ images, name }: RoomGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isInteracting, setIsInteracting] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  
  const dialog = useRef<HTMLDialogElement>(null);
  const thumbnailsRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const safeIndex = Math.min(activeIndex, images.length - 1);
  const total = images.length;

  const step = useCallback((delta: number) => {
    setActiveIndex((i) => (i + delta + total) % total);
  }, [total]);

  // Autoplay effect: moves from right to left every 3.8s
  useEffect(() => {
    if (!isPlaying || isInteracting || total <= 1) return;

    const timer = setInterval(() => {
      step(1);
    }, AUTOPLAY_INTERVAL);

    return () => clearInterval(timer);
  }, [isPlaying, isInteracting, total, step]);

  // Scroll active thumbnail smoothly into view
  useEffect(() => {
    if (!thumbnailsRef.current || total <= 1) return;
    const activeThumb = thumbnailsRef.current.children[safeIndex] as HTMLElement | undefined;
    if (activeThumb) {
      activeThumb.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [safeIndex, total]);

  const openLightbox = useCallback((index: number) => {
    setActiveIndex(index);
    setLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => {
    dialog.current?.close();
    setLightboxOpen(false);
  }, []);

  // Native <dialog> handles Escape and restores focus
  useEffect(() => {
    if (lightboxOpen && dialog.current && !dialog.current.open) {
      dialog.current.showModal();
    }
  }, [lightboxOpen]);

  // Keyboard navigation inside lightbox and main view
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (lightboxOpen) {
        if (event.key === 'ArrowLeft') step(-1);
        if (event.key === 'ArrowRight') step(1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen, step]);

  // Touch handlers for mobile swipe (Right-to-Left and vice versa)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setIsInteracting(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchStartX.current - touchEndX;
    const diffY = touchStartY.current - touchEndY;

    // Detect horizontal swipe if delta X is greater than delta Y
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 35) {
      if (diffX > 0) {
        // Swiped left -> move to next image
        step(1);
      } else {
        // Swiped right -> move to previous image
        step(-1);
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;

    // Gracefully resume autoplay after a short pause
    setTimeout(() => {
      setIsInteracting(false);
    }, 2000);
  };

  const scrollThumbnails = (direction: 'left' | 'right') => {
    if (!thumbnailsRef.current) return;
    const amount = direction === 'left' ? -220 : 220;
    thumbnailsRef.current.scrollBy({ left: amount, behavior: 'smooth' });
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
        {/* Horizontal Track sliding smoothly */}
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
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openLightbox(idx);
                }
              }}
              aria-label={`${name} — ${idx + 1}. görseli tam ekran göster`}
            >
              <Image
                {...imageProps(img.url, 1800)}
                alt={img.alt || `${name} - fotoğraf ${idx + 1}`}
                fill
                priority={idx === 0}
                loading={idx < 3 ? 'eager' : 'lazy'}
                sizes="(max-width: 900px) 100vw, 66vw"
                className={styles.slideImg}
              />
            </div>
          ))}
        </div>

        {/* Floating Controls Overlay */}
        <div className={styles.overlayControls} aria-hidden="true">
          {/* Photo Counter Pill */}
          <div className={styles.counterBadge}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
              <circle cx="9" cy="9" r="2"/>
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
            </svg>
            <span>{safeIndex + 1} / {total}</span>
          </div>

          {/* Autoplay Play/Pause Toggle & Hint */}
          {total > 1 && (
            <button
              type="button"
              className={styles.playToggleBtn}
              onClick={(e) => {
                e.stopPropagation();
                setIsPlaying((p) => !p);
              }}
              aria-label={isPlaying ? 'Otomatik kaydırmayı duraklat' : 'Otomatik kaydırmayı başlat'}
              title={isPlaying ? 'Duraklat' : 'Oynat'}
            >
              {isPlaying && !isInteracting ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              )}
              <span>{isPlaying && !isInteracting ? 'Otomatik Akış' : 'Duraklatıldı'}</span>
            </button>
          )}

          {/* Fullscreen Expand Hint Button */}
          <button
            type="button"
            className={styles.expandBtn}
            onClick={() => openLightbox(safeIndex)}
            aria-label="Tam ekran görüntüle"
            title="Tam ekran"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </button>
        </div>

        {/* Navigation Arrows (Prev & Next) */}
        {total > 1 && (
          <>
            <button
              type="button"
              className={`${styles.navBtn} ${styles.prevBtn}`}
              onClick={(e) => {
                e.stopPropagation();
                step(-1);
              }}
              aria-label="Önceki fotoğraf"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              className={`${styles.navBtn} ${styles.nextBtn}`}
              onClick={(e) => {
                e.stopPropagation();
                step(1);
              }}
              aria-label="Sonraki fotoğraf"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </>
        )}

        {/* Dynamic Progress Bar for Autoplay */}
        {total > 1 && isPlaying && (
          <div
            key={`progress-${safeIndex}-${isInteracting ? 'paused' : 'running'}`}
            className={`${styles.progressBar} ${isInteracting ? styles.progressPaused : ''}`}
          />
        )}
      </div>

      {/* --- Thumbnails Horizontal Ribbon --- */}
      {total > 1 && (
        <div className={styles.thumbsWrapper}>
          {total > 4 && (
            <button
              type="button"
              className={`${styles.thumbScrollBtn} ${styles.thumbScrollLeft}`}
              onClick={() => scrollThumbnails('left')}
              aria-label="Fotoğrafları sola kaydır"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
          )}

          <div
            ref={thumbnailsRef}
            className={styles.thumbs}
            role="group"
            aria-label={`${name} fotoğraf listesi (${total} fotoğraf)`}
          >
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
                    {...imageProps(img.url, 300)}
                    alt=""
                    width={100}
                    height={75}
                    sizes="100px"
                    style={{ objectFit: 'cover' }}
                  />
                  <span className={styles.thumbIndex}>{index + 1}</span>
                </button>
              );
            })}
          </div>

          {total > 4 && (
            <button
              type="button"
              className={`${styles.thumbScrollBtn} ${styles.thumbScrollRight}`}
              onClick={() => scrollThumbnails('right')}
              aria-label="Fotoğrafları sağa kaydır"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* --- Fullscreen Lightbox Modal --- */}
      <dialog
        ref={dialog}
        className={styles.lightbox}
        aria-label={`${name} galerisi — tam ekran`}
        onClose={() => setLightboxOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeLightbox();
        }}
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

        <div className={styles.lightboxCounter}>
          {safeIndex + 1} / {total} — {name}
        </div>

        {total > 1 && (
          <>
            <button
              type="button"
              className={`${styles.lightboxNav} ${styles.lightboxPrev}`}
              onClick={() => step(-1)}
              aria-label="Önceki fotoğraf"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              className={`${styles.lightboxNav} ${styles.lightboxNext}`}
              onClick={() => step(1)}
              aria-label="Sonraki fotoğraf"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </>
        )}

        <button
          type="button"
          className={styles.lightboxClose}
          onClick={closeLightbox}
          aria-label="Kapat"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </dialog>
    </div>
  );
}
