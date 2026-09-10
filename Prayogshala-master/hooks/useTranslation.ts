'use client';
import { useStore } from '@/lib/store';
import { createT } from '@/lib/translations';

export function useT() {
  const locale = useStore((s) => s.locale);
  return createT(locale);
}
