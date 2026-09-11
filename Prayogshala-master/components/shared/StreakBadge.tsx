'use client';
import { Flame } from 'lucide-react';
import { useT } from '@/hooks/useTranslation';

interface Props {
  streak: number;
}

export default function StreakBadge({ streak }: Props) {
  const t = useT();
  if (streak === 0) return null;

  return (
    <div
      className="flex h-9 items-center gap-1.5 rounded-md border border-orange-200 bg-orange-50 px-2.5 text-sm font-semibold text-orange-700"
      title={`${streak} ${t('nav.streak')}`}
    >
      <Flame className="h-4 w-4" aria-hidden="true" />
      <span>{streak}</span>
    </div>
  );
}
