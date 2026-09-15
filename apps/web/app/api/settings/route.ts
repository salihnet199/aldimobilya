import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // const settings = await prisma.siteSettings.findUnique({ where: { id: 'main' } });
    // return NextResponse.json({ settings: settings ?? {} });

    return NextResponse.json({
      settings: {
        whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '+905000000000',
        instagram: 'aldimobilya',
      },
    });
  } catch (err) {
    console.error('[GET /api/settings]', err);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    // TODO: Auth check
    // const settings = await prisma.siteSettings.upsert({
    //   where: { id: 'main' },
    //   update: body,
    //   create: { id: 'main', ...body },
    // });
    // return NextResponse.json({ settings });

    void body;
    return NextResponse.json({ error: 'Veritabanı henüz bağlı değil' }, { status: 503 });
  } catch (err) {
    console.error('[PUT /api/settings]', err);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
