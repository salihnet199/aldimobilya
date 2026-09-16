import { NextResponse } from 'next/server';
import { Prisma, prisma } from '@aldimobilya/db';
import {
  prismaErrorCode,
  readJsonBody,
  requireAdminSession,
} from '@/lib/auth-guard';
import { validateRoomUpdate } from '@/lib/validation';

interface Context {
  params: Promise<{ slug: string }>;
}

export async function GET(request: Request, { params }: Context) {
  const guard = await requireAdminSession({ capability: 'rooms:read', request });
  if (!guard.ok) return guard.response;

  const { slug } = await params;

  try {
    const room = await prisma.room.findUnique({
      where: { slug },
      include: { images: { orderBy: { order: 'asc' } } },
    });
    if (!room) {
      return NextResponse.json({ error: 'Oda bulunamadı.' }, { status: 404 });
    }
    return NextResponse.json(room);
  } catch (err: unknown) {
    console.error('[GET /api/rooms/[slug] in admin]', err);
    return NextResponse.json({ error: 'Oda getirilemedi.' }, { status: 500 });
  }
}

/**
 * Full/partial room update, keyed by the current slug.
 *
 * The room row is updated in place (its `id` never changes) and its image
 * collection is replaced inside the same transaction, so a failure can never
 * leave a room without images or with a half-applied payload.
 */
export async function PUT(request: Request, { params }: Context) {
  const guard = await requireAdminSession({ capability: 'rooms:write', request });
  if (!guard.ok) return guard.response;

  const { slug } = await params;

  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;

  const validated = validateRoomUpdate(parsed.body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const update = validated.value;

  try {
    const existing = await prisma.room.findUnique({
      where: { slug },
      select: { id: true, nameTr: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Oda bulunamadı.' }, { status: 404 });
    }

    if (update.slug && update.slug !== slug) {
      const clash = await prisma.room.findUnique({
        where: { slug: update.slug },
        select: { id: true },
      });
      if (clash) {
        return NextResponse.json(
          { error: `"${update.slug}" adresi zaten kullanımda.` },
          { status: 409 },
        );
      }
    }

    const { images, specs, ...scalar } = update;
    const altFallback = scalar.nameTr ?? existing.nameTr;

    const room = await prisma.$transaction(async (tx) => {
      await tx.room.update({
        where: { id: existing.id },
        data: {
          ...scalar,
          ...(specs !== undefined
            ? {
                specs:
                  specs === null
                    ? Prisma.DbNull
                    : (specs as Prisma.InputJsonValue),
              }
            : {}),
        },
      });

      if (images !== undefined) {
        await tx.roomImage.deleteMany({ where: { roomId: existing.id } });
        if (images.length) {
          await tx.roomImage.createMany({
            data: images.map((img, index) => ({
              roomId: existing.id,
              url: img.url,
              alt: img.alt ?? altFallback,
              order: index,
            })),
          });
        }
      }

      return tx.room.findUniqueOrThrow({
        where: { id: existing.id },
        include: { images: { orderBy: { order: 'asc' } } },
      });
    });

    return NextResponse.json(room);
  } catch (err: unknown) {
    const code = prismaErrorCode(err);
    if (code === 'P2002') {
      return NextResponse.json(
        { error: 'Bu URL adresi zaten kullanımda.' },
        { status: 409 },
      );
    }
    if (code === 'P2025') {
      return NextResponse.json({ error: 'Oda bulunamadı.' }, { status: 404 });
    }
    console.error(`[PUT /api/rooms/${slug} in admin]`, err);
    return NextResponse.json({ error: 'Model güncellenemedi.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Context) {
  const guard = await requireAdminSession({ capability: 'rooms:delete', request });
  if (!guard.ok) return guard.response;

  const { slug } = await params;

  try {
    const existing = await prisma.room.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Oda bulunamadı.' }, { status: 404 });
    }

    await prisma.room.delete({ where: { id: existing.id } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (prismaErrorCode(err) === 'P2025') {
      return NextResponse.json({ error: 'Oda bulunamadı.' }, { status: 404 });
    }
    console.error(`[DELETE /api/rooms/${slug} in admin]`, err);
    return NextResponse.json({ error: 'Model silinemedi.' }, { status: 500 });
  }
}
