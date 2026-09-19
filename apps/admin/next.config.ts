import type { NextConfig } from 'next';

const csp = [
  "default-src 'self'", "base-uri 'self'", "object-src 'none'", "frame-ancestors 'none'", "form-action 'self'",
  "script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''),
  "style-src 'self' 'unsafe-inline'", "font-src 'self' data:",
  "img-src 'self' https: data: blob:", "media-src 'self' https: blob:",
  "connect-src 'self' https://api.cloudinary.com", "frame-src 'none'",
].join('; ');
const nextConfig: NextConfig = {
  poweredByHeader: false,
  transpilePackages: ['@aldimobilya/db'],
  experimental: {
    staleTimes: { dynamic: 0, static: 30 },
  },
  images: { remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' }] },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'Content-Security-Policy', value: csp },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
      { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
      { key: 'Cache-Control', value: 'private, no-store' },
    ] }];
  },
};
export default nextConfig;
