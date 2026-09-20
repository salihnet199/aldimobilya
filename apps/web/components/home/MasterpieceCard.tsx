'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
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

  // Collect unique photos
  const photos: string[] = [];
  const seen = new Set<string>();
  if (room.heroImage) { seen.add(room.heroImage); photos.push(room.heroImage); }
  room.images.forEach((img) => {
    if (img.url && !seen.has(img.url)) { seen.add(img.url); photos.push(img.url); }
  });

  const total = photos.length;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const cardRef = useRef<HTMLAnchorElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const interactingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInteracting = useRef(false);

  // useSyncExternalStore: React-idiomatic subscription to browser media queries.
  // SSR snapshot returns false (conservative: no autoplay on server).
  const hasFinePointer = useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia('(pointer: fine)');
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    () => window.matchMedia('(pointer: fine)').matches,
    () => false,
  );

  const reducedMotion = useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  );

  // IntersectionObserver: autoplay only while card is in the viewport
  useEffect(() => {
    if (!cardRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.2 },
    );
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  const step = useCallback((delta: number) => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev + delta + total) % total);
  }, [total]);

  // Autoplay:
  //  - Only on desktop (fine pointer)
  //  - Only when visible in viewport
  //  - Off for reduced-motion users
  //  - Staggered per card index so they don't all flip simultaneously
  useEffect(() => {
    if (total <= 1 || !isVisible || !hasFinePointer || reducedMotion) return;

    const delay = 4200 + (idx % 4) * 400;
    const timer = setInterval(() => {
      if (!isInteracting.current) step(1);
    }, delay);

    return () => clearInterval(timer);
  }, [total, isVisible, hasFinePointer, reducedMotion, idx, step]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isInteracting.current = true;
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
    interactingTimer.current = setTimeout(() => { isInteracting.current = false; }, 2500);
  };

  return (
    <Link
      ref={cardRef}
      href={`/katalog/${room.slug}`}
      className={`${styles.card} ${isLead ? styles.cardLead : ''}`}
      aria-label={`${displayName} — Fotoğrafları ve Detayları Gör`}
      onMouseEnter={() => { isInteracting.current = true; }}
      onMouseLeave={() => { isInteracting.current = false; }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Image slider */}
      <div className={styles.imageWrap}>
        <div
          className={styles.cardSliderTrack}
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {photos.map((photoUrl, pIdx) => (
            <div key={photoUrl + pIdx} className={styles.cardSlideItem}>
              <Image
                {...imageProps(photoUrl)}
                alt={`${displayName} - fotoğraf ${pIdx + 1}`}
                fill
                priority={idx === 0 && pIdx === 0}
                loading={idx < 2 && pIdx < 2 ? 'eager' : 'lazy'}
                sizes={
                  isLead
                    ? '(max-width: 680px) 100vw, (max-width: 1024px) 100vw, 66vw'
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
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
              {total > 1 ? `${currentIndex + 1} / ${total}` : `${total} Fotoğraf`}
            </span>
          )}
        </div>

        {/* Navigation arrows — shown via CSS on hover/touch, no nested button-in-button issue
            since the outer element is a <Link> (anchor), not a <button> */}
        {total > 1 && (
          <>
            <span
              role="button"
              tabIndex={-1}
              className={`${styles.cardNavBtn} ${styles.cardPrevBtn}`}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); step(-1); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); step(-1); } }}
              aria-label="Önceki fotoğraf"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </span>
            <span
              role="button"
              tabIndex={-1}
              className={`${styles.cardNavBtn} ${styles.cardNextBtn}`}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); step(1); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); step(1); } }}
              aria-label="Sonraki fotoğraf"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </span>
          </>
        )}

        {/* Dot indicators */}
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

      {/* Card text */}
      <div className={styles.cardContent}>
        <span className={styles.categoryPill}>{categoryName}</span>
        <h3 className={styles.roomName}>{displayName}</h3>
        {room.descTr && <p className={styles.cardDesc}>{room.descTr}</p>}
        <div className={styles.cardFooter}>
          <span className={styles.exploreLink}>
            Fotoğraf Galerisini İncele
            <svg className={styles.arrowIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}
