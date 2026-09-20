import type { NextConfig } from 'next';

const csp = [
  "default-src 'self'", "base-uri 'self'", "object-src 'none'", "frame-ancestors 'none'",
  "form-action 'self'", "script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''),
  "style-src 'self' 'unsafe-inline'", "font-src 'self' data:", "img-src 'self' https: data: blob:",
  "media-src 'self' https: blob:", "connect-src 'self' https:",
  "frame-src https://www.youtube-nocookie.com https://player.vimeo.com",
].join('; ');
const nextConfig: NextConfig = {
  poweredByHeader: false,
  transpilePackages: ['@aldimobilya/db', '@aldimobilya/types'],
  // Every page already opts out of server-side caching (revalidate = 0),
  // but Next's *client-side* router cache still held onto visited pages
  // for its default 5-minute window regardless — so admin edits appeared
  // instantly on a hard refresh but could take up to 5 minutes to show
  // up when navigating via <Link> without one. Disabling it here matches
  // the revalidate=0 intent everywhere, not just on the server.
  experimental: {
    staleTimes: { dynamic: 0, static: 30 },
  },
  images: {
    // Cloudinary images are delivered via a custom loader (apps/web/lib/media.ts).
    // remotePatterns still needed for Next.js to allow the hostname in <Image src>.
    remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' }],
    formats: ['image/avif', 'image/webp'],
    // Full responsive breakpoint ladder.  The custom loader maps these widths
    // to Cloudinary w_<N>,c_limit transformations automatically.
    deviceSizes: [360, 480, 640, 768, 1024, 1280, 1440, 1600, 1920, 2560],
    imageSizes: [64, 96, 128, 160, 240, 320, 400, 480],
  },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'Content-Security-Policy', value: csp },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
    ] }];
  },
};
export default nextConfig;
