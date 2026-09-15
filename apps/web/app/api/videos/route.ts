import { NextResponse } from 'next/server';
import { prisma } from '@aldimobilya/db';

export async function GET() {
  try {
    const videos = await prisma.video.findMany({
      where: { isPublic: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ videos });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[GET /api/videos] Error:', msg);
    return NextResponse.json({ error: 'Videolar alınamadı: ' + msg }, { status: 500 });
  }
}
