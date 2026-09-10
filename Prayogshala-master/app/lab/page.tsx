'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { EXPERIMENTS, SUBJECTS, type Subject } from '@/lib/experiments';
import { useT } from '@/hooks/useTranslation';
import Header from '@/components/shared/Header';
import ExperimentCard from '@/components/lab/ExperimentCard';

export default function LabPage() {
  const t = useT();
  const completed = useStore(s => s.completedExperiments);
  const [subject, setSubject] = useState<Subject | 'all'>('all');
  const completedCount = EXPERIMENTS.filter(exp => completed.some(result => result.experimentId === exp.id)).length;
  const visible = EXPERIMENTS.filter(exp => subject === 'all' || exp.subject === subject);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="mb-8 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('experiments.title')}</h1>
            <p className="mt-2 max-w-xl text-gray-500">{t('experiments.subtitle')}</p>
          </div>
          <div className="w-full rounded-2xl border border-blue-100 bg-white p-4 sm:w-64 sm:shrink-0">
            <p className="mb-2 text-sm font-semibold text-gray-700">{t('experiments.progress', { completed: completedCount, total: EXPERIMENTS.length })}</p>
            <progress className="h-2 w-full accent-blue-600" value={completedCount} max={EXPERIMENTS.length} aria-label={t('dash.title')} />
          </div>
        </div>
        <div role="group" aria-label={t('experiments.filter')} className="mb-4 flex flex-wrap gap-2">
          {(['all', ...SUBJECTS] as const).map(value => {
            const count = value === 'all' ? EXPERIMENTS.length : EXPERIMENTS.filter(exp => exp.subject === value).length;
            return <button key={value} type="button" aria-pressed={subject === value} onClick={() => setSubject(value)}
              className={`flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${subject === value ? 'border-blue-600 bg-blue-600 text-white shadow-sm' : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:bg-blue-50'}`}>
              {t(`subject.${value}`)}<span className={`rounded-full px-2 py-0.5 text-xs ${subject === value ? 'bg-white/20' : 'bg-gray-100'}`}>{count}</span>
            </button>;
          })}
        </div>
        <p role="status" className="mb-6 text-sm text-gray-500">{t('experiments.showing', { count: visible.length })}</p>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((exp, index) => <ExperimentCard key={exp.id} experiment={exp} index={index} />)}
        </div>
      </main>
    </div>
  );
}
