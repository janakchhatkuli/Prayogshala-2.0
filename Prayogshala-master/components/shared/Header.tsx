'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FlaskConical } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useT } from '@/hooks/useTranslation';
import LanguageToggle from './LanguageToggle';
import StreakBadge from './StreakBadge';
import { cn } from '@/lib/utils';

export default function Header() {
  const t = useT();
  const streak = useStore((s) => s.streak);
  const locale = useStore((s) => s.locale);
  const pathname = usePathname();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const navLinks = [
    { href: '/lab', label: t('nav.lab') },
    { href: '/dashboard', label: t('nav.dashboard') },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-x-2 gap-y-1 px-4 py-2 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-primary-600 hover:opacity-80 transition-opacity">
          <FlaskConical className="h-6 w-6" />
          <span className="text-lg">PrayogShala</span>
          <span className="hidden text-sm font-normal text-gray-400 sm:inline">| प्रयोगशाला</span>
        </Link>

        <nav aria-label={t('nav.main')} className="order-3 flex w-full items-center gap-1 border-t border-gray-100 pt-2 sm:order-none sm:ml-auto sm:w-auto sm:border-0 sm:pt-0">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href || pathname.startsWith(`${href}/`) ? 'page' : undefined}
              className={cn(
                'flex min-h-11 flex-1 items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:flex-none',
                pathname === href || pathname.startsWith(`${href}/`)
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-3">
          {streak > 0 && <span className="hidden md:inline-flex"><StreakBadge streak={streak} /></span>}
          <LanguageToggle />
        </div>
      </div>
    </header>
  );
}
