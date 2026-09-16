import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { requireAdminSession } from '@/lib/auth-guard';
import { trustedOriginsFromEnv } from '@/lib/origin';
import {
  UPLOAD_PRESET_ENV_VARS,
  buildDirectUploadEndpoint,
  buildSignedUploadParams,
  isCrossSiteRequest,
  resolveUploadPreset,
} from '@/lib/upload-direct';
import {
  allowedFormatsForKind,
  buildUploadPublicId,
  resolveUploadFolder,
  resolveUploadKind,
} from '@/lib/validation';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Issues a short-lived signature for the direct browser -> Cloudinary upload
 * flow used by the admin UI. The secret never leaves the server.
 *
 * The signature covers the folder, timestamp, a unique `public_id`,
 * `overwrite=false`, the kind's `allowed_formats` and the signed upload preset
 * that carries the provider-side `max_file_size`. `resource_type` is not signed
 * (Cloudinary keeps it in the endpoint path), so the kind is pinned through the
 * kind-specific endpoint returned to the browser instead of through `/auto`.
 */
export async function GET(request: Request) {
  // Authenticate first: session + live DB role, with the `upload` capability.
  const guard = await requireAdminSession({ capability: 'upload', request });
  if (!guard.ok) return guard.response;

  // A signature is a credential: a page on another origin must not be able to
  // mint one with the admin's cookies. The shared guard only runs its CSRF
  // check for unsafe methods, so GET needs its own — using the same trusted
  // origins the guard reads.
  if (isCrossSiteRequest(request, trustedOriginsFromEnv(process.env))) {
    return NextResponse.json(
      { error: 'Çapraz site imza isteği reddedildi.' },
      { status: 403 },
    );
  }

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.error('[GET /api/upload/sign] Missing Cloudinary environment variables');
    return NextResponse.json(
      { error: 'Sunucu yapılandırma hatası.' },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);

  const kindResult = resolveUploadKind(searchParams.get('kind'));
  if (!kindResult.ok) {
    return NextResponse.json({ error: kindResult.error }, { status: 400 });
  }
  const kind = kindResult.value;

  const folderResult = resolveUploadFolder(searchParams.get('folder'));
  if (!folderResult.ok) {
    return NextResponse.json({ error: folderResult.error }, { status: 400 });
  }
  const folder = folderResult.value;

  // Provider-side limits live on the signed upload preset. Without it a direct
  // upload could not be size-capped, so fail closed here and let the caller use
  // the smaller, server-validated fallback in POST /api/upload instead.
  const preset = resolveUploadPreset(kind, process.env);
  if (!preset) {
    console.error(
      `[GET /api/upload/sign] Missing or invalid ${UPLOAD_PRESET_ENV_VARS[kind]}; direct upload disabled`,
    );
    return NextResponse.json(
      {
        error:
          'Doğrudan yükleme yapılandırılmamış. Cloudinary hesabında imzalı bir yükleme ön ayarı (upload preset) oluşturup CLOUDINARY_IMAGE_UPLOAD_PRESET / CLOUDINARY_VIDEO_UPLOAD_PRESET ortam değişkenlerini tanımlayın.',
      },
      { status: 503 },
    );
  }

  const publicIdResult = buildUploadPublicId(kind, crypto.randomUUID());
  if (!publicIdResult.ok) {
    console.error('[GET /api/upload/sign] Could not build a unique public_id');
    return NextResponse.json({ error: 'İmza oluşturulamadı.' }, { status: 500 });
  }

  try {
    const timestamp = Math.round(Date.now() / 1000);
    const params = buildSignedUploadParams({
      folder,
      preset,
      publicId: publicIdResult.value,
      formats: allowedFormatsForKind(kind),
      timestamp,
    });

    const signature = cloudinary.utils.api_sign_request(params, apiSecret);

    return NextResponse.json(
      {
        signature,
        apiKey,
        cloudName,
        endpoint: buildDirectUploadEndpoint(cloudName, kind),
        resourceType: kind,
        // The browser must echo these exact name=value pairs alongside
        // `file`, `api_key` and `signature` — nothing more, nothing less.
        params,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err: unknown) {
    console.error('[GET /api/upload/sign]', err);
    return NextResponse.json(
      { error: 'İmza oluşturulamadı.' },
      { status: 500 },
    );
  }
}
