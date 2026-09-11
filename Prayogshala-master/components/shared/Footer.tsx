'use client';
import Link from 'next/link';
import { useT } from '@/hooks/useTranslation';
import { LogoMark, IconArrowUpRight } from '@/components/icons';
import { EXPERIMENTS } from '@/lib/experiments';

export default function Footer() {
  const t = useT();
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-line bg-ink">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
        <div className="grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3 text-fg">
              <LogoMark size={28} />
              <span className="font-display text-lg font-semibold uppercase tracking-tight">PrayogShala</span>
            </div>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted">{t('footer.tagline')}</p>
            <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-2">
              {EXPERIMENTS.length} {t('hero.stat1')} / {t('footer.subjects')} / {t('footer.grades')}
            </p>
          </div>
          <FooterCol title={t('footer.pages')} links={[
            { href: '/lab', label: t('nav.lab') },
            { href: '/#about', label: t('nav.about') },
            { href: '/#process', label: t('nav.process') },
            { href: '/dashboard', label: t('nav.dashboard') },
          ]} />
          <FooterCol title={t('footer.account')} links={[
            { href: '/login', label: t('nav.login') },
            { href: '/contact', label: t('nav.contact') },
            { href: '/privacy', label: t('footer.privacy') },
          ]} />
          <div>
            <p className="eyebrow">{t('footer.contactTitle')}</p>
            <ul className="mt-4 space-y-2 text-sm text-fg-2">
              <li><a href="mailto:hello@prayogshala.np" className="hover:text-fg">hello@prayogshala.np</a></li>
              <li>Kathmandu, Nepal</li>
            </ul>
            <Link href="/contact" className="btn btn-ghost btn-sm mt-6">
              {t('footer.cta')} <IconArrowUpRight size={14} />
            </Link>
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-line py-6 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-2 sm:flex-row sm:items-center sm:justify-between">
          <span>&copy; {year} PrayogShala. {t('footer.rights')}</span>
          <span>{t('footer.prototype')}</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <p className="eyebrow">{title}</p>
      <ul className="mt-4 space-y-2.5">
        {links.map(l => (
          <li key={l.href}>
            <Link href={l.href} className="text-sm text-fg-2 transition-colors hover:text-fg">{l.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
