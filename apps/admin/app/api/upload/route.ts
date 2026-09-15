import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'e8kfofqy',
  api_key: process.env.CLOUDINARY_API_KEY || '838895849946721',
  api_secret: process.env.CLOUDINARY_API_SECRET || '8SZEVlo9zB0WCvzZkGzwj_dpicI',
});

export async function POST(request: Request) {
  try {
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
    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: isVideo ? 'video' : 'auto',
          ...(isVideo ? {} : { quality: 'auto', fetch_format: 'auto' }),
        },
        (error, uploadResult) => {
          if (error) reject(error);
          else resolve(uploadResult);
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
