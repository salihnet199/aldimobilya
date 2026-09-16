import { NextResponse } from 'next/server';
import { prisma } from '@aldimobilya/db';

export async function GET() {
  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'main' } });
    return NextResponse.json({ settings: settings ?? {} });
  } catch (err) {
    console.error('[GET /api/settings]', err);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

interface SettingsPayload {
  whatsapp?: string;
  phone?: string;
  email?: string;
  address?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  youtube?: string;
  heroTitleTr?: string;
  heroSubtitleTr?: string;
  heroImages?: string[];
  elfSightCode?: string;
  metaDescTr?: string;
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as SettingsPayload;

    if (body.heroImages !== undefined && !Array.isArray(body.heroImages)) {
      return NextResponse.json({ error: 'heroImages bir dizi olmalıdır' }, { status: 400 });
    }

    const data = {
      whatsapp: body.whatsapp ?? undefined,
      phone: body.phone ?? undefined,
      email: body.email ?? undefined,
      address: body.address ?? undefined,
      instagram: body.instagram ?? undefined,
      facebook: body.facebook ?? undefined,
      tiktok: body.tiktok ?? undefined,
      youtube: body.youtube ?? undefined,
      heroTitleTr: body.heroTitleTr ?? undefined,
      heroSubtitleTr: body.heroSubtitleTr ?? undefined,
      heroImages: body.heroImages ?? undefined,
      elfSightCode: body.elfSightCode ?? undefined,
      metaDescTr: body.metaDescTr ?? undefined,
    };

    const settings = await prisma.siteSettings.upsert({
      where: { id: 'main' },
      update: data,
      create: { id: 'main', ...data },
    });

    return NextResponse.json({ settings });
  } catch (err) {
    console.error('[PUT /api/settings]', err);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
