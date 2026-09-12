'use client';
import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { IconSun, IconMoon } from '@/components/icons';

/** Keeps <html data-theme> in sync with the persisted preference. Mounted once in the root layout. */
export function ThemeSync() {
  const theme = useStore(s => s.theme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return null;
}

export default function ThemeToggle() {
  const theme = useStore(s => s.theme);
  const setTheme = useStore(s => s.setTheme);
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md text-fg-2 transition-colors hover:bg-surface-2 hover:text-fg"
    >
      {theme === 'dark' ? <IconSun size={17} /> : <IconMoon size={17} />}
    </button>
  );
}
