'use client';

import { useEffect, useRef } from 'react';

/**
 * A single, lightweight, globally-mounted interaction layer:
 *
 * 1. A custom two-part cursor (dot + trailing ring) that scales up over
 *    links, buttons, and cards — the kind of signature touch used by
 *    high-end brand sites.
 * 2. A soft gold spotlight that follows the pointer across `.card` /
 *    `.room-card` elements on hover.
 *
 * Both are pure progressive enhancement: if the device has no fine
 * pointer (touch), or the user has requested reduced motion, this
 * component does nothing and renders nothing.
 */
export default function CursorLayer() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(false);

  useEffect(() => {
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!finePointer || reducedMotion) return;

    document.documentElement.classList.add('has-custom-cursor');

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let ringX = window.innerWidth / 2;
    let ringY = window.innerHeight / 2;
    let targetX = ringX;
    let targetY = ringY;
    let rafId = 0;

    const INTERACTIVE_SELECTOR = 'a, button, .btn, .card, .room-card, [role="button"]';
    const SPOTLIGHT_SELECTOR = '.card, .room-card';
    const MAGNETIC_RADIUS = 90; // px beyond which the pull effect fades out
    const MAGNETIC_STRENGTH = 0.35; // fraction of offset actually applied

    function updateMagnetic(clientX: number, clientY: number) {
      document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dist = Math.hypot(clientX - cx, clientY - cy);
        const maxDist = Math.max(rect.width, rect.height) / 2 + MAGNETIC_RADIUS;

        if (dist < maxDist) {
          const pullX = (clientX - cx) * MAGNETIC_STRENGTH;
          const pullY = (clientY - cy) * MAGNETIC_STRENGTH;
          el.style.transform = `translate(${pullX}px, ${pullY}px)`;
        } else if (el.style.transform) {
          el.style.transform = '';
        }
      });
    }

    function onPointerMove(e: PointerEvent) {
      targetX = e.clientX;
      targetY = e.clientY;
      dot!.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;

      const target = e.target as Element | null;
      const isInteractive = !!target?.closest(INTERACTIVE_SELECTOR);
      if (isInteractive !== activeRef.current) {
        activeRef.current = isInteractive;
        ring!.classList.toggle('cursorRingActive', isInteractive);
      }

      const spotlightEl = target?.closest(SPOTLIGHT_SELECTOR) as HTMLElement | null;
      if (spotlightEl) {
        const rect = spotlightEl.getBoundingClientRect();
        spotlightEl.style.setProperty('--spot-x', `${e.clientX - rect.left}px`);
        spotlightEl.style.setProperty('--spot-y', `${e.clientY - rect.top}px`);
      }

      updateMagnetic(e.clientX, e.clientY);
    }

    function onPointerLeaveWindow() {
      dot!.style.opacity = '0';
      ring!.style.opacity = '0';
    }
    function onPointerEnterWindow() {
      dot!.style.opacity = '1';
      ring!.style.opacity = '1';
    }

    // Ring trails the pointer with gentle easing for a fluid feel.
    function tick() {
      ringX += (targetX - ringX) * 0.18;
      ringY += (targetY - ringY) * 0.18;
      ring!.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
      rafId = requestAnimationFrame(tick);
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('mouseleave', onPointerLeaveWindow);
    document.addEventListener('mouseenter', onPointerEnterWindow);
    rafId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('mouseleave', onPointerLeaveWindow);
      document.removeEventListener('mouseenter', onPointerEnterWindow);
      cancelAnimationFrame(rafId);
      document.documentElement.classList.remove('has-custom-cursor');
    };
  }, []);

  return (
    <>
      <div ref={dotRef} className="cursorDot" aria-hidden="true" />
      <div ref={ringRef} className="cursorRing" aria-hidden="true" />
    </>
  );
}
