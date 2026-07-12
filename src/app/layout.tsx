import type { Metadata, Viewport } from 'next';
import { Inter, Exo_2 } from 'next/font/google';
import './globals.css';
import { RegisterSW } from '@/components/RegisterSW';

export const metadata: Metadata = {
  title: 'VALORIS',
  description: 'Voice-operated AI fitness and diet coach',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'VALORIS' },
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
};

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
// Display face: Exo 2 — geometric and modern but softer than a full sci-fi face.
const exo = Exo_2({ subsets: ['latin'], variable: '--font-display', display: 'swap' });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${exo.variable}`}>
      <body className="bg-white font-sans text-black antialiased">
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
