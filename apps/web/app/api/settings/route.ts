import { NextResponse } from 'next/server';
import { prisma } from '@aldimobilya/db';

// Read-only: the public site never accepts writes to settings.
// Updates happen exclusively through the authenticated admin app.
export async function GET() {
  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'main' } });

    return NextResponse.json({
      settings: {
        whatsapp: settings?.whatsapp ?? process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '+905000000000',
        instagram: settings?.instagram ?? 'aldimobilya',
        facebook: settings?.facebook ?? null,
        tiktok: settings?.tiktok ?? null,
        youtube: settings?.youtube ?? null,
        heroTitleTr: settings?.heroTitleTr ?? null,
        heroSubtitleTr: settings?.heroSubtitleTr ?? null,
        heroImages: settings?.heroImages ?? [],
        elfSightCode: settings?.elfSightCode ?? null,
      },
    });
  } catch (err) {
    console.error('[GET /api/settings]', err);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
