// ALDi Mobilya - Shared Types

export interface Room {
  id: string;
  slug: string;
  nameTr: string;
  nameEn?: string;
  descTr?: string;
  descEn?: string;
  specs?: RoomSpecs;
  isVisible: boolean;
  isFeatured: boolean;
  heroImage: string;
  images: RoomImage[];
  video?: string;
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoomImage {
  id: string;
  url: string;
  alt?: string;
  order: number;
  roomId: string;
}

export interface RoomSpecs {
  material?: string;
  dimensions?: string;
  colors?: string[];
  style?: string;
  warranty?: string;
  [key: string]: string | string[] | undefined;
}

export interface Video {
  id: string;
  title: string;
  url: string;
  thumbnail?: string;
  isPublic: boolean;
  createdAt: Date;
}

export interface SiteSettings {
  id: string;
  whatsapp?: string;
  phone?: string;
  email?: string;
  address?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  youtube?: string;
  heroImage?: string;
  heroVideo?: string;
  heroTitleTr?: string;
  heroSubtitleTr?: string;
  metaDesc?: string;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'EDITOR';
  createdAt: Date;
}
