import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://aldimobilya.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/katalog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${siteUrl}/medya`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${siteUrl}/hakkimizda`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${siteUrl}/iletisim`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
  ];

  // Dynamic room pages (will work once DB is connected)
  const roomPages: MetadataRoute.Sitemap = [];
  try {
    // const rooms = await prisma.room.findMany({
    //   where: { isVisible: true },
    //   select: { slug: true, updatedAt: true },
    // });
    // roomPages = rooms.map((r) => ({
    //   url: `${siteUrl}/katalog/${r.slug}`,
    //   lastModified: r.updatedAt,
    //   changeFrequency: 'weekly',
    //   priority: 0.8,
    // }));
  } catch {
    // DB not yet connected — skip dynamic pages
  }

  return [...staticPages, ...roomPages];
}
