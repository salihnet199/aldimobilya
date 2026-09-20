'use client';

import { useEffect, useRef, useState } from 'react';
import type { MotionPreset, MotionProfile } from './types';

// ---------------------------------------------------------------------------
// 1. Deterministic Motion Selection (Predictable & Hydration-Safe)
// ---------------------------------------------------------------------------

const HERO_SEQUENCE: MotionPreset[] = [
  'cinematicZoomIn',
  'panRight',
  'maskReveal',
  'cinematicZoomOut',
  'panLeft',
  'editorialReveal',
  'panUp',
  'focusPull',
];

const GALLERY_SEQUENCE: MotionPreset[] = [
  'galleryTransition',
  'focusPull',
  'scaleFade',
  'crossFade',
  'maskReveal',
  'directionalSlide',
];

const CARD_SEQUENCE: MotionPreset[] = [
  'cinematicZoomIn',
  'scaleFade',
  'imageDepth',
  'editorialReveal',
  'cinematicZoomOut',
  'blurReveal',
];

const EDITORIAL_SEQUENCE: MotionPreset[] = [
  'editorialReveal',
  'maskReveal',
  'verticalReveal',
  'horizontalReveal',
  'cinematicZoomIn',
  'scaleFade',
];

/**
 * Returns a stable, deterministic motion preset based on the item index and profile.
 * Never uses Math.random(), ensuring SSR and client hydration align 100%.
 */
export function getDeterministicPreset(
  index: number,
  profile: MotionProfile = 'luxury',
): MotionPreset {
  const safeIndex = Math.max(0, Math.floor(index));
  switch (profile) {
    case 'hero':
      return HERO_SEQUENCE[safeIndex % HERO_SEQUENCE.length];
    case 'gallery':
      return GALLERY_SEQUENCE[safeIndex % GALLERY_SEQUENCE.length];
    case 'subtle':
    case 'luxury':
      return CARD_SEQUENCE[safeIndex % CARD_SEQUENCE.length];
    case 'editorial':
      return EDITORIAL_SEQUENCE[safeIndex % EDITORIAL_SEQUENCE.length];
    case 'cinematic':
    default:
      return safeIndex % 2 === 0 ? 'cinematicZoomIn' : 'cinematicZoomOut';
  }
}

/**
 * Maps a MotionPreset identifier to its corresponding utility class.
 */
export function getPresetClassName(preset: MotionPreset): string {
  switch (preset) {
    case 'cinematicZoomIn':
      return 'motion-cinematic-zoom-in';
    case 'cinematicZoomOut':
      return 'motion-cinematic-zoom-out';
    case 'panLeft':
      return 'motion-pan-left';
    case 'panRight':
      return 'motion-pan-right';
    case 'panUp':
      return 'motion-pan-up';
    case 'panDown':
      return 'motion-pan-down';
    case 'crossFade':
      return 'motion-cross-fade';
    case 'directionalSlide':
      return 'motion-slide-left';
    case 'blurReveal':
      return 'motion-blur-reveal';
    case 'maskReveal':
      return 'motion-mask-reveal';
    case 'verticalReveal':
      return 'motion-vertical-reveal';
    case 'horizontalReveal':
      return 'motion-horizontal-reveal';
    case 'scaleFade':
      return 'motion-scale-fade';
    case 'parallaxSubtle':
    case 'layeredParallax':
    case 'imageDepth':
      return 'motion-image-depth';
    case 'focusPull':
      return 'motion-focus-pull';
    case 'editorialReveal':
      return 'motion-editorial-reveal';
    case 'galleryTransition':
      return 'motion-gallery-transition';
    case 'heroCinematicMotion':
      return 'motion-hero-velvet-a';
    default:
      return 'motion-cross-fade';
  }
}

// ---------------------------------------------------------------------------
// 2. Shared Singleton Viewport IntersectionObserver
// ---------------------------------------------------------------------------

type ObserverCallback = (isIntersecting: boolean, entry: IntersectionObserverEntry) => void;

class MotionScheduler {
  private observer: IntersectionObserver | null = null;
  private callbacks = new WeakMap<Element, ObserverCallback>();

  private getObserver(): IntersectionObserver | null {
    if (typeof window === 'undefined') return null;
    if (!this.observer) {
      this.observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const cb = this.callbacks.get(entry.target);
            if (cb) {
              cb(entry.isIntersecting, entry);
            }
            // Automatically pause/resume CSS animations by setting data-motion-active
            entry.target.setAttribute(
              'data-motion-active',
              entry.isIntersecting ? 'true' : 'false',
            );
          }
        },
        {
          root: null,
          rootMargin: '100px 0px 100px 0px', // Pre-activate slightly before entering viewport
          threshold: [0, 0.15],
        },
      );
    }
    return this.observer;
  }

  observe(element: Element, callback: ObserverCallback) {
    const obs = this.getObserver();
    if (!obs) return () => {};

    this.callbacks.set(element, callback);
    obs.observe(element);

    return () => {
      this.callbacks.delete(element);
      obs.unobserve(element);
    };
  }
}

const schedulerInstance = new MotionScheduler();

/**
 * Attaches an element to the central shared observer.
 * Automatically toggles `data-motion-active` to eliminate offscreen GPU load.
 */
export function registerMotionObserver(
  element: HTMLElement,
  onIntersect?: (visible: boolean) => void,
): () => void {
  return schedulerInstance.observe(element, (isIntersecting) => {
    onIntersect?.(isIntersecting);
  });
}

/**
 * React hook that uses the shared observer for viewport-aware animations.
 */
export function useMotionObserver<T extends HTMLElement = HTMLDivElement>(options?: {
  once?: boolean;
}) {
  const ref = useRef<T | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const unobserve = registerMotionObserver(el, (visible) => {
      setIsVisible(visible);
      if (visible && options?.once) {
        unobserve();
      }
    });

    return unobserve;
  }, [options?.once]);

  return { ref, isVisible };
}
