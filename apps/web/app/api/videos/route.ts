import { NextResponse } from 'next/server';
import { prisma } from '@aldimobilya/db';

const READ_ONLY_ALLOW = 'GET, HEAD, OPTIONS';

function methodNotAllowed(): NextResponse {
  return NextResponse.json(
    { error: 'Bu uç nokta yalnızca okuma amaçlıdır.' },
    { status: 405, headers: { Allow: READ_ONLY_ALLOW } },
  );
}

export async function GET() {
  try {
    // Only videos explicitly published by the admin app are exposed.
    const videos = await prisma.video.findMany({
      where: { isPublic: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ videos });
  } catch (err) {
    console.error('[GET /api/videos]', err);
    return NextResponse.json({ error: 'Videolar alınamadı' }, { status: 500 });
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
