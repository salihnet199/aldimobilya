import type { Metadata } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import './globals.css';
import '@/lib/motion/motion-presets.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CursorLayer from '@/components/ui/CursorLayer';
import RouteFade from '@/components/ui/RouteFade';
import WhatsAppButton from '@/components/ui/WhatsAppButton';
import { getSiteSettings, getWhatsAppHref, getInstagramHref } from '@/lib/site-settings';
import { jsonLd, siteUrl } from '@/lib/seo';

// Settings are admin-managed; ISR refreshes them within 5 minutes while every
// page stays CDN-cached instead of hitting Postgres per request.
export const revalidate = 0;

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'ALDi Mobilya | Lüks Yatak Odası Tasarımları',
    template: '%s | ALDi Mobilya',
  },
  description:
    'ALDi Mobilya — El işçiliğiyle üretilen lüks yatak odası takımları. Kalite, estetik ve özgünlük bir arada.',
  keywords: ['yatak odası', 'mobilya', 'lüks', 'aldi mobilya', 'yatak odası takımı'],
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    siteName: 'ALDi Mobilya',
    images: [{ url: '/logo.jpg', alt: 'ALDi Mobilya' }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/logo.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSiteSettings();
  const instagram = getInstagramHref(settings.instagram);
  const organization = {
    '@context': 'https://schema.org', '@type': 'FurnitureStore',
    '@id': `${siteUrl}/#organization`, name: 'ALDI MOBİLYA', url: siteUrl,
    logo: `${siteUrl}/logo.jpg`,
    ...(settings.phone ? { telephone: settings.phone } : {}),
    ...(settings.email ? { email: settings.email } : {}),
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Süleymaniye OSB, 3. Cadde No:7',
      addressLocality: 'İnegöl',
      addressRegion: 'Bursa',
      addressCountry: 'TR',
    },
    ...(instagram ? { sameAs: [instagram] } : {}),
  };
  return (
    <html lang="tr" className={`${cormorant.variable} ${inter.variable}`}>
      <body>
        <a className="skip-link" href="#main-content">İçeriğe geç</a>
        <Header contactHref={getWhatsAppHref(settings.whatsapp)} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(organization) }} />
        <main id="main-content">
          <RouteFade>{children}</RouteFade>
        </main>
        <Footer />
        <CursorLayer />
        <WhatsAppButton href={getWhatsAppHref(settings.whatsapp) ?? ''} />
      </body>
    </html>
  );
}

