import { cache } from 'react';
import { prisma } from '@aldimobilya/db';
import { normalizeHeroSettings, type HeroSlideshowSettings } from '@aldimobilya/types';

/**
 * Public, read-only view of the `site_settings` row (id = "main").
 *
 * The public site must never write to settings — updates happen exclusively
 * through the authenticated admin app. Reads are deduplicated per request via
 * `React.cache` and always fall back to safe, empty values when the database
 * is unavailable or the row has not been created yet.
 */
export interface PublicSiteSettings {
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  youtube: string | null;
  heroImage: string | null;
  heroVideo: string | null;
  heroImages: string[];
  heroSlideshow: HeroSlideshowSettings;
  heroTitleTr: string | null;
  heroSubtitleTr: string | null;
  metaDescTr: string | null;
}

function emptySettings(): PublicSiteSettings {
  return {
    whatsapp: null,
    phone: null,
    email: null,
    address: null,
    instagram: null,
    facebook: null,
    tiktok: null,
    youtube: null,
    heroImage: null,
    heroVideo: null,
    heroImages: [],
    heroSlideshow: normalizeHeroSettings(null),
    heroTitleTr: null,
    heroSubtitleTr: null,
    metaDescTr: null,
  };
}

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export const getSiteSettings = cache(async (): Promise<PublicSiteSettings> => {
  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'main' } });
    if (!settings) return emptySettings();
    const heroSlideshow = normalizeHeroSettings(settings.heroImages);

    return {
      whatsapp: clean(settings.whatsapp),
      phone: clean(settings.phone),
      email: clean(settings.email),
      address: clean(settings.address),
      instagram: clean(settings.instagram),
      facebook: clean(settings.facebook),
      tiktok: clean(settings.tiktok),
      youtube: clean(settings.youtube),
      heroImage: clean(settings.heroImage),
      heroVideo: clean(settings.heroVideo),
      heroImages: heroSlideshow.images,
      heroSlideshow,
      heroTitleTr: clean(settings.heroTitleTr),
      heroSubtitleTr: clean(settings.heroSubtitleTr),
      metaDescTr: clean(settings.metaDescTr),
    };
  } catch (err) {
    console.error('[getSiteSettings]', err);
    return emptySettings();
  }
});

/**
 * Normalizes a stored phone value into bare international digits.
 * Accepts raw numbers ("+90 555 111 22 33"), tel: values and full wa.me links.
 * Returns null when nothing usable is found.
 */
function normalizePhoneDigits(value?: string | null): string | null {
  if (!value) return null;
  const raw = value.trim();
  if (!raw) return null;

  // Prefer the number segment of an existing wa.me link so any digits inside
  // the prefilled message text are ignored.
  const waMatch = raw.match(/wa\.me\/([^/?#]+)/i);
  const candidate = waMatch ? waMatch[1] : raw;
  const digits = candidate.replace(/\D/g, '');

  // E.164 allows up to 15 digits; anything shorter than 8 is not a usable
  // international number and would silently fail on wa.me.
  if (digits.length < 8 || digits.length > 15 || digits === '905000000000') return null;
  return digits;
}

/**
 * Builds a WhatsApp deep link from a stored value.
 *
 * When the value is missing or does not contain a usable international number,
 * returns the internal contact page ("/iletisim") instead of a broken or
 * placeholder wa.me link.
 */
export function getWhatsAppHref(value?: string | null, message?: string): string {
  const digits = normalizePhoneDigits(value);
  if (!digits) return '/iletisim';

  const base = `https://wa.me/${digits}`;
  const text = message?.trim();
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

/**
 * Returns a clean Instagram handle (without "@") for display, or null.
 */
export function getInstagramHandle(value?: string | null): string | null {
  const href = getInstagramHref(value);
  if (!href) return null;
  const handle = href.replace(/^https:\/\/www\.instagram\.com\//, '').replace(/\/+$/, '');
  return handle || null;
}

/**
 * Normalizes a stored Instagram value (handle, "@handle" or profile URL) into a
 * safe https profile link. Returns null for anything that is not a valid
 * instagram.com URL, so callers can fall back to a safe internal link.
 */
export function getInstagramHref(value?: string | null): string | null {
  if (!value) return null;
  const raw = value.trim();
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
      const host = url.hostname.replace(/^www\./i, '').toLowerCase();
      if (host !== 'instagram.com') return null;
      const path = url.pathname.replace(/\/+$/, '');
      return `https://www.instagram.com${path}/`;
    } catch {
      return null;
    }
  }

  const handle = raw.replace(/^@/, '').replace(/[^A-Za-z0-9._]/g, '');
  if (!handle) return null;
  return `https://www.instagram.com/${handle}/`;
}
