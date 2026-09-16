import { NextResponse } from 'next/server';
import { prisma } from '@aldimobilya/db';
import {
  prismaErrorCode,
  readJsonBody,
  requireAdminSession,
} from '@/lib/auth-guard';
import { validateVideoUpdate } from '@/lib/validation';

interface Context {
  params: Promise<{ id: string }>;
}

/**
 * Partial video update — primarily used to toggle `isPublic`.
 *
 * Only the keys present in the payload are written, so an update that does not
 * mention `isPublic` can never accidentally republish a hidden video, and the
 * public API (which filters on `isPublic: true`) keeps hidden videos hidden.
 */
export async function PATCH(request: Request, { params }: Context) {
  const guard = await requireAdminSession({ capability: 'videos:write', request });
  if (!guard.ok) return guard.response;

  const { id } = await params;

  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;

  const validated = validateVideoUpdate(parsed.body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  try {
    const existing = await prisma.video.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Video bulunamadı.' }, { status: 404 });
    }

    const video = await prisma.video.update({
      where: { id: existing.id },
      data: validated.value,
    });

    return NextResponse.json({ video });
  } catch (err: unknown) {
    if (prismaErrorCode(err) === 'P2025') {
      return NextResponse.json({ error: 'Video bulunamadı.' }, { status: 404 });
    }
    console.error(`[PATCH /api/videos/${id} in admin]`, err);
    return NextResponse.json({ error: 'Video güncellenemedi.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Context) {
  const guard = await requireAdminSession({ capability: 'videos:delete', request });
  if (!guard.ok) return guard.response;

  const { id } = await params;

  try {
    const existing = await prisma.video.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Video bulunamadı.' }, { status: 404 });
    }

    await prisma.video.delete({ where: { id: existing.id } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (prismaErrorCode(err) === 'P2025') {
      return NextResponse.json({ error: 'Video bulunamadı.' }, { status: 404 });
    }
    console.error(`[DELETE /api/videos/${id} in admin]`, err);
    return NextResponse.json({ error: 'Video silinemedi.' }, { status: 500 });
  }
}
