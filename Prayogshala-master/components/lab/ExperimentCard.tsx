'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { FlaskConical, Zap, Timer, Filter, Microscope, Droplets, Heart, ArrowRight, Clock, BookOpen, CheckCircle2, Hand } from 'lucide-react';
import type { Experiment } from '@/lib/experiments';
import { useStore } from '@/lib/store';
import { useT } from '@/hooks/useTranslation';

export const EXPERIMENT_ICONS = {
  flask: FlaskConical, zap: Zap, pendulum: Timer, filter: Filter,
  microscope: Microscope, droplets: Droplets, heart: Heart,
};

export default function ExperimentCard({ experiment: exp, index = 0 }: { experiment: Experiment; index?: number }) {
  const t = useT();
  const locale = useStore(s => s.locale);
  const done = useStore(s => s.completedExperiments.some(result => result.experimentId === exp.id));
  const Icon = EXPERIMENT_ICONS[exp.icon];

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="experiment-card flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
    >
      <div className={`relative flex h-36 items-center justify-center bg-gradient-to-br ${exp.gradient}`}>
        {done && <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/20 px-2.5 py-1 text-xs font-semibold text-white">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />{t('exp.completed')}
        </span>}
        <div className="rounded-2xl bg-white/20 p-4"><Icon className="h-10 w-10 text-white" aria-hidden="true" /></div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          <span className={`rounded-full px-2.5 py-1 font-semibold ${exp.subjectBg}`}>{t(`subject.${exp.subject}`)}</span>
          <span className="text-gray-500">{t(`exp.difficulty.${exp.difficulty}`)}</span>
        </div>
        <h3 className="mb-2 text-xl font-bold text-gray-900">{t(exp.nameKey)}</h3>
        <p className="mb-4 flex-1 text-sm leading-relaxed text-gray-500">{t(exp.descKey)}</p>
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
          <Hand className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
          <p>{t(exp.hintKey)}</p>
        </div>
        {locale === 'ne' && exp.panelLanguage === 'en' && <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">{t('exp.englishPanel')}</p>}
        <div className="mb-4 flex flex-wrap gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" aria-hidden="true" />{t(exp.gradeKey)}</span>
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden="true" />{t('exp.estimatedDuration', { minutes: exp.duration })}</span>
        </div>
        <Link href={`/lab/${exp.id}`} aria-label={`${done ? t('exp.repeat') : t('exp.start')}: ${t(exp.nameKey)}`}
          className={`flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${exp.gradient} px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600`}>
          {done ? t('exp.repeat') : t('exp.start')}<ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </motion.article>
  );
}
