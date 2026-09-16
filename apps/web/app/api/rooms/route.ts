import { NextResponse } from 'next/server';
import { prisma } from '@aldimobilya/db';

/**
 * Public room catalogue — read-only.
 *
 * Mutations live exclusively in the authenticated admin app. The handlers below
 * answer 405 with an explicit `Allow` header so a probing client learns the
 * endpoint is read-only instead of hitting an unlabelled framework response.
 */
const READ_ONLY_ALLOW = 'GET, HEAD, OPTIONS';

function methodNotAllowed(): NextResponse {
  return NextResponse.json(
    { error: 'Bu uç nokta yalnızca okuma amaçlıdır.' },
    { status: 405, headers: { Allow: READ_ONLY_ALLOW } },
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('kategori') ?? undefined;
  const search = searchParams.get('ara') ?? undefined;
  const featured = searchParams.get('featured') === 'true';

  try {
    // `isVisible: true` is the hard gate: hidden rooms are never listed.
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
