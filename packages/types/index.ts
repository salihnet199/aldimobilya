// ALDi Mobilya - Shared Types

export interface Room {
  id: string;
  slug: string;
  nameTr: string;
  nameEn?: string;
  descTr?: string;
  descEn?: string;
  specs?: RoomSpecs;
  isVisible: boolean;
  isFeatured: boolean;
  heroImage: string;
  images: RoomImage[];
  video?: string;
  category?: string;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoomImage {
  id: string;
  url: string;
  alt?: string;
  order: number;
  roomId: string;
}

export interface RoomSpecs {
  material?: string;
  dimensions?: string;
  colors?: string[];
  style?: string;
  warranty?: string;
  [key: string]: string | string[] | undefined;
}

export interface Video {
  id: string;
  title: string;
  url: string;
  thumbnail?: string;
  isPublic: boolean;
  viewCount: number;
  createdAt: Date;
}

/**
 * Homepage hero slideshow contract.
 *
 * Stored as JSON in `SiteSettings.heroImages`, so the persisted value may be
 * either the legacy `string[]` shape or this object shape. Always run persisted
 * values through `normalizeHeroSettings` before consuming them.
 */
export interface HeroSlideshowSettings {
  images: string[];
  autoplay: boolean;
  intervalMs: number;
}

export const HERO_SLIDESHOW_MAX_IMAGES = 8;
export const HERO_SLIDESHOW_DEFAULT_INTERVAL_MS = 6500;
export const HERO_SLIDESHOW_MIN_INTERVAL_MS = 3000;
export const HERO_SLIDESHOW_MAX_INTERVAL_MS = 15000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toImageList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const images: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const url = item.trim();
    if (!url) continue;
    images.push(url);
    if (images.length >= HERO_SLIDESHOW_MAX_IMAGES) break;
  }
  return images;
}

function toIntervalMs(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return HERO_SLIDESHOW_DEFAULT_INTERVAL_MS;
  }
  const rounded = Math.round(value);
  return Math.min(
    HERO_SLIDESHOW_MAX_INTERVAL_MS,
    Math.max(HERO_SLIDESHOW_MIN_INTERVAL_MS, rounded),
  );
}

/**
 * Normalizes any persisted/incoming hero value into a complete slideshow
 * settings object. Legacy `string[]` values keep working: they become an
 * autoplaying slideshow at the default interval.
 */
export function normalizeHeroSettings(value: unknown): HeroSlideshowSettings {
  if (Array.isArray(value)) {
    return {
      images: toImageList(value),
      autoplay: true,
      intervalMs: HERO_SLIDESHOW_DEFAULT_INTERVAL_MS,
    };
  }

  if (isRecord(value)) {
    return {
      images: toImageList(value.images),
      autoplay: typeof value.autoplay === 'boolean' ? value.autoplay : true,
      intervalMs: toIntervalMs(value.intervalMs),
    };
  }

  return {
    images: [],
    autoplay: true,
    intervalMs: HERO_SLIDESHOW_DEFAULT_INTERVAL_MS,
  };
}

export interface SiteSettings {
  id: string;
  whatsapp?: string;
  phone?: string;
  email?: string;
  address?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  youtube?: string;
  heroImage?: string;
  heroVideo?: string;
  /** Legacy `string[]` or the richer slideshow object; normalize before use. */
  heroImages?: string[] | HeroSlideshowSettings;
  heroTitleTr?: string;
  heroSubtitleTr?: string;
  metaDescTr?: string;
  elfSightCode?: string;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'EDITOR';
  createdAt: Date;
}
