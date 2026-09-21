'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type FocusEvent } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { imageProps } from '@/lib/media';
import { registerMotionObserver } from '@/lib/motion/motion-controller';
import styles from './HeroCarousel.module.css';

const DEFAULT_INTERVAL_MS = 6500;
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** 'auto' follows the admin autoplay flag; the others are explicit user intent. */
type PlaybackIntent = 'auto' | 'play' | 'pause';

function subscribeReducedMotion(onChange: () => void) {
  const media = window.matchMedia(REDUCED_MOTION_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

function getReducedMotion() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

interface HeroCarouselProps {
  images: string[];
  autoplay?: boolean;
  intervalMs?: number;
}

export default function HeroCarousel({
  images,
  autoplay = true,
  intervalMs = DEFAULT_INTERVAL_MS,
}: HeroCarouselProps) {
  const [active, setActive] = useState(0);
  const [intent, setIntent] = useState<PlaybackIntent>('auto');
  const [focusWithin, setFocusWithin] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    () => false,
  );

  const multiple = images.length > 1;
  const playing =
    intent === 'play' ? true : intent === 'pause' ? false : autoplay && !reducedMotion;
  const running = multiple && playing && !(focusWithin && intent !== 'play');

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    return registerMotionObserver(el);
  }, []);

  const step = useCallback((delta: number) => {
    setActive((prev) => (prev + delta + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      step(1);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [running, intervalMs, step]);

  const handleBlur = useCallback((event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setFocusWithin(false);
    }
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(dx) > 40) {
      step(dx > 0 ? 1 : -1);
    }
    touchStartX.current = null;
  };

  if (images.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className={styles.carousel}
      role="group"
      aria-roledescription="karusel"
      aria-label="Tanıtım görselleri"
      onFocus={() => setFocusWithin(true)}
      onBlur={handleBlur}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <AnimatePresence initial={false} mode="sync">
        <motion.div
          key={active}
          className={styles.slide}
          initial={
            reducedMotion
              ? { opacity: 0 }
              : { opacity: 0, scale: 1.05 }
          }
          animate={
            reducedMotion
              ? { opacity: 1 }
              : { opacity: 1, scale: 1 }
          }
          exit={
            reducedMotion
              ? { opacity: 0 }
              : { opacity: 0, scale: 0.97 }
          }
          transition={
            reducedMotion
              ? { duration: 0.3 }
              : {
                  opacity: { duration: 1.5, ease: [0.16, 1, 0.3, 1] },
                  scale: { duration: 2.4, ease: [0.16, 1, 0.3, 1] },
                }
          }
          role="group"
          aria-roledescription="slayt"
          aria-label={`${active + 1} / ${images.length}`}
        >
          <Image
            {...imageProps(images[active])}
            alt={active === 0 ? 'ALDi Mobilya — Lüks Koleksiyon' : `ALDi Mobilya Koleksiyon — ${active + 1}. görsel`}
            fill
            priority={active === 0}
            sizes="100vw"
            className={styles.heroImage}
          />
        </motion.div>
      </AnimatePresence>

      {multiple && (
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.toggle}
            onClick={() => setIntent(playing ? 'pause' : 'play')}
            aria-pressed={playing}
            aria-label={playing ? 'Slaytları duraklat' : 'Slaytları oynat'}
          >
            {playing ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <div className={styles.indicators}>
            {images.map((src, i) => (
              <button
                key={src + i}
                type="button"
                className={`${styles.indicator} ${i === active ? styles.indicatorActive : ''}`}
                onClick={() => setActive(i)}
                aria-label={`${i + 1}. görseli göster`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
