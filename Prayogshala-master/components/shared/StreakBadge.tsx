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
      className="flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-sm font-semibold text-orange-600 border border-orange-200"
      title={`${streak} ${t('nav.streak')}`}
    >
      <Flame className="h-4 w-4" />
      <span>{streak}</span>
    </div>
  );
}
