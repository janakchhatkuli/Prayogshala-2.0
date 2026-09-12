'use client';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { IconGlobe, IconChevron } from '@/components/icons';

const OPTIONS = [
  { value: 'en', label: 'English', short: 'EN' },
  { value: 'ne', label: 'नेपाली', short: 'NE' },
] as const;

export default function LanguageToggle({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const { locale, setLocale } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const current = OPTIONS.find(o => o.value === locale) ?? OPTIONS[0];
  const text = tone === 'dark' ? 'text-fg-2 hover:text-fg' : 'text-ink/80 hover:text-ink';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Language"
        className={`label inline-flex h-9 items-center gap-1.5 rounded-md px-2 transition-colors ${text}`}
      >
        <IconGlobe size={16} />
        <span className="hidden sm:inline">{current.short}</span>
        <IconChevron size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul role="listbox" aria-label="Language" className="absolute right-0 top-full z-50 mt-2 w-36 overflow-hidden rounded-md border border-line bg-surface p-1 shadow-2xl">
          {OPTIONS.map(o => (
            <li key={o.value} role="option" aria-selected={locale === o.value}>
              <button
                type="button"
                onClick={() => { setLocale(o.value); setOpen(false); }}
                className={`flex w-full items-center justify-between rounded px-2.5 py-2 text-left text-sm transition-colors ${locale === o.value ? 'bg-surface-3 text-fg' : 'text-fg-2 hover:bg-surface-2 hover:text-fg'}`}
              >
                <span>{o.label}</span>
                <span className="label text-muted">{o.short}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
