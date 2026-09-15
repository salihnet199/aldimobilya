import type { Metadata } from 'next';
import HeroSection from '@/components/home/HeroSection';
import FeaturedRooms from '@/components/home/FeaturedRooms';
import AboutSnippet from '@/components/home/AboutSnippet';
import InstagramSection from '@/components/home/InstagramSection';
import ContactBanner from '@/components/home/ContactBanner';

export const metadata: Metadata = {
  title: 'ALDi Mobilya | Lüks Yatak Odası Tasarımları',
  description:
    'ALDi Mobilya, el işçiliğiyle üretilen lüks yatak odası takımları sunar. Kalite, estetik ve özgünlüğü bir arada keşfedin.',
};

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <FeaturedRooms />
      <AboutSnippet />
      <InstagramSection />
      <ContactBanner />
    </>
  );
}
