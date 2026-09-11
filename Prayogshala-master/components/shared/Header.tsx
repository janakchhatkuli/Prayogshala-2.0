'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { useT } from '@/hooks/useTranslation';
import LanguageToggle from './LanguageToggle';
import { LogoMark, IconMenu, IconClose, IconUser } from '@/components/icons';
import { cn } from '@/lib/utils';

export default function Header({ transparent = false }: { transparent?: boolean }) {
  const t = useT();
  const locale = useStore(s => s.locale);
  const session = useStore(s => s.session);
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => { setOpen(false); }, [pathname]);

  const links = [
    { href: '/lab', label: t('nav.lab') },
    { href: '/#about', label: t('nav.about') },
    { href: '/#process', label: t('nav.process') },
    { href: '/dashboard', label: t('nav.dashboard') },
    { href: '/contact', label: t('nav.contact') },
  ];
  const isActive = (href: string) => !href.includes('#') && (pathname === href || pathname.startsWith(`${href}/`));
  const solid = !transparent || scrolled || open;

  return (
    <header className={cn('fixed inset-x-0 top-0 z-50 transition-colors duration-300', solid ? 'border-b border-line bg-ink/85 backdrop-blur-md' : 'border-b border-transparent bg-transparent')}>
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3 text-fg transition-opacity hover:opacity-80">
          <LogoMark size={26} />
          <span className="font-display text-[17px] font-semibold uppercase tracking-tight">PrayogShala</span>
        </Link>

        <nav aria-label={t('nav.main')} className="hidden items-center gap-1 lg:flex">
          {links.map(l => (
            <Link key={l.href} href={l.href} aria-current={isActive(l.href) ? 'page' : undefined}
              className={cn('label rounded px-3 py-2 transition-colors', isActive(l.href) ? 'text-fg' : 'text-fg-2 hover:text-fg')}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageToggle />
          {session ? (
            <Link href="/dashboard" className="label hidden h-9 items-center gap-2 rounded-md border border-line-2 px-3 text-fg-2 transition-colors hover:border-fg-2 hover:text-fg sm:inline-flex">
              <IconUser size={14} />
              <span className="max-w-[9rem] truncate normal-case tracking-normal">{session.name.split(' ')[0]}</span>
            </Link>
          ) : (
            <Link href="/login" className="btn btn-sm btn-light hidden sm:inline-flex">{t('nav.login')}</Link>
          )}
          <button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open} aria-label="Menu" className="inline-flex h-9 w-9 items-center justify-center rounded-md text-fg lg:hidden">
            {open ? <IconClose size={20} /> : <IconMenu size={20} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            aria-label={t('nav.main')}
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-line bg-ink lg:hidden"
          >
            <div className="flex flex-col px-5 py-4 sm:px-8">
              {links.map(l => (
                <Link key={l.href} href={l.href} className="display border-b border-line py-4 text-2xl text-fg">{l.label}</Link>
              ))}
              <Link href={session ? '/dashboard' : '/login'} className="btn btn-accent mt-5">{session ? session.name : t('nav.login')}</Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
