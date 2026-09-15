import type { Metadata } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className={`${cormorant.variable} ${inter.variable}`}>
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
