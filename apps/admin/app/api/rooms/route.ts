import { NextResponse } from 'next/server';
import { prisma } from '@aldimobilya/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') ?? searchParams.get('kategori') ?? undefined;
  const search = searchParams.get('search') ?? searchParams.get('ara') ?? undefined;
  const featured = searchParams.get('featured') === 'true';

  try {
    const where = {
      ...(featured ? { isFeatured: true } : {}),
      ...(category ? { category } : {}),
      ...(search
        ? {
            OR: [
              { nameEn: { contains: search, mode: 'insensitive' as const } },
              { nameTr: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const rooms = await prisma.room.findMany({
      where,
      include: { images: { orderBy: { order: 'asc' } } },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ rooms });
  } catch (err: unknown) {
    console.error('[GET /api/rooms in admin]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      nameEn,
      nameTr,
      descEn,
      descTr,
      slug,
      category,
      heroImage,
      images = [],
      video,
      isVisible = true,
      isFeatured = false,
      specs,
    } = body;

    // The primary name is English, with fallback to Turkish
    const finalNameEn = (nameEn || nameTr || '').trim();
    const finalNameTr = (nameTr || nameEn || '').trim();
    const finalDescEn = (descEn || descTr || '').trim() || null;
    const finalDescTr = (descTr || descEn || '').trim() || null;
    const finalSlug   = (slug || '').trim();

    if (!finalNameEn || !finalSlug || !heroImage) {
      return NextResponse.json(
        { error: 'Name, slug, and at least one image are required.' },
        { status: 400 },
      );
    }

    // Check slug uniqueness
    const existing = await prisma.room.findUnique({ where: { slug: finalSlug } });
    if (existing) {
      return NextResponse.json(
        { error: `The URL slug "${finalSlug}" is already taken. Please choose another name or slug.` },
        { status: 409 },
      );
    }

    const room = await prisma.room.create({
      data: {
        slug: finalSlug,
        nameEn: finalNameEn,
        nameTr: finalNameTr,
        descEn: finalDescEn,
        descTr: finalDescTr,
        category: category?.trim() || null,
        heroImage,
        video: video?.trim() || null,
        isVisible,
        isFeatured,
        specs: specs ?? undefined,
        images: {
          create: images.map((img: { url: string; alt?: string }, index: number) => ({
            url: img.url,
            alt: img.alt || finalNameEn,
            order: index,
          })),
        },
      },
      include: { images: true },
    });

    return NextResponse.json(room, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[POST /api/rooms in admin]', message);
    return NextResponse.json({ error: 'Failed to create room: ' + message }, { status: 500 });
  }
}
