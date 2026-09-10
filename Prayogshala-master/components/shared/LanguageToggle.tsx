'use client';
import { useStore } from '@/lib/store';

export default function LanguageToggle() {
  const { locale, setLocale } = useStore();

  return (
    <button
      onClick={() => setLocale(locale === 'en' ? 'ne' : 'en')}
      className="flex items-center gap-0.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold shadow-sm hover:border-primary-200 hover:bg-primary-50 transition-colors"
      aria-label="Toggle language"
      title={locale === 'en' ? 'Switch to Nepali' : 'Switch to English'}
    >
      <span className={locale === 'ne' ? 'text-primary-600' : 'text-gray-400'}>ने</span>
      <span className="mx-1 text-gray-300">|</span>
      <span className={locale === 'en' ? 'text-primary-600' : 'text-gray-400'}>EN</span>
    </button>
  );
}
