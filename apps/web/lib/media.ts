const CONTROL_CHARS = /[\u0000-\u001f\u007f\\<>"']/;

/** Only safe browser media locations. Never proxy arbitrary hosts server-side. */
export function safeMediaHref(value: string | null | undefined): string | null {
  if (!value) return null;
  const raw = value.trim();
  if (!raw || raw.length > 2048 || CONTROL_CHARS.test(raw)) return null;
  if (raw.startsWith('/')) return raw.startsWith('//') ? null : raw;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

/**
 * Ensures Cloudinary delivers Ultra-HD, visually lossless, crisp imagery
 * with modern f_auto (WebP/AVIF) and visually perception-tuned q_auto:best.
 */
export function getOptimizedMediaUrl(value: string | null | undefined, width = 1600): string {
  const safe = safeMediaHref(value);
  if (!safe) return '/logo.jpg';
  if (safe.includes('res.cloudinary.com') && safe.includes('/upload/')) {
    if (!safe.includes('/upload/f_auto') && !safe.includes('/upload/q_')) {
      return safe.replace('/upload/', `/upload/f_auto,q_auto:best,w_${width},c_limit/`);
    }
  }
  return safe;
}

/**
 * Returns optimized image props for Next.js Image component.
 * Cloudinary transforms provide superior CDN compression and crisp sharpness.
 */
export function imageProps(value: string, width = 1600): { src: string; unoptimized: boolean } {
  const raw = safeMediaHref(value) ?? '/logo.jpg';
  const src = getOptimizedMediaUrl(raw, width);
  const isCloudinary = src.includes('res.cloudinary.com');
  // Avoid Next.js server-side double-compression for Cloudinary URLs
  return { src, unoptimized: isCloudinary || !src.startsWith('/') };
}

