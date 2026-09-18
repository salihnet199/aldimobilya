import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import HeroSection from '@/components/home/HeroSection';
import LatestMasterpieces from '@/components/home/LatestMasterpieces';
import WhyUs from '@/components/home/WhyUs';
import CategoryGroups from '@/components/home/CategoryGroups';
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
      <LatestMasterpieces />
      <WhyUs />
      <CategoryGroups />
      <AboutSnippet />
      <InstagramSection />
      <ContactBanner />
    </>
  );
}
