/**
 * ALDi Mobilya — Intelligent Responsive Image Delivery
 *
 * Architecture decision:
 *   Cloudinary images are delivered via a custom Next.js image loader.
 *   This means:
 *     - `unoptimized` is NEVER set for Cloudinary assets (so srcset works)
 *     - Next.js drives width/format selection via `sizes` on each <Image>
 *     - The loader appends Cloudinary transformations (f_auto, q_auto, w_<w>, c_limit)
 *     - Non-Cloudinary URLs (local, legacy hosts) pass through Next.js's built-in optimizer
 *
 *   Content managers upload the original asset at any resolution.
 *   The delivery system automatically selects the right size per device.
 *   No manual resizing is required.
 *
 * Breakpoints driven by Next.js + this loader (~devicePixelRatio aware):
 *   320, 480, 640, 768, 1024, 1280, 1440, 1600, 1920, 2560
 *   (configured in next.config.ts → images.deviceSizes / imageSizes)
 */

const CONTROL_CHARS = /[\u0000-\u001f\u007f\\<>"']/;

// ---------------------------------------------------------------------------
// Security helpers
// ---------------------------------------------------------------------------

/** Only safe browser media locations. Never proxy arbitrary hosts server-side. */
export function safeMediaHref(value: string | null | undefined): string | null {
  if (!value) return null;
  const raw = value.trim();
  if (!raw || raw.length > 2048 || CONTROL_CHARS.test(raw)) return null;
  if (raw.startsWith('/')) return raw.startsWith('//') ? null : raw;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

/** Returns true if this URL is a Cloudinary image asset. */
function isCloudinaryImage(url: string): boolean {
  return url.includes('res.cloudinary.com') && url.includes('/upload/');
}

/** Returns true if this URL is a Cloudinary video asset. */
function isCloudinaryVideo(url: string): boolean {
  return url.includes('res.cloudinary.com') && url.includes('/video/upload/');
}

// ---------------------------------------------------------------------------
// Cloudinary URL builder
// ---------------------------------------------------------------------------

/**
 * Builds a Cloudinary transformation URL that:
 *   - Respects the requested `width` (c_limit keeps aspect ratio, no upscaling)
 *   - Uses `f_auto` for browser-appropriate format (WebP / AVIF)
 *   - Uses `q_auto:good` for an excellent quality/size balance
 *   - Never double-transforms (skips if transforms are already present)
 *
 * We use `q_auto:good` (not `best`) to achieve high perceived quality while
 * keeping mobile payloads lean. For the hero and lightbox we could bump to
 * `q_auto:best`, but good is already visually indistinguishable at screen
 * resolution and saves 15-30% bandwidth.
 */
function buildCloudinaryUrl(raw: string, width: number): string {
  // If the URL already has explicit transforms injected, leave it untouched.
  if (raw.includes('/upload/f_auto') || raw.includes('/upload/q_')) {
    return raw;
  }
  return raw.replace('/upload/', `/upload/f_auto,q_auto:good,w_${width},c_limit/`);
}

/**
 * Cloudinary loader for Next.js <Image>.
 *
 * Next.js calls this with the `src` (plain Cloudinary URL, no transforms),
 * the desired `width` (from its internal breakpoint list), and `quality`.
 * We inject the Cloudinary width + format transforms here.
 *
 * Export so it can be referenced in component props:
 *   <Image loader={cloudinaryLoader} ...>
 */
export function cloudinaryLoader({
  src,
  width,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  // Guard: if somehow a non-Cloudinary URL slips through, return as-is.
  if (!isCloudinaryImage(src)) return src;
  return buildCloudinaryUrl(src, width);
}

// ---------------------------------------------------------------------------
// getOptimizedMediaUrl — for non-<Image> use cases (CSS bg, og:image, etc.)
// ---------------------------------------------------------------------------

/**
 * Returns a Cloudinary URL with explicit width/format transforms baked in.
 * Use this ONLY when you cannot use Next.js <Image> (e.g. CSS background,
 * Open Graph images, structured data URLs).
 *
 * For all <Image> usage, use `imageProps()` instead — it enables responsive
 * srcset via the custom loader.
 */
export function getOptimizedMediaUrl(
  value: string | null | undefined,
  width = 1600,
): string {
  const safe = safeMediaHref(value);
  if (!safe) return '/logo.jpg';
  if (isCloudinaryImage(safe) && !isCloudinaryVideo(safe)) {
    return buildCloudinaryUrl(safe, width);
  }
  return safe;
}

// ---------------------------------------------------------------------------
// imageProps — primary helper for <Image> components
// ---------------------------------------------------------------------------

/**
 * Returns props for Next.js <Image> with intelligent Cloudinary delivery.
 *
 * For Cloudinary images:
 *   - Uses the custom `cloudinaryLoader` so Next.js generates a proper srcset
 *     (320, 480, 640, 768, 1024, 1280, 1440, 1600, 1920, 2560)
 *   - `unoptimized` is false — srcset IS generated
 *   - `src` is the plain upload URL (no transforms); the loader injects them
 *
 * For non-Cloudinary URLs (legacy, local assets):
 *   - Falls through to Next.js built-in optimizer for local images
 *   - `unoptimized: true` for external non-Cloudinary hosts (unchanged behaviour)
 *
 * The `_hintWidth` parameter is kept for backward compatibility but no longer
 * controls the URL directly — width is now driven by Next.js + the loader.
 * It is only used for non-Cloudinary fallback paths.
 *
 * @param value      - Raw image URL from DB / props
 * @param _hintWidth - Legacy hint; ignored for Cloudinary, used for fallback
 */
export function imageProps(
  value: string,
  _hintWidth = 1600,
): {
  src: string;
  loader?: typeof cloudinaryLoader;
  unoptimized: boolean;
} {
  const raw = safeMediaHref(value) ?? '/logo.jpg';

  if (isCloudinaryImage(raw) && !isCloudinaryVideo(raw)) {
    // Strip any existing transforms from the URL so the loader starts clean.
    // Cloudinary stores the original at /upload/<public_id>, transforms go
    // after /upload/. If somehow transforms are already baked in, extract the
    // clean base URL.
    const cleanSrc = raw.includes('/upload/f_auto') || raw.includes('/upload/q_')
      ? raw.replace(/\/upload\/[^/]+\//, '/upload/')
      : raw;

    return {
      src: cleanSrc,
      loader: cloudinaryLoader,
      unoptimized: false, // ← srcset IS generated via the loader
    };
  }

  // Local assets: let Next.js handle optimization normally.
  if (raw.startsWith('/')) {
    return { src: raw, unoptimized: false };
  }

  // Non-Cloudinary external URL: deliver at hinted width, mark unoptimized.
  const optimized = getOptimizedMediaUrl(raw, _hintWidth);
  return { src: optimized, unoptimized: true };
}

// ---------------------------------------------------------------------------
// Thumbnail helper — small images for strip/grid usage
// ---------------------------------------------------------------------------

/**
 * Like imageProps but explicitly targets thumbnail-sized output.
 * Useful for thumbnail strips, admin previews, and catalog grid cards.
 * Forces a fixed small width for non-loader path; loader handles srcset normally.
 */
export function thumbnailProps(value: string): ReturnType<typeof imageProps> {
  return imageProps(value, 400);
}
