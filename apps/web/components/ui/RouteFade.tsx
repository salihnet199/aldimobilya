'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * A minimal, safe page-transition effect: keying on the pathname forces
 * React to remount the wrapper on navigation, which re-triggers the CSS
 * entrance animation below. No dependency on the View Transitions API
 * (inconsistent browser support) and no interference with Next.js's own
 * routing/prefetching.
 */
export default function RouteFade({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="routeFade">
      {children}
    </div>
  );
}
