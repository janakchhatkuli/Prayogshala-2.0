import type { Locale } from './store';
import en from '../messages/en.json';
import ne from '../messages/ne.json';

type Messages = typeof en;
export type MessageKey = keyof Messages;

const messages: Record<Locale, Messages> = { en, ne };

export function t(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const raw = (messages[locale] as Record<string, string>)[key]
    ?? (messages['en'] as Record<string, string>)[key]
    ?? key;
  if (!vars) return raw;
  return Object.entries(vars).reduce(
    (str, [k, v]) => str.replace(`{${k}}`, String(v)),
    raw
  );
}

export function createT(locale: Locale) {
  return (key: string, vars?: Record<string, string | number>) => t(locale, key, vars);
}
