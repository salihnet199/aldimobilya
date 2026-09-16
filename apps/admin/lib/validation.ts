/**
 * Request payload validation for the admin API.
 *
 * This module is intentionally dependency-free (no Next.js / Prisma imports) so
 * it can be unit tested directly with the Node test runner. Every validator is
 * total: it never throws on hostile input, it returns a discriminated result.
 */

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Limits
// ---------------------------------------------------------------------------

export const MAX_ROOM_IMAGES = 50;
export const MAX_SPEC_KEYS = 40;
export const MAX_SPEC_LIST_ITEMS = 25;
export const MAX_SHORT_TEXT = 200;
export const MAX_LONG_TEXT = 5000;
export const MAX_URL_LENGTH = 2048;

export const HERO_SLIDESHOW_MAX_IMAGES = 8;
export const HERO_SLIDESHOW_DEFAULT_INTERVAL_MS = 6500;
export const HERO_SLIDESHOW_MIN_INTERVAL_MS = 3000;
export const HERO_SLIDESHOW_MAX_INTERVAL_MS = 15000;

/** Folder prefixes the signed-upload endpoint is allowed to sign for. */
export const ALLOWED_UPLOAD_FOLDERS = [
  'aldimobilya/rooms',
  'aldimobilya/hero',
  'aldimobilya/videos',
  'aldimobilya/videos/thumbnails',
] as const;

export const DEFAULT_UPLOAD_FOLDER = 'aldimobilya/rooms';

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EMBED_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const SOCIAL_HANDLE_PATTERN = /^[A-Za-z0-9._@-]{1,200}$/;
const CONTROL_OR_TAG_CHARS = /[\u0000-\u001f\u007f<>"']/;

/**
 * Accepts only `https://` absolute URLs or root-relative paths.
 * Rejects `javascript:`, `data:`, `vbscript:`, plain `http:`, protocol-relative
 * `//host` URLs, backslash smuggling and control characters.
 */
export function isSafeMediaUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;

  const url = value.trim();
  if (!url || url.length > MAX_URL_LENGTH) return false;
  if (CONTROL_OR_TAG_CHARS.test(url)) return false;

  // Root-relative path (but not protocol-relative or backslash smuggling).
  if (url.startsWith('/')) {
    return !url.startsWith('//') && !url.startsWith('/\\');
  }

  if (url.includes('\\')) return false;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  return parsed.protocol === 'https:' && parsed.hostname.length > 0;
}

/** Optional free-text field: trimmed, length bounded, no control chars or tags. */
export function optionalText(
  value: unknown,
  maxLength = MAX_SHORT_TEXT,
): ValidationResult<string | undefined> {
  if (value === undefined || value === null) return { ok: true, value: undefined };
  if (typeof value !== 'string') return { ok: false, error: 'Geçersiz metin değeri.' };

  const text = value.trim();
  if (!text) return { ok: true, value: undefined };
  if (text.length > maxLength) {
    return { ok: false, error: `Metin en fazla ${maxLength} karakter olabilir.` };
  }
  if (CONTROL_OR_TAG_CHARS.test(text)) {
    return { ok: false, error: 'Metin geçersiz karakterler içeriyor.' };
  }
  return { ok: true, value: text };
}

/** Optional boolean field. Rejects string/number lookalikes ("bounds booleans"). */
export function optionalBoolean(
  value: unknown,
  fallback: boolean,
): ValidationResult<boolean> {
  if (value === undefined || value === null) return { ok: true, value: fallback };
  if (typeof value !== 'boolean') {
    return { ok: false, error: 'Boole alanı yalnızca true veya false olabilir.' };
  }
  return { ok: true, value };
}

export function optionalSafeUrl(
  value: unknown,
  fieldLabel = 'URL',
): ValidationResult<string | undefined> {
  if (value === undefined || value === null) return { ok: true, value: undefined };
  if (typeof value !== 'string' || !value.trim()) return { ok: true, value: undefined };
  if (!isSafeMediaUrl(value)) {
    return {
      ok: false,
      error: `${fieldLabel} geçersiz. Yalnızca https:// adresleri veya kök-göreli yollar (/...) kullanılabilir.`,
    };
  }
  return { ok: true, value: value.trim() };
}

/** Social fields accept an https URL, a root-relative path, or a bare handle. */
export function optionalSocialValue(
  value: unknown,
): ValidationResult<string | undefined> {
  if (value === undefined || value === null) return { ok: true, value: undefined };
  if (typeof value !== 'string') return { ok: false, error: 'Geçersiz sosyal medya değeri.' };

  const text = value.trim();
  if (!text) return { ok: true, value: undefined };
  if (CONTROL_OR_TAG_CHARS.test(text)) {
    return { ok: false, error: 'Sosyal medya değeri geçersiz karakterler içeriyor.' };
  }
  if (text.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(text)) {
    if (!isSafeMediaUrl(text)) {
      return { ok: false, error: 'Sosyal medya bağlantısı geçersiz (yalnızca https).' };
    }
    return { ok: true, value: text };
  }
  if (!SOCIAL_HANDLE_PATTERN.test(text)) {
    return { ok: false, error: 'Sosyal medya kullanıcı adı geçersiz.' };
  }
  return { ok: true, value: text };
}

/** ElfSight widget App ID — a bounded, tag-free identifier, never raw markup. */
export function optionalEmbedId(value: unknown): ValidationResult<string | undefined> {
  if (value === undefined || value === null) return { ok: true, value: undefined };
  if (typeof value !== 'string') return { ok: false, error: 'Widget kimliği geçersiz.' };

  const text = value.trim();
  if (!text) return { ok: true, value: undefined };
  if (!EMBED_ID_PATTERN.test(text)) {
    return {
      ok: false,
      error: 'Widget kimliği geçersiz. Yalnızca harf, rakam, "-" ve "_" kullanılabilir.',
    };
  }
  return { ok: true, value: text };
}

// ---------------------------------------------------------------------------
// Hero slideshow
// ---------------------------------------------------------------------------

export interface HeroSlideshowSettings {
  images: string[];
  autoplay: boolean;
  intervalMs: number;
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
  return Math.min(
    HERO_SLIDESHOW_MAX_INTERVAL_MS,
    Math.max(HERO_SLIDESHOW_MIN_INTERVAL_MS, Math.round(value)),
  );
}

/**
 * Shape-only normalization (legacy `string[]` supported, values clamped).
 * Mirrors `normalizeHeroSettings` in `@aldimobilya/types`. Used when reading
 * persisted JSON, where hostile URLs have already been rejected at write time.
 */
export function normalizeHeroSettings(value: unknown): HeroSlideshowSettings {
  if (Array.isArray(value)) {
    return {
      images: toImageList(value),
      autoplay: true,
      intervalMs: HERO_SLIDESHOW_DEFAULT_INTERVAL_MS,
    };
  }

  if (isPlainObject(value)) {
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

/**
 * Validates an incoming hero payload. Accepts the legacy `string[]` shape as
 * well as `{ images, autoplay, intervalMs }`, rejecting unsafe URLs, more than
 * 8 images and out-of-range intervals.
 */
export function validateHeroSlideshowInput(
  value: unknown,
): ValidationResult<HeroSlideshowSettings> {
  // Legacy shape: a bare array of image URLs.
  if (Array.isArray(value)) {
    const legacyImages = validateHeroImages(value);
    if (!legacyImages.ok) return legacyImages;
    return {
      ok: true,
      value: {
        images: legacyImages.value,
        autoplay: true,
        intervalMs: HERO_SLIDESHOW_DEFAULT_INTERVAL_MS,
      },
    };
  }

  if (!isPlainObject(value)) {
    return { ok: false, error: 'Hero görselleri dizi veya nesne olmalıdır.' };
  }

  const imagesResult = validateHeroImages(value.images);
  if (!imagesResult.ok) return imagesResult;

  let autoplay = true;
  if (value.autoplay !== undefined) {
    if (typeof value.autoplay !== 'boolean') {
      return { ok: false, error: 'autoplay yalnızca true veya false olabilir.' };
    }
    autoplay = value.autoplay;
  }

  let intervalMs = HERO_SLIDESHOW_DEFAULT_INTERVAL_MS;
  if (value.intervalMs !== undefined && value.intervalMs !== null) {
    if (
      typeof value.intervalMs !== 'number' ||
      !Number.isFinite(value.intervalMs)
    ) {
      return { ok: false, error: 'intervalMs sayı olmalıdır.' };
    }
    if (
      value.intervalMs < HERO_SLIDESHOW_MIN_INTERVAL_MS ||
      value.intervalMs > HERO_SLIDESHOW_MAX_INTERVAL_MS
    ) {
      return {
        ok: false,
        error: `intervalMs ${HERO_SLIDESHOW_MIN_INTERVAL_MS} ile ${HERO_SLIDESHOW_MAX_INTERVAL_MS} arasında olmalıdır.`,
      };
    }
    intervalMs = Math.round(value.intervalMs);
  }

  return {
    ok: true,
    value: { images: imagesResult.value, autoplay, intervalMs },
  };
}

function validateHeroImages(value: unknown): ValidationResult<string[]> {
  if (value === undefined || value === null) return { ok: true, value: [] };
  if (!Array.isArray(value)) {
    return { ok: false, error: 'Hero görselleri bir dizi olmalıdır.' };
  }
  if (value.length > HERO_SLIDESHOW_MAX_IMAGES) {
    return {
      ok: false,
      error: `En fazla ${HERO_SLIDESHOW_MAX_IMAGES} hero görseli eklenebilir.`,
    };
  }

  const images: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string' || !item.trim()) continue;
    if (!isSafeMediaUrl(item)) {
      return {
        ok: false,
        error: 'Hero görsel adresi geçersiz. Yalnızca https:// adresleri veya kök-göreli yollar (/...) kullanılabilir.',
      };
    }
    images.push(item.trim());
  }
  return { ok: true, value: images };
}

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

export interface RoomImageInput {
  url: string;
  alt?: string;
}

export interface RoomWriteInput {
  slug: string;
  nameTr: string;
  nameEn?: string;
  descTr?: string;
  descEn?: string;
  category?: string;
  heroImage: string;
  images: RoomImageInput[];
  video?: string;
  isVisible: boolean;
  isFeatured: boolean;
  specs?: Record<string, string | string[]>;
}

function validateSlug(value: unknown): ValidationResult<string> {
  if (typeof value !== 'string') return { ok: false, error: 'slug zorunludur.' };
  const slug = value.trim();
  if (!slug) return { ok: false, error: 'slug zorunludur.' };
  if (slug.length > 120 || !SLUG_PATTERN.test(slug)) {
    return {
      ok: false,
      error:
        'slug yalnızca küçük harf, rakam ve tire içerebilir (örn. "elegance-yatak-odasi").',
    };
  }
  return { ok: true, value: slug };
}

function validateRoomImages(value: unknown): ValidationResult<RoomImageInput[]> {
  if (value === undefined || value === null) return { ok: true, value: [] };
  if (!Array.isArray(value)) {
    return { ok: false, error: 'images bir dizi olmalıdır.' };
  }
  if (value.length > MAX_ROOM_IMAGES) {
    return { ok: false, error: `En fazla ${MAX_ROOM_IMAGES} görsel eklenebilir.` };
  }

  const images: RoomImageInput[] = [];
  for (const item of value) {
    if (!isPlainObject(item)) {
      return { ok: false, error: 'Her görsel bir nesne olmalıdır ({ url, alt }).' };
    }
    if (!isSafeMediaUrl(item.url)) {
      return {
        ok: false,
        error: 'Görsel adresi geçersiz. Yalnızca https:// adresleri veya kök-göreli yollar (/...) kullanılabilir.',
      };
    }
    const alt = optionalText(item.alt, MAX_SHORT_TEXT);
    if (!alt.ok) return alt;

    images.push({
      url: (item.url as string).trim(),
      ...(alt.value ? { alt: alt.value } : {}),
    });
  }
  return { ok: true, value: images };
}

function validateSpecs(
  value: unknown,
): ValidationResult<Record<string, string | string[]> | undefined> {
  if (value === undefined || value === null) return { ok: true, value: undefined };
  if (!isPlainObject(value)) {
    return { ok: false, error: 'specs bir nesne olmalıdır.' };
  }

  const keys = Object.keys(value);
  if (keys.length > MAX_SPEC_KEYS) {
    return { ok: false, error: `En fazla ${MAX_SPEC_KEYS} özellik tanımlanabilir.` };
  }

  const specs: Record<string, string | string[]> = {};
  for (const key of keys) {
    if (!key.trim() || key.length > MAX_SHORT_TEXT) {
      return { ok: false, error: 'Özellik adı geçersiz.' };
    }
    const raw = value[key];

    if (typeof raw === 'string') {
      const text = optionalText(raw, MAX_SHORT_TEXT);
      if (!text.ok) return text;
      if (text.value) specs[key] = text.value;
      continue;
    }

    if (Array.isArray(raw)) {
      if (raw.length > MAX_SPEC_LIST_ITEMS) {
        return {
          ok: false,
          error: `Özellik listeleri en fazla ${MAX_SPEC_LIST_ITEMS} öğe içerebilir.`,
        };
      }
      const items: string[] = [];
      for (const entry of raw) {
        if (typeof entry !== 'string') {
          return { ok: false, error: 'Özellik listesi yalnızca metin içerebilir.' };
        }
        const text = optionalText(entry, MAX_SHORT_TEXT);
        if (!text.ok) return text;
        if (text.value) items.push(text.value);
      }
      if (items.length) specs[key] = items;
      continue;
    }

    if (raw === undefined || raw === null) continue;

    return { ok: false, error: 'Özellik değerleri metin veya metin listesi olmalıdır.' };
  }

  return { ok: true, value: Object.keys(specs).length ? specs : undefined };
}

export function validateRoomCreate(body: unknown): ValidationResult<RoomWriteInput> {
  if (!isPlainObject(body)) {
    return { ok: false, error: 'Geçersiz istek gövdesi.' };
  }

  const slug = validateSlug(body.slug);
  if (!slug.ok) return slug;

  const nameTr = optionalText(body.nameTr, MAX_SHORT_TEXT);
  if (!nameTr.ok) return nameTr;
  const nameEn = optionalText(body.nameEn, MAX_SHORT_TEXT);
  if (!nameEn.ok) return nameEn;

  // Turkish name is the canonical display name, English is the fallback.
  const finalNameTr = nameTr.value ?? nameEn.value;
  const finalNameEn = nameEn.value ?? nameTr.value;
  if (!finalNameTr || !finalNameEn) {
    return { ok: false, error: 'Model adı zorunludur.' };
  }

  if (!isSafeMediaUrl(body.heroImage)) {
    return {
      ok: false,
      error: 'Kapak görseli zorunludur ve geçerli bir https:// adresi olmalıdır.',
    };
  }

  const images = validateRoomImages(body.images);
  if (!images.ok) return images;

  const descTr = optionalText(body.descTr, MAX_LONG_TEXT);
  if (!descTr.ok) return descTr;
  const descEn = optionalText(body.descEn, MAX_LONG_TEXT);
  if (!descEn.ok) return descEn;

  const category = optionalText(body.category, MAX_SHORT_TEXT);
  if (!category.ok) return category;

  const video = optionalSafeUrl(body.video, 'Video adresi');
  if (!video.ok) return video;

  const isVisible = optionalBoolean(body.isVisible, true);
  if (!isVisible.ok) return isVisible;
  const isFeatured = optionalBoolean(body.isFeatured, false);
  if (!isFeatured.ok) return isFeatured;

  const specs = validateSpecs(body.specs);
  if (!specs.ok) return specs;

  return {
    ok: true,
    value: {
      slug: slug.value,
      nameTr: finalNameTr,
      nameEn: finalNameEn,
      ...(descTr.value ? { descTr: descTr.value } : {}),
      ...(descEn.value ? { descEn: descEn.value } : {}),
      ...(category.value ? { category: category.value } : {}),
      heroImage: (body.heroImage as string).trim(),
      images: images.value,
      ...(video.value ? { video: video.value } : {}),
      isVisible: isVisible.value,
      isFeatured: isFeatured.value,
      ...(specs.value ? { specs: specs.value } : {}),
    },
  };
}

/**
 * Partial room update. Only the keys present in the payload are validated and
 * returned, so an absent key never overwrites persisted data. Nullable fields
 * that are present but empty resolve to `null` so they can be cleared.
 */
export interface RoomUpdateInput {
  slug?: string;
  nameTr?: string;
  nameEn?: string;
  descTr?: string | null;
  descEn?: string | null;
  category?: string | null;
  heroImage?: string;
  images?: RoomImageInput[];
  video?: string | null;
  isVisible?: boolean;
  isFeatured?: boolean;
  specs?: Record<string, string | string[]> | null;
}

export function validateRoomUpdate(
  body: unknown,
): ValidationResult<RoomUpdateInput> {
  if (!isPlainObject(body)) {
    return { ok: false, error: 'Geçersiz istek gövdesi.' };
  }

  const update: RoomUpdateInput = {};
  let recognized = 0;

  if ('slug' in body) {
    const slug = validateSlug(body.slug);
    if (!slug.ok) return slug;
    update.slug = slug.value;
    recognized += 1;
  }

  if ('nameTr' in body) {
    const nameTr = optionalText(body.nameTr, MAX_SHORT_TEXT);
    if (!nameTr.ok) return nameTr;
    if (!nameTr.value) return { ok: false, error: 'Model adı boş olamaz.' };
    update.nameTr = nameTr.value;
    recognized += 1;
  }

  if ('nameEn' in body) {
    const nameEn = optionalText(body.nameEn, MAX_SHORT_TEXT);
    if (!nameEn.ok) return nameEn;
    if (!nameEn.value) return { ok: false, error: 'İngilizce model adı boş olamaz.' };
    update.nameEn = nameEn.value;
    recognized += 1;
  }

  if ('descTr' in body) {
    const descTr = optionalText(body.descTr, MAX_LONG_TEXT);
    if (!descTr.ok) return descTr;
    update.descTr = descTr.value ?? null;
    recognized += 1;
  }

  if ('descEn' in body) {
    const descEn = optionalText(body.descEn, MAX_LONG_TEXT);
    if (!descEn.ok) return descEn;
    update.descEn = descEn.value ?? null;
    recognized += 1;
  }

  if ('category' in body) {
    const category = optionalText(body.category, MAX_SHORT_TEXT);
    if (!category.ok) return category;
    update.category = category.value ?? null;
    recognized += 1;
  }

  if ('heroImage' in body) {
    if (!isSafeMediaUrl(body.heroImage)) {
      return {
        ok: false,
        error: 'Kapak görseli geçerli bir https:// adresi olmalıdır.',
      };
    }
    update.heroImage = (body.heroImage as string).trim();
    recognized += 1;
  }

  if ('images' in body) {
    const images = validateRoomImages(body.images);
    if (!images.ok) return images;
    update.images = images.value;
    recognized += 1;
  }

  if ('video' in body) {
    const video = optionalSafeUrl(body.video, 'Video adresi');
    if (!video.ok) return video;
    update.video = video.value ?? null;
    recognized += 1;
  }

  if ('isVisible' in body) {
    if (typeof body.isVisible !== 'boolean') {
      return { ok: false, error: 'isVisible yalnızca true veya false olabilir.' };
    }
    update.isVisible = body.isVisible;
    recognized += 1;
  }

  if ('isFeatured' in body) {
    if (typeof body.isFeatured !== 'boolean') {
      return { ok: false, error: 'isFeatured yalnızca true veya false olabilir.' };
    }
    update.isFeatured = body.isFeatured;
    recognized += 1;
  }

  if ('specs' in body) {
    const specs = validateSpecs(body.specs);
    if (!specs.ok) return specs;
    update.specs = specs.value ?? null;
    recognized += 1;
  }

  if (!recognized) {
    return { ok: false, error: 'Güncellenecek geçerli bir alan bulunamadı.' };
  }

  return { ok: true, value: update };
}

// ---------------------------------------------------------------------------
// Videos
// ---------------------------------------------------------------------------

export interface VideoWriteInput {
  title: string;
  url: string;
  thumbnail?: string;
  isPublic: boolean;
}

export function validateVideoCreate(body: unknown): ValidationResult<VideoWriteInput> {
  if (!isPlainObject(body)) {
    return { ok: false, error: 'Geçersiz istek gövdesi.' };
  }

  const title = optionalText(body.title, MAX_SHORT_TEXT);
  if (!title.ok) return title;
  if (!title.value) return { ok: false, error: 'Başlık zorunludur.' };

  if (!isSafeMediaUrl(body.url)) {
    return {
      ok: false,
      error: 'Video adresi zorunludur ve geçerli bir https:// adresi olmalıdır.',
    };
  }

  const thumbnail = optionalSafeUrl(body.thumbnail, 'Küçük resim adresi');
  if (!thumbnail.ok) return thumbnail;

  const isPublic = optionalBoolean(body.isPublic, true);
  if (!isPublic.ok) return isPublic;

  return {
    ok: true,
    value: {
      title: title.value,
      url: (body.url as string).trim(),
      ...(thumbnail.value ? { thumbnail: thumbnail.value } : {}),
      isPublic: isPublic.value,
    },
  };
}

export interface VideoUpdateInput {
  title?: string;
  url?: string;
  thumbnail?: string | null;
  isPublic?: boolean;
}

export function validateVideoUpdate(body: unknown): ValidationResult<VideoUpdateInput> {
  if (!isPlainObject(body)) {
    return { ok: false, error: 'Geçersiz istek gövdesi.' };
  }

  const update: VideoUpdateInput = {};
  let recognized = 0;

  if ('title' in body) {
    const title = optionalText(body.title, MAX_SHORT_TEXT);
    if (!title.ok) return title;
    if (!title.value) return { ok: false, error: 'Başlık boş olamaz.' };
    update.title = title.value;
    recognized += 1;
  }

  if ('url' in body) {
    if (!isSafeMediaUrl(body.url)) {
      return { ok: false, error: 'Video adresi geçerli bir https:// adresi olmalıdır.' };
    }
    update.url = (body.url as string).trim();
    recognized += 1;
  }

  if ('thumbnail' in body) {
    if (body.thumbnail === null || body.thumbnail === '') {
      update.thumbnail = null;
    } else {
      const thumbnail = optionalSafeUrl(body.thumbnail, 'Küçük resim adresi');
      if (!thumbnail.ok) return thumbnail;
      update.thumbnail = thumbnail.value ?? null;
    }
    recognized += 1;
  }

  if ('isPublic' in body) {
    if (typeof body.isPublic !== 'boolean') {
      return { ok: false, error: 'isPublic yalnızca true veya false olabilir.' };
    }
    update.isPublic = body.isPublic;
    recognized += 1;
  }

  if (!recognized) {
    return { ok: false, error: 'Güncellenecek geçerli bir alan bulunamadı.' };
  }

  return { ok: true, value: update };
}

// ---------------------------------------------------------------------------
// Uploads
// ---------------------------------------------------------------------------

export const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_VIDEO_UPLOAD_BYTES = 100 * 1024 * 1024; // 100 MB

const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

const VIDEO_MIME_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

export function isAllowedImageMime(mime: string): boolean {
  return IMAGE_MIME_TYPES.has(mime);
}

export function isAllowedVideoMime(mime: string): boolean {
  return VIDEO_MIME_TYPES.has(mime);
}

export function isAllowedUploadMime(mime: string): boolean {
  return isAllowedImageMime(mime) || isAllowedVideoMime(mime);
}

/** Normalizes and allowlists the Cloudinary folder a signature may be issued for. */
export function resolveUploadFolder(value: unknown): ValidationResult<string> {
  if (value === undefined || value === null || value === '') {
    return { ok: true, value: DEFAULT_UPLOAD_FOLDER };
  }
  if (typeof value !== 'string') {
    return { ok: false, error: 'Klasör adı geçersiz.' };
  }
  const folder = value.trim().replace(/^\/+|\/+$/g, '');
  if (!(ALLOWED_UPLOAD_FOLDERS as readonly string[]).includes(folder)) {
    return { ok: false, error: 'Bu klasöre yükleme izni yok.' };
  }
  return { ok: true, value: folder };
}

/**
 * Cheap magic-byte sniff so a renamed executable cannot be passed off as an
 * image/video by spoofing the multipart Content-Type.
 */
export function matchesDeclaredType(mime: string, bytes: Uint8Array): boolean {
  const b = bytes;
  const ascii = (offset: number, text: string) =>
    text.split('').every((char, i) => b[offset + i] === char.charCodeAt(0));

  switch (mime) {
    case 'image/jpeg':
      return b.length > 2 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    case 'image/png':
      return (
        b.length > 7 &&
        b[0] === 0x89 &&
        ascii(1, 'PNG') &&
        b[4] === 0x0d &&
        b[5] === 0x0a &&
        b[6] === 0x1a &&
        b[7] === 0x0a
      );
    case 'image/gif':
      return b.length > 5 && (ascii(0, 'GIF87a') || ascii(0, 'GIF89a'));
    case 'image/webp':
      return b.length > 11 && ascii(0, 'RIFF') && ascii(8, 'WEBP');
    case 'image/avif':
      return b.length > 11 && ascii(4, 'ftyp') && ascii(8, 'avif');
    case 'video/mp4':
    case 'video/quicktime':
      return b.length > 11 && ascii(4, 'ftyp');
    case 'video/webm':
      return (
        b.length > 3 &&
        b[0] === 0x1a &&
        b[1] === 0x45 &&
        b[2] === 0xdf &&
        b[3] === 0xa3
      );
    default:
      return false;
  }
}

export function maxBytesForMime(mime: string): number {
  return isAllowedVideoMime(mime) ? MAX_VIDEO_UPLOAD_BYTES : MAX_IMAGE_UPLOAD_BYTES;
}

// ---------------------------------------------------------------------------
// Upload kinds (direct signed flow)
// ---------------------------------------------------------------------------

/**
 * Upload kind determines the Cloudinary resource type, the signed
 * `allowed_formats` list and the signed upload preset used for provider-side
 * limits. `resource_type` is never signed — it only appears in the endpoint
 * path — so it is pinned here instead of in the signature.
 */
export type UploadKind = 'image' | 'video';

/** Cloudinary `allowed_formats` values (file extensions, no leading dot). */
export const ALLOWED_IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'] as const;
export const ALLOWED_VIDEO_FORMATS = ['mp4', 'webm', 'mov'] as const;

/**
 * Multipart framing (boundary + part headers) allowed on top of the file size
 * cap when bounding a request body. Generous but still a hard ceiling.
 */
export const UPLOAD_MULTIPART_OVERHEAD_BYTES = 64 * 1024;

export function isUploadKind(value: unknown): value is UploadKind {
  return value === 'image' || value === 'video';
}

/** Normalizes the `kind` query/body value. Defaults to `image` when omitted. */
export function resolveUploadKind(value: unknown): ValidationResult<UploadKind> {
  if (value === undefined || value === null || value === '') {
    return { ok: true, value: 'image' };
  }
  if (typeof value !== 'string') return { ok: false, error: 'Yükleme türü geçersiz.' };

  const kind = value.trim().toLowerCase();
  if (isUploadKind(kind)) return { ok: true, value: kind };
  return { ok: false, error: 'Yükleme türü geçersiz.' };
}

/** Comma-separated `allowed_formats` value signed for the given kind. */
export function allowedFormatsForKind(kind: UploadKind): string {
  return allowedFormatListForKind(kind).join(',');
}

/** The same allowlist as a mutable array, for the Cloudinary SDK upload options. */
export function allowedFormatListForKind(kind: UploadKind): string[] {
  return kind === 'video' ? [...ALLOWED_VIDEO_FORMATS] : [...ALLOWED_IMAGE_FORMATS];
}

/** Per-kind size cap used to bound a request body before it is buffered. */
export function maxBytesForKind(kind: UploadKind): number {
  return kind === 'video' ? MAX_VIDEO_UPLOAD_BYTES : MAX_IMAGE_UPLOAD_BYTES;
}

/** Guards against a video MIME being smuggled through the image flow (or back). */
export function mimeMatchesKind(kind: UploadKind, mime: string): boolean {
  return kind === 'video' ? isAllowedVideoMime(mime) : isAllowedImageMime(mime);
}

const UPLOAD_UNIQUE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]{7,63}$/;

/**
 * Builds the unique, traversal-free `public_id` that is signed for a direct
 * upload. The unique id is expected to come from `crypto.randomUUID()`; it is
 * re-validated here so a caller can never inject `/`, `.`, tag characters or a
 * path traversal into the signed value.
 */
export function buildUploadPublicId(
  kind: UploadKind,
  uniqueId: unknown,
): ValidationResult<string> {
  if (typeof uniqueId !== 'string' || !UPLOAD_UNIQUE_ID_PATTERN.test(uniqueId)) {
    return { ok: false, error: 'Yükleme kimliği geçersiz.' };
  }
  return { ok: true, value: `${kind === 'video' ? 'vid' : 'img'}_${uniqueId}` };
}
