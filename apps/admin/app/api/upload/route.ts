import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

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

export async function POST(request: Request) {
  try {
    if (
      !process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      console.error('[POST /api/upload] Missing Cloudinary environment variables');
      return NextResponse.json(
        { error: 'Sunucu yapılandırma hatası / Server misconfiguration' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) ?? 'aldimobilya/rooms';

    if (!file) {
      return NextResponse.json({ error: 'Dosya bulunamadı / No file provided' }, { status: 400 });
    }

    const isVideo = file.type.startsWith('video/');

    // Convert File to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload via stream to Cloudinary (reliable for memory & avoids massive base64 strings)
    const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: isVideo ? 'video' : 'auto',
          ...(isVideo ? {} : { quality: 'auto', fetch_format: 'auto' }),
        },
        (error, uploadResult) => {
          if (error || !uploadResult) reject(error ?? new Error('Empty Cloudinary response'));
          else resolve(uploadResult as CloudinaryUploadResult);
        }
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
    const message = err instanceof Error ? err.message : String(err);
    console.error('[POST /api/upload] Error:', message);
    return NextResponse.json({ error: 'Yükleme başarısız: ' + message }, { status: 500 });
  }
}
