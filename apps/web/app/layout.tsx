import type { Metadata } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { getSiteSettings, getWhatsAppHref, getInstagramHref } from '@/lib/site-settings';
import { jsonLd, siteUrl } from '@/lib/seo';

export const dynamic = 'force-dynamic';

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
    ...(settings.address ? { address: settings.address } : {}),
    ...(instagram ? { sameAs: [instagram] } : {}),
  };
  return (
    <html lang="tr" className={`${cormorant.variable} ${inter.variable}`}>
      <body>
        <a className="skip-link" href="#main-content">İçeriğe geç</a>
        <Header contactHref={getWhatsAppHref(settings.whatsapp)} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(organization) }} />
        <main id="main-content">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
