import { NextResponse } from 'next/server';
import { prisma } from '@aldimobilya/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('kategori') ?? undefined;
  const search   = searchParams.get('ara') ?? undefined;
  const featured = searchParams.get('featured') === 'true';

  try {
    const where = {
      isVisible: true,
      ...(featured ? { isFeatured: true } : {}),
      ...(category ? { category } : {}),
      ...(search
        ? { nameTr: { contains: search, mode: 'insensitive' as const } }
        : {}),
    };

    const [rooms, allRooms] = await Promise.all([
      prisma.room.findMany({
        where,
        include: { images: { orderBy: { order: 'asc' } } },
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.room.findMany({
        where: { isVisible: true },
        select: { category: true },
      }),
    ]);

    const categories = [
      ...new Set(
        allRooms.map((r) => r.category).filter((c): c is string => !!c),
      ),
    ].sort();

    return NextResponse.json({ rooms, categories });
  } catch (err) {
    console.error('[GET /api/rooms]', err);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      nameTr, nameEn, descTr, slug, category,
      heroImage, images = [], video,
      isVisible = true, isFeatured = false, specs,
    } = body;

    if (!nameTr || !slug || !heroImage) {
      return NextResponse.json(
        { error: 'nameTr, slug ve heroImage zorunludur' },
        { status: 400 },
      );
    }

    const room = await prisma.room.create({
      data: {
        nameTr,
        nameEn: nameEn || null,
        descTr: descTr || null,
        slug,
        category: category || null,
        heroImage,
        video: video || null,
        isVisible,
        isFeatured,
        specs: specs || undefined,
        images: {
          create: (images as { url: string; alt?: string }[]).map(
            (img, i) => ({ url: img.url, alt: img.alt || nameTr, order: i }),
          ),
        },
      },
      include: { images: true },
    });

    return NextResponse.json({ room }, { status: 201 });
  } catch (err: unknown) {
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json({ error: 'Bu slug zaten kullanımda' }, { status: 409 });
    }
    console.error('[POST /api/rooms]', err);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
