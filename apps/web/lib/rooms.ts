import { prisma } from '@aldimobilya/db';

/**
 * Shared, read-only room catalogue access for the public site.
 *
 * The page (`app/katalog/page.tsx`) and the API (`app/api/rooms/route.ts`)
 * answer the same question, so the query and the category derivation live here
 * once. Hidden rooms (`isVisible: false`) are always excluded in the query
 * itself, never filtered afterwards, so a hidden model is indistinguishable
 * from a missing one.
 */

export interface PublicRoomQuery {
  category?: string | null;
  search?: string | null;
  featured?: boolean;
}

export interface PublicRoomList {
  rooms: Array<{
    id: string;
    slug: string;
    nameTr: string;
    nameEn: string | null;
    descTr: string | null;
    descEn: string | null;
    specs: unknown;
    isVisible: boolean;
    isFeatured: boolean;
    heroImage: string;
    video: string | null;
    category: string | null;
    viewCount: number;
    createdAt: Date;
    updatedAt: Date;
    images: Array<{ id: string; url: string; alt: string | null; order: number }>;
  }>;
  categories: string[];
}

export async function listPublicRooms(
  query: PublicRoomQuery = {},
): Promise<PublicRoomList> {
  const { category, search, featured } = query;

  const where = {
    isVisible: true,
    ...(featured ? { isFeatured: true } : {}),
    ...(category ? { category } : {}),
    ...(search
      ? {
          OR: [
            { nameEn: { contains: search, mode: 'insensitive' as const } },
            { nameTr: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [rooms, allRooms] = await Promise.all([
    prisma.room.findMany({
      where,
      include: { images: { orderBy: { order: 'asc' } } },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.room.findMany({
      where: { isVisible: true },
      select: { category: true },
    }),
  ]);

  const categories = [
    ...new Set(allRooms.map((r) => r.category).filter((c): c is string => !!c)),
  ].sort();

  return { rooms, categories };
}

/**
 * Categories that currently have at least one visible room. Used by the
 * homepage group navigation so empty categories are never offered.
 */
export async function listPublicCategories(): Promise<string[]> {
  const allRooms = await prisma.room.findMany({
    where: { isVisible: true },
    select: { category: true },
  });
  return [
    ...new Set(allRooms.map((r) => r.category).filter((c): c is string => !!c)),
  ].sort();
}
