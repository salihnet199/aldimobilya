import { NextResponse } from 'next/server';
import { prisma } from '@aldimobilya/db';
import { normalizeHeroSettings } from '@aldimobilya/types';

/**
 * Public site settings — read-only. Writes happen exclusively through the
 * authenticated admin app.
 */
const READ_ONLY_ALLOW = 'GET, HEAD, OPTIONS';

function methodNotAllowed(): NextResponse {
  return NextResponse.json(
    { error: 'Bu uç nokta yalnızca okuma amaçlıdır.' },
    { status: 405, headers: { Allow: READ_ONLY_ALLOW } },
  );
}

export async function GET() {
  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'main' } });

    // `heroImages` may be the legacy string[] shape or the slideshow object.
    // `heroImages` keeps returning a plain array so existing consumers (e.g.
    // HeroCarousel) work unchanged; `heroSlideshow` carries the full settings.
    const heroSlideshow = normalizeHeroSettings(settings?.heroImages);

    return NextResponse.json({
      settings: {
        whatsapp: settings?.whatsapp ?? process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '+905000000000',
        instagram: settings?.instagram ?? 'aldimobilya',
        facebook: settings?.facebook ?? null,
        tiktok: settings?.tiktok ?? null,
        youtube: settings?.youtube ?? null,
        heroTitleTr: settings?.heroTitleTr ?? null,
        heroSubtitleTr: settings?.heroSubtitleTr ?? null,
        heroImages: heroSlideshow.images,
        heroSlideshow,
        elfSightCode: settings?.elfSightCode ?? null,
      },
    });
  } catch (err) {
    console.error('[GET /api/settings]', err);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

export async function POST() {
  return methodNotAllowed();
}

export async function PUT() {
  return methodNotAllowed();
}

export async function PATCH() {
  return methodNotAllowed();
}

export async function DELETE() {
  return methodNotAllowed();
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: { Allow: READ_ONLY_ALLOW },
  });
}
