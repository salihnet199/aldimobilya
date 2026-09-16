/**
 * Public marketing-site URL helpers for the admin panel.
 *
 * The admin app runs on its own origin (e.g. `:3001`) while the customer-facing
 * site runs on `NEXT_PUBLIC_SITE_URL` (e.g. `:3000` or
 * `https://aldimobilya.com`). A root-relative href such as `"/"` therefore
 * resolves to the *admin* app, not the public site, so every "view on site"
 * link must be built from this module.
 *
 * The fallback origin mirrors `apps/web/lib/seo.ts` so both apps agree on the
 * production URL when the variable is missing.
 *
 * This module is dependency-free so it can be unit tested directly with the
 * Node test runner.
 */

export const DEFAULT_PUBLIC_SITE_URL = 'https://aldimobilya.com';

/**
 * Normalises a configured value into a bare http(s) origin.
 * Anything missing, relative or non-http(s) falls back to the production URL
 * rather than producing a broken link.
 */
export function resolvePublicSiteUrl(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_PUBLIC_SITE_URL;

  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_PUBLIC_SITE_URL;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return DEFAULT_PUBLIC_SITE_URL;
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return DEFAULT_PUBLIC_SITE_URL;
  }
  return parsed.origin;
}

/**
 * The configured public site origin.
 *
 * `process.env.NEXT_PUBLIC_SITE_URL` is a static member access so Next.js
 * inlines it into client bundles at build time.
 */
export function publicSiteUrl(): string {
  return resolvePublicSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
}

/** Joins a root-relative path onto the public site origin. */
export function publicSiteHref(path: string, site: string = publicSiteUrl()): string {
  const origin = resolvePublicSiteUrl(site);
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${suffix}`;
}

/**
 * DOM id used by the public `/medya` page for a video card.
 * Must stay in sync with the `<li id={...}>` rendered there.
 */
export function videoAnchorId(id: string): string {
  return `video-${id}`;
}

/** Deep link to a *published* video on the public `/medya` page. */
export function publicVideoHref(id: string, site: string = publicSiteUrl()): string {
  return `${publicSiteHref('/medya', site)}#${videoAnchorId(id)}`;
}

/** Deep link to a room on the public catalogue. */
export function publicRoomHref(slug: string, site: string = publicSiteUrl()): string {
  return publicSiteHref(`/katalog/${encodeURIComponent(slug)}`, site);
}
