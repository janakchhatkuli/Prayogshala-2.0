import type { Metadata } from 'next';
import { Inter, Inter_Tight, JetBrains_Mono, Noto_Sans_Devanagari } from 'next/font/google';
import Preloader from '@/components/shared/Preloader';
import ViewTracker from '@/components/shared/ViewTracker';
import { ThemeSync } from '@/components/shared/ThemeToggle';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const interTight = Inter_Tight({
  variable: '--font-inter-tight',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
});

const notoDevanagari = Noto_Sans_Devanagari({
  variable: '--font-devanagari',
  subsets: ['devanagari'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PrayogShala | Nepal\'s Virtual Science Lab',
  description:
    'Practice physics, chemistry, and biology experiments virtually. Built for Nepali students in grades 9-12.',
  keywords: ['Nepal', 'science lab', 'virtual lab', 'chemistry', 'physics', 'biology', 'SEE', '+2'],
};

// Runs before hydration so a stored light preference does not flash dark.
const THEME_BOOT = `try{var s=JSON.parse(localStorage.getItem('prayogshala-storage')||'{}');var t=s&&s.state&&s.state.theme;if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t}}catch(e){}`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ne" data-theme="dark" suppressHydrationWarning className={`${inter.variable} ${interTight.variable} ${jetbrains.variable} ${notoDevanagari.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body className="min-h-screen bg-ink font-sans text-fg antialiased">
        <ThemeSync />
        <Preloader />
        <ViewTracker />
        {children}
      </body>
    </html>
  );
}
