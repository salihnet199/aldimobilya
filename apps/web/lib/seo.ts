import type { Metadata } from 'next';
import { safeMediaHref } from './media';

function configuredOrigin(): string {
  let raw = (process.env.NEXT_PUBLIC_SITE_URL || '').trim();

  // If running in production / on Vercel and the configured URL is empty or mistakenly localhost,
  // automatically fall back to Vercel production domain or the canonical production URL.
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  const isLocalHost = !raw || raw.includes('localhost') || raw.includes('127.0.0.1');

  if (isProduction && isLocalHost) {
    const vercelHost = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ||
                       process.env.VERCEL_PROJECT_PRODUCTION_URL ||
                       process.env.NEXT_PUBLIC_VERCEL_URL ||
                       process.env.VERCEL_URL;
    raw = vercelHost ? `https://${vercelHost}` : 'https://aldimobilya.vercel.app';
  } else if (!raw) {
    raw = 'https://aldimobilya.vercel.app';
  }

  if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
    raw = `https://${raw}`;
  }

  try {
    const url = new URL(raw);
    if (!['https:', 'http:'].includes(url.protocol)) {
      return 'https://aldimobilya.vercel.app';
    }
    return url.origin;
  } catch {
    return 'https://aldimobilya.vercel.app';
  }
}
export const siteUrl = configuredOrigin();
export function pageMetadata(title: string, description: string, path: string, image?: string | null): Metadata {
  const canonical = new URL(path, siteUrl).href;
  const safeImage = safeMediaHref(image);
  const images = [{ url: new URL(safeImage ?? '/logo.jpg', siteUrl).href, alt: title }];
  return {
    title, description,
    alternates: { canonical },
    openGraph: { type: 'website', locale: 'tr_TR', siteName: 'ALDI MOBİLYA', title, description, url: canonical, images },
    twitter: { card: 'summary_large_image', title, description, images: images.map((item) => item.url) },
  };
}
/** Escape HTML delimiters even when a database string contains a closing script tag. */
export function jsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}
