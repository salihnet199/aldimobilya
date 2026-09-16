import type { Metadata } from 'next';
import { safeMediaHref } from './media';

function configuredOrigin(): string {
  const value = process.env.NEXT_PUBLIC_SITE_URL || 'https://aldimobilya.com';
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('NEXT_PUBLIC_SITE_URL must be an HTTP(S) origin.');
  return url.origin;
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
