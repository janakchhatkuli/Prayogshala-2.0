'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import type { Experiment } from '@/lib/experiments';
import { useStore } from '@/lib/store';
import { useT } from '@/hooks/useTranslation';
import { EXPERIMENT_ICON_MAP, IconArrowUpRight, IconCheck, IconClock, IconBook } from '@/components/icons';

// Kept for older imports (dashboard history rows).
export const EXPERIMENT_ICONS = EXPERIMENT_ICON_MAP;

const TONE = {
  physics: { text: 'text-physics', border: 'border-physics/40', bg: 'bg-physics/10' },
  chemistry: { text: 'text-chemistry', border: 'border-chemistry/40', bg: 'bg-chemistry/10' },
  biology: { text: 'text-biology', border: 'border-biology/40', bg: 'bg-biology/10' },
} as const;

export default function ExperimentCard({ experiment: exp, index = 0 }: { experiment: Experiment; index?: number }) {
  const t = useT();
  const locale = useStore(s => s.locale);
  const done = useStore(s => s.completedExperiments.some(r => r.experimentId === exp.id));
  const Icon = EXPERIMENT_ICON_MAP[exp.icon];
  const tone = TONE[exp.subject];

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }}
      transition={{ delay: (index % 6) * 0.05, duration: 0.5 }}
      className="experiment-card flex flex-col rounded-lg border border-line bg-surface"
    >
      <Link href={`/lab/${exp.id}`} className="flex flex-1 flex-col p-5 outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label={`${done ? t('exp.repeat') : t('exp.start')}: ${t(exp.nameKey)}`}>
        <div className="flex items-start justify-between gap-3">
          <span className={`inline-flex h-11 w-11 items-center justify-center rounded-md border bg-ink ${tone.border} ${tone.text}`}>
            <Icon size={20} />
          </span>
          <div className="flex items-center gap-2">
            {done && (
              <span className="label inline-flex items-center gap-1 rounded border border-ok/40 bg-ok/10 px-1.5 py-0.5 text-ok">
                <IconCheck size={11} /> {t('exp.completedShort')}
              </span>
            )}
            <IconArrowUpRight size={18} className="card-arrow text-muted" />
          </div>
        </div>

        <p className={`label mt-5 ${tone.text}`}>{t(`subject.${exp.subject}`)} <span className="text-muted-2">/ {t(`exp.difficulty.${exp.difficulty}`)}</span></p>
        <h3 className="display mt-1.5 text-xl text-fg">{t(exp.nameKey)}</h3>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{t(exp.descKey)}</p>

        {locale === 'ne' && exp.panelLanguage === 'en' && (
          <p className="mt-3 rounded border border-warn/30 bg-warn/10 px-2.5 py-1.5 text-xs leading-relaxed text-warn">{t('exp.englishPanel')}</p>
        )}

        <div className="label mt-5 flex flex-wrap items-center gap-4 border-t border-line pt-4 text-muted">
          <span className="inline-flex items-center gap-1.5"><IconBook size={13} /> {t(exp.gradeKey)}</span>
          <span className="inline-flex items-center gap-1.5"><IconClock size={13} /> {t('exp.estimatedDuration', { minutes: exp.duration })}</span>
        </div>
      </Link>
    </motion.article>
  );
}
