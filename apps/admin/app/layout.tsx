import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });

export const metadata: Metadata = {
  title: { default: 'ALDi Mobilya — Admin', template: '%s | Admin' },
  description: 'ALDi Mobilya Yönetim Paneli',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={geist.variable}>
      <body>{children}</body>
    </html>
  );
}
