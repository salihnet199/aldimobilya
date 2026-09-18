import type { MetadataRoute } from 'next';
import { prisma } from '@aldimobilya/db';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://aldimobilya.com';

// Rooms are added and hidden from the admin panel. The sitemap is regenerated
// hourly rather than per request, so crawlers still discover new models
// quickly without a database query on every hit.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/katalog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${siteUrl}/medya`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${siteUrl}/hakkimizda`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${siteUrl}/iletisim`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
  ];

  // Only rooms flagged as visible on the public site are listed.
  let roomPages: MetadataRoute.Sitemap = [];
  try {
    const rooms = await prisma.room.findMany({
      where: { isVisible: true },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    });
    roomPages = rooms.map((room) => ({
      url: `${siteUrl}/katalog/${room.slug}`,
      lastModified: room.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.8,
    }));
  } catch (err) {
    console.error('[sitemap] rooms query failed:', err);
  }

  return [...staticPages, ...roomPages];
}
