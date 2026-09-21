import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { getCurrentUser } from '@/server/auth';
import AppShell from '@/components/layout/AppShell';
import ServiceWorkerRegister from '@/components/pwa/ServiceWorkerRegister';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Quizlet Clone - Học từ vựng & Spaced Repetition',
  description: 'Ứng dụng học từ vựng tiếng Anh cá nhân với Spaced Repetition và thẻ ghi nhớ.',
  applicationName: 'Quizlet Clone',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Quizlet',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#2563eb',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <ServiceWorkerRegister />
        <AppShell userEmail={user?.email}>{children}</AppShell>
      </body>
    </html>
  );
}

