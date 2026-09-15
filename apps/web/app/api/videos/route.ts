import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // const videos = await prisma.video.findMany({
    //   where: { isPublic: true },
    //   orderBy: { createdAt: 'desc' },
    // });
    // return NextResponse.json({ videos });

    return NextResponse.json({ videos: [] });
  } catch (err) {
    console.error('[GET /api/videos]', err);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // TODO: Auth check
    // const video = await prisma.video.create({ data: body });
    // return NextResponse.json({ video }, { status: 201 });

    void body;
    return NextResponse.json({ error: 'Veritabanı henüz bağlı değil' }, { status: 503 });
  } catch (err) {
    console.error('[POST /api/videos]', err);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
