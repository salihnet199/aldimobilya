import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { requireAdminSession } from '@/lib/auth-guard';
import { limitedBodyErrorStatus, readLimitedBody } from '@/lib/request-body';
import { parseMultipartFormData } from '@/lib/upload-body';
import {
  UPLOAD_MULTIPART_OVERHEAD_BYTES,
  allowedFormatListForKind,
  buildUploadPublicId,
  isAllowedUploadMime,
  matchesDeclaredType,
  maxBytesForKind,
  maxBytesForMime,
  mimeMatchesKind,
  resolveUploadFolder,
  resolveUploadKind,
} from '@/lib/validation';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  width?: number;
  height?: number;
  format?: string;
  resource_type: string;
}

const MB = 1024 * 1024;

/**
 * Server-side Cloudinary upload. Used as the fallback when the direct signed
 * browser upload cannot complete. Admin-only, MIME allowlisted, size capped and
 * content-sniffed so a renamed payload cannot masquerade as media.
 *
 * The multipart body is read through a hard byte budget *before* it is parsed,
 * because `request.formData()` would otherwise buffer an unbounded payload.
 * `kind` is read from the query string so the budget is known up front.
 */
export async function POST(request: Request) {
  // Authenticate first — session + live DB role, with the `upload` capability —
  // before touching the body.
  const guard = await requireAdminSession({ capability: 'upload', request });
  if (!guard.ok) return guard.response;

  if (
    !process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    console.error('[POST /api/upload] Missing Cloudinary environment variables');
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

  const maxBodyBytes = maxBytesForKind(kind) + UPLOAD_MULTIPART_OVERHEAD_BYTES;
  const limited = await readLimitedBody(request, maxBodyBytes);
  if (!limited.ok) {
    return NextResponse.json(
      {
        error:
          limited.reason === 'too_large'
            ? 'Yüklenen dosya izin verilen boyutu aşıyor.'
            : 'İstek gövdesi okunamadı.',
      },
      { status: limitedBodyErrorStatus(limited.reason) },
    );
  }
  if (limited.byteLength === 0) {
    return NextResponse.json({ error: 'İstek gövdesi bulunamadı.' }, { status: 400 });
  }

  try {
    const formData = await parseMultipartFormData(
      limited.bytes,
      request.headers.get('content-type'),
    );
    if (!formData) {
      return NextResponse.json({ error: 'Geçersiz form verisi.' }, { status: 400 });
    }

    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Dosya bulunamadı.' }, { status: 400 });
    }

    const mime = (file.type || '').toLowerCase();
    if (!isAllowedUploadMime(mime) || !mimeMatchesKind(kind, mime)) {
      return NextResponse.json(
        { error: 'Desteklenmeyen dosya türü.' },
        { status: 415 },
      );
    }

    const maxBytes = maxBytesForMime(mime);
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: `Dosya boyutu en fazla ${Math.round(maxBytes / MB)} MB olabilir.` },
        { status: 413 },
      );
    }

    const folderResult = resolveUploadFolder(formData.get('folder'));
    if (!folderResult.ok) {
      return NextResponse.json({ error: folderResult.error }, { status: 400 });
    }
    const folder = folderResult.value;

    const buffer = Buffer.from(await file.arrayBuffer());

    // Trust the bytes, not the multipart Content-Type.
    if (!matchesDeclaredType(mime, buffer.subarray(0, 16))) {
      return NextResponse.json(
        { error: 'Dosya içeriği belirtilen türle uyuşmuyor.' },
        { status: 415 },
      );
    }

    const publicIdResult = buildUploadPublicId(kind, crypto.randomUUID());
    if (!publicIdResult.ok) {
      return NextResponse.json({ error: 'Yükleme başarısız.' }, { status: 500 });
    }

    const isVideo = kind === 'video';

    const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: isVideo ? 'video' : 'image',
          public_id: publicIdResult.value,
          overwrite: false,
          allowed_formats: allowedFormatListForKind(kind),
          ...(isVideo ? {} : { quality: 'auto', fetch_format: 'auto' }),
        },
        (error, uploadResult) => {
          if (error || !uploadResult) reject(error ?? new Error('Empty Cloudinary response'));
          else resolve(uploadResult as CloudinaryUploadResult);
        },
      );
      uploadStream.end(buffer);
    });

    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      resourceType: result.resource_type,
    });
  } catch (err: unknown) {
    console.error('[POST /api/upload]', err);
    return NextResponse.json({ error: 'Yükleme başarısız.' }, { status: 500 });
  }
}
