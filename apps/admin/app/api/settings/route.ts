import { NextResponse } from 'next/server';
import { prisma } from '@aldimobilya/db';
import type { Prisma } from '@aldimobilya/db';
import { readJsonBody, requireAdminSession } from '@/lib/auth-guard';
import {
  MAX_LONG_TEXT,
  MAX_SHORT_TEXT,
  isPlainObject,
  normalizeHeroSettings,
  optionalSocialValue,
  optionalText,
  validateHeroSlideshowInput,
} from '@/lib/validation';

type SettingsRow = Awaited<
  ReturnType<typeof prisma.siteSettings.findUnique>
>;

/**
 * Persisted `heroImages` may be the legacy `string[]` shape or the slideshow
 * object. `heroImages` is always returned as a plain array so existing
 * consumers keep working, and the full settings are exposed as `heroSlideshow`.
 */
function serializeSettings(row: SettingsRow | null) {
  const heroSlideshow = normalizeHeroSettings(row?.heroImages);
  return {
    ...(row ?? {}),
    heroImages: heroSlideshow.images,
    heroSlideshow,
  };
}

export async function GET(request: Request) {
  const guard = await requireAdminSession({ capability: 'settings:read', request });
  if (!guard.ok) return guard.response;

  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'main' } });
    return NextResponse.json({ settings: serializeSettings(settings) });
  } catch (err: unknown) {
    console.error('[GET /api/settings in admin]', err);
    return NextResponse.json({ error: 'Ayarlar getirilemedi.' }, { status: 500 });
  }
}

/**
 * Plain, nullable write payload. Deliberately not `Prisma.SiteSettingsUpdateInput`
 * so the same object can be reused for both the `update` and `create` branches
 * of the upsert.
 */
interface SettingsWriteData {
  whatsapp?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  youtube?: string | null;
  heroTitleTr?: string | null;
  heroSubtitleTr?: string | null;
  metaDescTr?: string | null;
  heroImages?: Prisma.InputJsonValue;
}

export async function PUT(request: Request) {
  const guard = await requireAdminSession({ capability: 'settings:write', request });
  if (!guard.ok) return guard.response;

  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;

  if (!isPlainObject(parsed.body)) {
    return NextResponse.json({ error: 'Geçersiz istek gövdesi.' }, { status: 400 });
  }

  const body = parsed.body;
  const data: SettingsWriteData = {};

  // Hero slideshow: accepts legacy string[] or { images, autoplay, intervalMs }.
  if ('heroImages' in body || 'heroSlideshow' in body) {
    const raw = 'heroImages' in body ? body.heroImages : body.heroSlideshow;
    const hero = validateHeroSlideshowInput(raw);
    if (!hero.ok) {
      return NextResponse.json({ error: hero.error }, { status: 400 });
    }
    // The slideshow object has fixed keys, so it needs an explicit widening cast
    // to Prisma's JSON input type.
    data.heroImages = hero.value as unknown as Prisma.InputJsonValue;
  }

  // Contact details.
  if ('whatsapp' in body) {
    const result = optionalText(body.whatsapp, MAX_SHORT_TEXT);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    data.whatsapp = result.value ?? null;
  }
  if ('phone' in body) {
    const result = optionalText(body.phone, MAX_SHORT_TEXT);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    data.phone = result.value ?? null;
  }
  if ('email' in body) {
    const result = optionalText(body.email, MAX_SHORT_TEXT);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    data.email = result.value ?? null;
  }
  if ('address' in body) {
    const result = optionalText(body.address, MAX_SHORT_TEXT);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    data.address = result.value ?? null;
  }

  // Social profiles: https URL, root-relative path or a bare handle.
  if ('instagram' in body) {
    const result = optionalSocialValue(body.instagram);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    data.instagram = result.value ?? null;
  }
  if ('facebook' in body) {
    const result = optionalSocialValue(body.facebook);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    data.facebook = result.value ?? null;
  }
  if ('tiktok' in body) {
    const result = optionalSocialValue(body.tiktok);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    data.tiktok = result.value ?? null;
  }
  if ('youtube' in body) {
    const result = optionalSocialValue(body.youtube);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    data.youtube = result.value ?? null;
  }

  // Homepage copy.
  if ('heroTitleTr' in body) {
    const result = optionalText(body.heroTitleTr, MAX_SHORT_TEXT);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    data.heroTitleTr = result.value ?? null;
  }
  if ('heroSubtitleTr' in body) {
    const result = optionalText(body.heroSubtitleTr, MAX_LONG_TEXT);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    data.heroSubtitleTr = result.value ?? null;
  }
  if ('metaDescTr' in body) {
    const result = optionalText(body.metaDescTr, MAX_LONG_TEXT);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    data.metaDescTr = result.value ?? null;
  }

  if (!Object.keys(data).length) {
    return NextResponse.json(
      { error: 'Güncellenecek geçerli bir alan bulunamadı.' },
      { status: 400 },
    );
  }

  try {
    // Fields absent from the payload are simply not written, so partial
    // updates never wipe unrelated settings.
    const settings = await prisma.siteSettings.upsert({
      where: { id: 'main' },
      update: data,
      create: { id: 'main', ...data },
    });

    return NextResponse.json({ settings: serializeSettings(settings) });
  } catch (err: unknown) {
    console.error('[PUT /api/settings in admin]', err);
    return NextResponse.json({ error: 'Ayarlar kaydedilemedi.' }, { status: 500 });
  }
}
