'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { imageProps } from '@/lib/media';
import styles from './LatestMasterpieces.module.css';

interface MasterpieceCardProps {
  room: {
    id: string;
    slug: string;
    nameTr: string | null;
    nameEn: string | null;
    heroImage: string | null;
    descTr: string | null;
    category: string | null;
    images: { id: string; url: string; alt?: string | null }[];
  };
  idx: number;
  isLead: boolean;
}

export default function MasterpieceCard({ room, idx, isLead }: MasterpieceCardProps) {
  const displayName = room.nameTr || room.nameEn || room.slug;
  const categoryName = room.category === 'yemek-odasi' ? 'Yemek Odası' : 'Lüks Yatak Odası';

  // Gather unique photos (heroImage + images array)
  const photos: string[] = [];
  const seen = new Set<string>();
  if (room.heroImage) {
    seen.add(room.heroImage);
    photos.push(room.heroImage);
  }
  room.images.forEach((img) => {
    if (img.url && !seen.has(img.url)) {
      seen.add(img.url);
      photos.push(img.url);
    }
  });

  const total = photos.length;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const step = useCallback(
    (delta: number) => {
      if (total <= 1) return;
      setCurrentIndex((prev) => (prev + delta + total) % total);
    },
    [total],
  );

  // Staggered autoplay: transitions smoothly from right to left every 3.8s
  useEffect(() => {
    if (total <= 1 || isInteracting) return;

    // Slight offset based on card index so they don't jump in unison
    const delay = 3600 + (idx % 3) * 300;
    const interval = setInterval(() => {
      step(1);
    }, delay);

    return () => clearInterval(interval);
  }, [total, isInteracting, idx, step]);

  // Touch Swipe handlers for mobile
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

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 35) {
      if (diffX > 0) {
        step(1); // Swiped left -> move to next photo
      } else {
        step(-1); // Swiped right -> move to previous photo
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;

    setTimeout(() => {
      setIsInteracting(false);
    }, 2500);
  };

  return (
    <Link
      href={`/katalog/${room.slug}`}
      className={`${styles.card} ${isLead ? styles.cardLead : ''}`}
      aria-label={`${displayName} — Fotoğrafları ve Detayları Gör`}
      onMouseEnter={() => setIsInteracting(true)}
      onMouseLeave={() => setIsInteracting(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Image Container with Slider Track */}
      <div className={styles.imageWrap}>
        <div
          className={styles.cardSliderTrack}
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {photos.map((photoUrl, pIdx) => (
            <div key={photoUrl + '-' + pIdx} className={styles.cardSlideItem}>
              <Image
                {...imageProps(photoUrl, 1600)}
                alt={`${displayName} - fotoğraf ${pIdx + 1}`}
                fill
                priority={idx === 0 && pIdx === 0}
                loading={idx < 2 && pIdx < 2 ? 'eager' : 'lazy'}
                sizes={
                  isLead
                    ? '(max-width: 1024px) 100vw, 66vw'
                    : '(max-width: 680px) 100vw, (max-width: 1024px) 50vw, 33vw'
                }
                className={styles.image}
              />
            </div>
          ))}
        </div>

        {/* Badges */}
        <div className={styles.badgeRow}>
          <span className={styles.newBadge}>Yeni Model</span>
          {total > 0 && (
            <span className={styles.photoCount}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
              {total > 1 ? `${currentIndex + 1} / ${total}` : `${total} Fotoğraf`}
            </span>
          )}
        </div>

        {/* Navigation Arrows for Direct Interactive Browsing */}
        {total > 1 && (
          <>
            <button
              type="button"
              className={`${styles.cardNavBtn} ${styles.cardPrevBtn}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                step(-1);
              }}
              aria-label="Önceki fotoğraf"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              className={`${styles.cardNavBtn} ${styles.cardNextBtn}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                step(1);
              }}
              aria-label="Sonraki fotoğraf"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </>
        )}

        {/* Pagination Dots Indicator for multiple photos */}
        {total > 1 && total <= 10 && (
          <div className={styles.dotsRow} aria-hidden="true">
            {photos.map((_, dotIdx) => (
              <span
                key={dotIdx}
                className={`${styles.dot} ${dotIdx === currentIndex ? styles.dotActive : ''}`}
              />
            ))}
          </div>
        )}

        <div className={styles.overlayGradient} aria-hidden="true" />
      </div>

      {/* Typography & Card Content */}
      <div className={styles.cardContent}>
        <span className={styles.categoryPill}>{categoryName}</span>
        <h3 className={styles.roomName}>{displayName}</h3>
        {room.descTr && <p className={styles.cardDesc}>{room.descTr}</p>}

        <div className={styles.cardFooter}>
          <span className={styles.exploreLink}>
            Fotoğraf Galerisini İncele
            <svg
              className={styles.arrowIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}
