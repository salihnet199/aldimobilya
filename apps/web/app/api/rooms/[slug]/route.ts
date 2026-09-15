import { NextResponse } from 'next/server';
import { prisma } from '@aldimobilya/db';

interface Context { params: Promise<{ slug: string }> }

export async function GET(_req: Request, { params }: Context) {
  const { slug } = await params;
  try {
    const room = await prisma.room.findUnique({
      where: { slug },
      include: { images: { orderBy: { order: 'asc' } } },
    });
    if (!room) return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });

    // Increment view count (fire-and-forget)
    void prisma.room.update({ where: { slug }, data: { viewCount: { increment: 1 } } });

    return NextResponse.json({ room });
  } catch (err) {
    console.error(`[GET /api/rooms/${slug}]`, err);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Context) {
  const { slug } = await params;
  try {
    const body = await request.json();
    const { images, ...data } = body;

    const room = await prisma.room.update({
      where: { slug },
      data: {
        ...data,
        ...(images
          ? {
              images: {
                deleteMany: {},
                create: (images as { url: string; alt?: string }[]).map(
                  (img, i) => ({ url: img.url, alt: img.alt || data.nameTr, order: i }),
                ),
              },
            }
          : {}),
      },
      include: { images: true },
    });

    return NextResponse.json({ room });
  } catch (err) {
    console.error(`[PUT /api/rooms/${slug}]`, err);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Context) {
  const { slug } = await params;
  try {
    await prisma.room.delete({ where: { slug } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(`[DELETE /api/rooms/${slug}]`, err);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
