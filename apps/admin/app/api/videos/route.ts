import { NextResponse } from 'next/server';
import { prisma } from '@aldimobilya/db';
import { readJsonBody, requireAdminSession } from '@/lib/auth-guard';
import { validateVideoCreate } from '@/lib/validation';

export async function GET(request: Request) {
  const guard = await requireAdminSession({ capability: 'videos:read', request });
  if (!guard.ok) return guard.response;

  try {
    // Admin listing shows every video, including unpublished ones.
    const videos = await prisma.video.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ videos });
  } catch (err: unknown) {
    console.error('[GET /api/videos in admin]', err);
    return NextResponse.json({ error: 'Videolar getirilemedi.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const guard = await requireAdminSession({ capability: 'videos:write', request });
  if (!guard.ok) return guard.response;

  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;

  const validated = validateVideoCreate(parsed.body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const data = validated.value;

  try {
    const video = await prisma.video.create({
      data: {
        title: data.title,
        url: data.url,
        thumbnail: data.thumbnail ?? null,
        isPublic: data.isPublic,
      },
    });

    return NextResponse.json({ video }, { status: 201 });
  } catch (err: unknown) {
    console.error('[POST /api/videos in admin]', err);
    return NextResponse.json({ error: 'Video kaydedilemedi.' }, { status: 500 });
  }
}
