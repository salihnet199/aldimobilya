import { NextResponse } from 'next/server';

/**
 * Public uploads are disabled.
 *
 * The public site is read-only; media is uploaded from the authenticated admin
 * app through the signed Cloudinary flow (`apps/admin/app/api/upload/sign`).
 * This route stays in place to answer with an explicit 403 rather than a
 * generic 405/404, so the intent is unambiguous.
 */
export function POST() {
  return NextResponse.json(
    { error: 'Yükleme yalnızca yönetim panelinden yapılabilir.' },
    { status: 403 },
  );
}
