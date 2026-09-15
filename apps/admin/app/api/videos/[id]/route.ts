import { NextResponse } from 'next/server';
import { prisma } from '@aldimobilya/db';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.video.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[DELETE /api/videos/[id]] Error:', msg);
    return NextResponse.json({ error: 'Video silinemedi: ' + msg }, { status: 500 });
  }
}
