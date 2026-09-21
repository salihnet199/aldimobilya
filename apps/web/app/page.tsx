import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { listPublicRooms } from '@/lib/rooms';
import { getSiteSettings } from '@/lib/site-settings';
import HeroSection from '@/components/home/HeroSection';
import BedroomShowcase from '@/components/home/BedroomShowcase';
import LatestMasterpieces from '@/components/home/LatestMasterpieces';
import LatestVideos from '@/components/home/LatestVideos';
import WhyUs from '@/components/home/WhyUs';
import CategoryGroups from '@/components/home/CategoryGroups';
import AboutSnippet from '@/components/home/AboutSnippet';
import InstagramSection from '@/components/home/InstagramSection';
import ContactBanner from '@/components/home/ContactBanner';

// Catalogue content is admin-authored; 5-minute ISR keeps pages CDN-cached.
export const revalidate = 0;

export const metadata: Metadata = pageMetadata(
  'Lüks Yatak Odası Tasarımları',
  'ALDi Mobilya, el işçiliğiyle üretilen lüks yatak odası takımları sunar. Kalite, estetik ve özgünlüğü bir arada keşfedin.',
  '/',
);

export default async function HomePage() {
  const [{ rooms: allRooms }, settings] = await Promise.all([
    listPublicRooms(),
    getSiteSettings(),
  ]);

  const bedroomRooms = allRooms.filter(
    (r) => !r.category || r.category.toLowerCase().includes('yatak') || r.category === 'yatak-odasi'
  );
  const showcaseRooms = bedroomRooms.length > 0 ? bedroomRooms : allRooms.slice(0, 5);

  return (
    <>
      <HeroSection />
      {showcaseRooms.length > 0 && (
        <BedroomShowcase rooms={showcaseRooms} whatsappNumber={settings.whatsapp} />
      )}
      <LatestMasterpieces />
      <LatestVideos />
      <WhyUs />
      <CategoryGroups />
      <AboutSnippet />
      <InstagramSection />
      <ContactBanner />
    </>
  );
}

