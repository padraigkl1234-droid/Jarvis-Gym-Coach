import type { Metadata, Viewport } from 'next';
import { Newsreader, Hanken_Grotesk } from 'next/font/google';
import './globals.css';
import { RegisterSW } from '@/components/RegisterSW';
import { AuthProvider } from '@/components/AuthProvider';

export const metadata: Metadata = {
  title: 'VALORIS',
  description: 'Your personal coach for training, nutrition, and body tracking',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'VALORIS' },
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
  themeColor: '#F5F4EE',
};

// Calm Cream type pairing: an elegant serif for display, a clean grotesque for UI.
const serif = Newsreader({ subsets: ['latin'], variable: '--font-display', display: 'swap', style: ['normal', 'italic'] });
const sans = Hanken_Grotesk({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body className="bg-canvas font-sans text-ink antialiased">
        <AuthProvider>{children}</AuthProvider>
        <RegisterSW />
      </body>
    </html>
  );
}
