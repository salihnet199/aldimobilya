import { NextResponse } from 'next/server';
import { prisma } from '@aldimobilya/db';
import type { Prisma } from '@aldimobilya/db';
import {
  prismaErrorCode,
  readJsonBody,
  requireAdminSession,
} from '@/lib/auth-guard';
import { validateRoomCreate } from '@/lib/validation';

export async function GET(request: Request) {
  const guard = await requireAdminSession({ capability: 'rooms:read', request });
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') ?? searchParams.get('kategori') ?? undefined;
  const search = searchParams.get('search') ?? searchParams.get('ara') ?? undefined;
  const featured = searchParams.get('featured') === 'true';

  try {
    // Admin listings intentionally include hidden rooms.
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
    return NextResponse.json({ error: 'Odalar getirilemedi.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const guard = await requireAdminSession({ capability: 'rooms:write', request });
  if (!guard.ok) return guard.response;

  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;

  const validated = validateRoomCreate(parsed.body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const data = validated.value;

  try {
    const existing = await prisma.room.findUnique({
      where: { slug: data.slug },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: `"${data.slug}" adresi zaten kullanımda. Lütfen başka bir ad seçin.` },
        { status: 409 },
      );
    }

    const room = await prisma.room.create({
      data: {
        slug: data.slug,
        nameTr: data.nameTr,
        nameEn: data.nameEn,
        descTr: data.descTr ?? null,
        descEn: data.descEn ?? null,
        category: data.category ?? null,
        heroImage: data.heroImage,
        video: data.video ?? null,
        isVisible: data.isVisible,
        isFeatured: data.isFeatured,
        ...(data.specs ? { specs: data.specs as Prisma.InputJsonValue } : {}),
        images: {
          create: data.images.map((img, index) => ({
            url: img.url,
            alt: img.alt ?? data.nameTr,
            order: index,
          })),
        },
      },
      include: { images: true },
    });

    return NextResponse.json(room, { status: 201 });
  } catch (err: unknown) {
    if (prismaErrorCode(err) === 'P2002') {
      return NextResponse.json(
        { error: 'Bu URL adresi zaten kullanımda.' },
        { status: 409 },
      );
    }
    console.error('[POST /api/rooms in admin]', err);
    return NextResponse.json({ error: 'Model oluşturulamadı.' }, { status: 500 });
  }
}
