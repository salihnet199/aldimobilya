import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'e8kfofqy',
  api_key: process.env.CLOUDINARY_API_KEY || '838895849946721',
  api_secret: process.env.CLOUDINARY_API_SECRET || '8SZEVlo9zB0WCvzZkGzwj_dpicI',
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder') || 'aldimobilya/rooms';
    const timestamp = Math.round(new Date().getTime() / 1000);

    const apiSecret = process.env.CLOUDINARY_API_SECRET || '8SZEVlo9zB0WCvzZkGzwj_dpicI';
    const signature = cloudinary.utils.api_sign_request({ folder, timestamp }, apiSecret);

    return NextResponse.json({
      signature,
      timestamp,
      apiKey: process.env.CLOUDINARY_API_KEY || '838895849946721',
      cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'e8kfofqy',
      folder,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[GET /api/upload/sign] Error:', message);
    return NextResponse.json({ error: 'Signature generation failed: ' + message }, { status: 500 });
  }
}
