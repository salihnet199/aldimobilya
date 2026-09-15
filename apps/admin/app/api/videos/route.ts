import { NextResponse } from 'next/server';
import { prisma } from '@aldimobilya/db';

export async function GET() {
  try {
    const videos = await prisma.video.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ videos });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[GET /api/videos] Error:', msg);
    return NextResponse.json({ error: 'Videolar getirilemedi: ' + msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, url, thumbnail, isPublic } = body;

    if (!title?.trim() || !url?.trim()) {
      return NextResponse.json({ error: 'Başlık ve video URL zorunludur.' }, { status: 400 });
    }

    const video = await prisma.video.create({
      data: {
        title: title.trim(),
        url: url.trim(),
        thumbnail: thumbnail?.trim() || null,
        isPublic: isPublic !== undefined ? Boolean(isPublic) : true,
      },
    });

    return NextResponse.json({ video }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[POST /api/videos] Error:', msg);
    return NextResponse.json({ error: 'Video kaydedilemedi: ' + msg }, { status: 500 });
  }
}
