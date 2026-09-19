'use client';

import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
  type FocusEvent,
} from 'react';
import Image from 'next/image';
import { imageProps } from '@/lib/media';
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
    if (!running) return;
    const id = window.setInterval(() => {
      setActive((prev) => (prev + 1) % images.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [running, images.length, intervalMs]);

  const handleBlur = useCallback((event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setFocusWithin(false);
    }
  }, []);

  if (images.length === 0) return null;

  return (
    <div
      className={styles.carousel}
      role="group"
      aria-roledescription="karusel"
      aria-label="Tanıtım görselleri"
      onFocus={() => setFocusWithin(true)}
      onBlur={handleBlur}
    >
      {images.map((src, i) => {
        const isActive = i === active;
        return (
          <div
            key={src + i}
            className={`${styles.slide} ${isActive ? styles.slideActive : ''}`}
          >
            {/* Seamless deep background canvas extending edge-to-edge */}
            <div className={styles.bgCanvas} aria-hidden="true">
              <Image
                {...imageProps(src, 1600)}
                alt=""
                fill
                sizes="100vw"
                className={styles.bgCanvasImg}
              />
            </div>

            {/* Seamless Centerpiece: 100% full uncropped furniture with soft feather edge */}
            <div className={styles.centerpiece}>
              <Image
                {...imageProps(src, 2400)}
                alt="ALDi Mobilya Özel Koleksiyon"
                fill
                priority={i === 0}
                loading={i === 0 ? undefined : 'lazy'}
                sizes="100vw"
                className={`${styles.centerpieceImg} ${isActive ? (i % 2 === 0 ? styles.cinematicA : styles.cinematicB) : ''}`}
              />
            </div>
          </div>
        );
      })}

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
