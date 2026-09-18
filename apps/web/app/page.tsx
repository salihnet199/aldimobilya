import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import HeroSection from '@/components/home/HeroSection';
import FeaturedRooms from '@/components/home/FeaturedRooms';
import WhyUs from '@/components/home/WhyUs';
import CategoryGroups from '@/components/home/CategoryGroups';
import LatestRooms from '@/components/home/LatestRooms';
import LatestVideos from '@/components/home/LatestVideos';
import AboutSnippet from '@/components/home/AboutSnippet';
import InstagramSection from '@/components/home/InstagramSection';
import ContactBanner from '@/components/home/ContactBanner';

// Catalogue content is admin-authored; 5-minute ISR keeps pages CDN-cached.
export const revalidate = 300;

export const metadata: Metadata = pageMetadata(
  'Lüks Yatak Odası Tasarımları',
  'ALDi Mobilya, el işçiliğiyle üretilen lüks yatak odası takımları sunar. Kalite, estetik ve özgünlüğü bir arada keşfedin.',
  '/',
);

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <FeaturedRooms />
      <WhyUs />
      <CategoryGroups />
      <LatestRooms />
      <LatestVideos />
      <AboutSnippet />
      <InstagramSection />
      <ContactBanner />
    </>
  );
}
