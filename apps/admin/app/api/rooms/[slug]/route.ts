import { NextResponse } from 'next/server';
import { prisma } from '@aldimobilya/db';

interface Context {
  params: Promise<{ slug: string }>;
}

export async function GET(_req: Request, { params }: Context) {
  const { slug } = await params;
  try {
    const room = await prisma.room.findUnique({
      where: { slug },
      include: { images: { orderBy: { order: 'asc' } } },
    });
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }
    return NextResponse.json(room);
  } catch (err: unknown) {
    console.error('[GET /api/rooms/[slug] in admin]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Context) {
  const { slug } = await params;
  try {
    await prisma.room.delete({ where: { slug } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[DELETE /api/rooms/[slug] in admin]', err);
    return NextResponse.json({ error: 'Failed to delete room' }, { status: 500 });
  }
}
