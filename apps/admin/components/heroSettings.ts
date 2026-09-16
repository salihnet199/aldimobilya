/**
 * Hero slideshow settings contract for `SiteSettings.heroImages`.
 *
 * Stored shape:  { images: string[]; autoplay: boolean; intervalMs: number }
 * Legacy shape:  string[]  — a bare ordered list of image URLs, still accepted.
 *
 * This mirrors `HeroSlideshowSettings` / `normalizeHeroSettings` as exported by
 * `@aldimobilya/types`. It is duplicated here because the admin app does not
 * depend on the shared types package yet; swap the import once it does.
 */

export interface HeroSlideshowSettings {
  images: string[];
  autoplay: boolean;
  intervalMs: number;
}

export const HERO_MAX_IMAGES = 8;
export const HERO_INTERVAL_MIN_SECONDS = 3;
export const HERO_INTERVAL_MAX_SECONDS = 15;
/** Matches HERO_SLIDESHOW_DEFAULT_INTERVAL_MS in the shared types / API validation. */
export const HERO_INTERVAL_DEFAULT_SECONDS = 6.5;

export const HERO_INTERVAL_MIN_MS = HERO_INTERVAL_MIN_SECONDS * 1000;
export const HERO_INTERVAL_MAX_MS = HERO_INTERVAL_MAX_SECONDS * 1000;
export const HERO_INTERVAL_DEFAULT_MS = HERO_INTERVAL_DEFAULT_SECONDS * 1000;

function isUsableUrl(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Clamps any incoming value into the supported 3–15 second window. */
export function clampHeroInterval(value: unknown): number {
  const ms = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(ms)) return HERO_INTERVAL_DEFAULT_MS;
  return Math.min(HERO_INTERVAL_MAX_MS, Math.max(HERO_INTERVAL_MIN_MS, Math.round(ms)));
}

/** Accepts the legacy `string[]` payload or the current object payload. */
export function normalizeHeroSettings(raw: unknown): HeroSlideshowSettings {
  if (Array.isArray(raw)) {
    return {
      images: raw.filter(isUsableUrl).slice(0, HERO_MAX_IMAGES),
      autoplay: true,
      intervalMs: HERO_INTERVAL_DEFAULT_MS,
    };
  }

  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    return {
      images: (Array.isArray(obj.images) ? obj.images.filter(isUsableUrl) : []).slice(0, HERO_MAX_IMAGES),
      autoplay: typeof obj.autoplay === 'boolean' ? obj.autoplay : true,
      intervalMs: clampHeroInterval(obj.intervalMs),
    };
  }

  return { images: [], autoplay: true, intervalMs: HERO_INTERVAL_DEFAULT_MS };
}

/** Serialises editor state back into the object payload that gets persisted. */
export function toHeroSettingsPayload(settings: HeroSlideshowSettings): HeroSlideshowSettings {
  return {
    images: settings.images.filter(isUsableUrl).slice(0, HERO_MAX_IMAGES),
    autoplay: settings.autoplay,
    intervalMs: clampHeroInterval(settings.intervalMs),
  };
}
