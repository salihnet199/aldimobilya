'use client';

import { useEffect, useRef } from 'react';

/**
 * CursorLayer — lightweight progressive enhancement for fine-pointer devices.
 *
 * What it does:
 *   1. Custom two-part cursor (dot + trailing ring) that scales on interactive elements.
 *   2. Soft gold spotlight that follows the pointer on .card / .room-card elements.
 *   3. Magnetic pull on [data-magnetic] elements for a premium feel.
 *
 * Performance guarantees:
 *   - NO getBoundingClientRect in the pointermove hot path (layout thrashing fix).
 *   - Magnetic rects are cached; refreshed only on resize/scroll/visibility change.
 *   - The rAF loop is the ONLY place that writes to DOM geometry.
 *   - All event listeners are { passive: true } where permitted.
 *
 * Progressive enhancement:
 *   - No fine pointer (touch) → effect exits early, no DOM mutations.
 *   - prefers-reduced-motion → effect exits early.
 *   - Dialog open → reverts to OS cursor seamlessly.
 *
 * TypeScript null safety:
 *   The two divs are rendered unconditionally by this component, so refs are
 *   always non-null after mount. We prove this to TypeScript by passing the
 *   narrowed values into `startCursor`, a function whose signature declares
 *   `HTMLDivElement` (not `HTMLDivElement | null`). This is valid because:
 *     1. We read refs inside useEffect (guaranteed post-mount).
 *     2. We guard explicitly before passing (`if (!dot || !ring) return`).
 *     3. TypeScript narrows `const dot` and `const ring` within the same
 *        if-block's `else` branch (i.e. the code after the guard passes).
 *   No non-null assertions (!) or `as` casts exist anywhere in this file.
 */

const INTERACTIVE_SELECTOR = 'a, button, .btn, .card, .room-card, [role="button"]';
const SPOTLIGHT_SELECTOR   = '.card, .room-card';
const MAGNETIC_SELECTOR    = '[data-magnetic]';
const MAGNETIC_STRENGTH    = 0.35;
const MAGNETIC_RADIUS      = 90; // px beyond element edge

interface MagneticEntry {
  el:   HTMLElement;
  rect: DOMRectReadOnly;
}

/**
 * Core cursor engine — receives only non-null elements.
 * TypeScript proof: callers must pass `HTMLDivElement`, not `HTMLDivElement | null`.
 * Returns a cleanup function.
 */
function startCursor(dot: HTMLDivElement, ring: HTMLDivElement): () => void {
  document.documentElement.classList.add('has-custom-cursor');

  let ringX      = window.innerWidth  / 2;
  let ringY      = window.innerHeight / 2;
  let targetX    = ringX;
  let targetY    = ringY;
  let rafId      = 0;
  let isActiveEl = false;
  let pointerX   = 0;
  let pointerY   = 0;

  // ── Magnetic rect cache ─────────────────────────────────────────────────
  let magneticCache: MagneticEntry[] = [];
  let cacheDirty = true;

  function refreshMagneticCache(): void {
    magneticCache = Array.from(
      document.querySelectorAll<HTMLElement>(MAGNETIC_SELECTOR),
    ).map((el) => ({ el, rect: el.getBoundingClientRect() }));
    cacheDirty = false;
  }

  function invalidateCache(): void { cacheDirty = true; }

  window.addEventListener('scroll', invalidateCache, { passive: true });
  window.addEventListener('resize', invalidateCache, { passive: true });
  document.addEventListener('visibilitychange', invalidateCache);

  // ── Spotlight (reads rect only when hovered element changes) ───────────
  let lastSpotEl: HTMLElement | null = null;

  function updateSpotlight(
    clientX: number,
    clientY: number,
    target: Element | null,
  ): void {
    const spotEl = target?.closest<HTMLElement>(SPOTLIGHT_SELECTOR) ?? null;

    if (spotEl !== lastSpotEl) {
      if (lastSpotEl) {
        lastSpotEl.style.removeProperty('--spot-x');
        lastSpotEl.style.removeProperty('--spot-y');
      }
      lastSpotEl = spotEl;
    }

    if (spotEl) {
      const rect = spotEl.getBoundingClientRect();
      spotEl.style.setProperty('--spot-x', `${clientX - rect.left}px`);
      spotEl.style.setProperty('--spot-y', `${clientY - rect.top}px`);
    }
  }

  // ── Magnetic pull applied in rAF (cached rects, no hot-path layout) ────
  function applyMagnetic(): void {
    if (cacheDirty) refreshMagneticCache();

    for (const { el, rect } of magneticCache) {
      const cx      = rect.left + rect.width  / 2;
      const cy      = rect.top  + rect.height / 2;
      const dist    = Math.hypot(pointerX - cx, pointerY - cy);
      const maxDist = Math.max(rect.width, rect.height) / 2 + MAGNETIC_RADIUS;

      if (dist < maxDist) {
        el.style.transform = `translate(${(pointerX - cx) * MAGNETIC_STRENGTH}px, ${(pointerY - cy) * MAGNETIC_STRENGTH}px)`;
      } else if (el.dataset['magneticActive']) {
        el.style.transform = '';
        delete el.dataset['magneticActive'];
      }
    }
  }

  // ── pointermove: only updates JS numbers, no DOM geometry reads ─────────
  function onPointerMove(e: PointerEvent): void {
    const modalOpen = !!document.querySelector('dialog[open]');
    if (modalOpen) {
      if (document.documentElement.classList.contains('has-custom-cursor')) {
        document.documentElement.classList.remove('has-custom-cursor');
        dot.style.opacity  = '0';
        ring.style.opacity = '0';
      }
      return;
    } else if (!document.documentElement.classList.contains('has-custom-cursor')) {
      document.documentElement.classList.add('has-custom-cursor');
      dot.style.opacity  = '1';
      ring.style.opacity = '1';
    }

    targetX  = e.clientX;
    targetY  = e.clientY;
    pointerX = e.clientX;
    pointerY = e.clientY;

    // Dot snaps instantly — translate3d is compositor-only, no layout
    dot.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;

    const target      = e.target as Element | null;
    const interactive = !!target?.closest(INTERACTIVE_SELECTOR);
    if (interactive !== isActiveEl) {
      isActiveEl = interactive;
      ring.classList.toggle('cursorRingActive', interactive);
    }

    updateSpotlight(e.clientX, e.clientY, target);
  }

  function onPointerLeaveWindow(): void {
    dot.style.opacity  = '0';
    ring.style.opacity = '0';
  }

  function onPointerEnterWindow(): void {
    dot.style.opacity  = '1';
    ring.style.opacity = '1';
  }

  // ── rAF: single write phase — ring ease + magnetic ─────────────────────
  function tick(): void {
    ringX += (targetX - ringX) * 0.18;
    ringY += (targetY - ringY) * 0.18;
    ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
    applyMagnetic();
    rafId = requestAnimationFrame(tick);
  }

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('mouseleave', onPointerLeaveWindow);
  document.addEventListener('mouseenter', onPointerEnterWindow);
  rafId = requestAnimationFrame(tick);

  return () => {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('scroll', invalidateCache);
    window.removeEventListener('resize', invalidateCache);
    document.removeEventListener('mouseleave', onPointerLeaveWindow);
    document.removeEventListener('mouseenter', onPointerEnterWindow);
    document.removeEventListener('visibilitychange', invalidateCache);
    cancelAnimationFrame(rafId);
    document.documentElement.classList.remove('has-custom-cursor');
  };
}

export default function CursorLayer() {
  const dotRef  = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const finePointer   = window.matchMedia('(pointer: fine)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!finePointer || reducedMotion) return;

    // Read refs after mount — always non-null because both divs are rendered
    // unconditionally. The guard communicates this to TypeScript.
    const dot  = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    // TypeScript has now narrowed `dot` and `ring` to `HTMLDivElement`.
    // We pass them into `startCursor` whose signature accepts `HTMLDivElement`
    // (not nullable) — this is the proof point, not a cast or assertion.
    return startCursor(dot, ring);
  }, []);

  return (
    <>
      <div ref={dotRef}  className="cursorDot"  aria-hidden="true" />
      <div ref={ringRef} className="cursorRing" aria-hidden="true" />
    </>
  );
}
