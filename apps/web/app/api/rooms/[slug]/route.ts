import { NextResponse } from 'next/server';
import { prisma } from '@aldimobilya/db';

const READ_ONLY_ALLOW = 'GET, HEAD, OPTIONS';

interface Context {
  params: Promise<{ slug: string }>;
}

function methodNotAllowed(): NextResponse {
  return NextResponse.json(
    { error: 'Bu uç nokta yalnızca okuma amaçlıdır.' },
    { status: 405, headers: { Allow: READ_ONLY_ALLOW } },
  );
}

export async function GET(_req: Request, { params }: Context) {
  const { slug } = await params;

  try {
    // Filter on `isVisible` in the query itself so a hidden room is
    // indistinguishable from a missing one (no existence leak).
    const room = await prisma.room.findFirst({
      where: { slug, isVisible: true },
      include: { images: { orderBy: { order: 'asc' } } },
    });

    if (!room) {
      return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });
    }

    // No `viewCount` increment here: a public GET must not perform a write, as
    // that turned every anonymous read into unauthenticated database write
    // amplification. The stored `viewCount` value is left untouched.
    return NextResponse.json({ room });
  } catch (err) {
    console.error(`[GET /api/rooms/${slug}]`, err);
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
