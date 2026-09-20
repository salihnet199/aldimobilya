'use client';

import React, { type ReactNode } from 'react';
import { useMotionObserver } from '@/lib/motion/motion-controller';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  staggerIndex?: number;
  as?: keyof React.JSX.IntrinsicElements;
}

/**
 * High-performance viewport reveal wrapper using the shared motion observer.
 * One-time entrance animation with capped stagger delay.
 */
export default function ScrollReveal({
  children,
  className = '',
  staggerIndex,
  as: Component = 'div',
}: ScrollRevealProps) {
  const { ref, isVisible } = useMotionObserver<HTMLDivElement>({ once: true });

  const staggerClass = staggerIndex
    ? `stagger-${Math.min(6, Math.max(1, staggerIndex))}`
    : '';

  const classes = `scroll-reveal ${staggerClass} ${className}`.trim();

  return React.createElement(
    Component,
    {
      ref,
      className: classes,
      'data-revealed': isVisible ? 'true' : 'false',
    },
    children,
  );
}
