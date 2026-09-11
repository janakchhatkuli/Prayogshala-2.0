'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { EXPERIMENTS, SUBJECTS, type Subject } from '@/lib/experiments';
import { useT } from '@/hooks/useTranslation';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import ExperimentCard from '@/components/lab/ExperimentCard';
import { SectionLabel, SplitLines } from '@/components/shared/Reveal';

export default function LabPage() {
  const t = useT();
  const completed = useStore(s => s.completedExperiments);
  const [subject, setSubject] = useState<Subject | 'all'>('all');
  const [difficulty, setDifficulty] = useState<'all' | 'beginner' | 'intermediate'>('all');
  const completedCount = EXPERIMENTS.filter(exp => completed.some(r => r.experimentId === exp.id)).length;
  const visible = EXPERIMENTS.filter(exp => (subject === 'all' || exp.subject === subject) && (difficulty === 'all' || exp.difficulty === difficulty));
  const pct = Math.round((completedCount / EXPERIMENTS.length) * 100);

  return (
    <div className="flex min-h-screen flex-col bg-ink">
      <Header />
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-5 pb-24 pt-28 sm:px-8">
        <div className="grid gap-8 border-b border-line pb-10 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <SectionLabel>{t('labs.label')}</SectionLabel>
            <SplitLines as="h1" text={t('experiments.title')} className="display mt-5 text-4xl text-fg sm:text-6xl" />
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted sm:text-base">{t('experiments.subtitle')}</p>
          </div>
          <div className="rounded-lg border border-line bg-surface p-5">
            <div className="flex items-baseline justify-between">
              <span className="label text-muted">{t('experiments.progress', { completed: completedCount, total: EXPERIMENTS.length })}</span>
              <span className="num text-2xl text-fg">{pct}<span className="text-sm text-muted">%</span></span>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-line" role="progressbar" aria-label={t('dash.title')} aria-valuenow={completedCount} aria-valuemin={0} aria-valuemax={EXPERIMENTS.length}>
              <div className="h-full bg-accent transition-[width] duration-700" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 py-6 md:flex-row md:items-center md:justify-between">
          <div role="group" aria-label={t('experiments.filter')} className="flex flex-wrap gap-2">
            {(['all', ...SUBJECTS] as const).map(value => {
              const count = value === 'all' ? EXPERIMENTS.length : EXPERIMENTS.filter(e => e.subject === value).length;
              const active = subject === value;
              return (
                <button key={value} type="button" aria-pressed={active} onClick={() => setSubject(value)}
                  className={`label inline-flex h-9 items-center gap-2 rounded-md border px-3 transition-colors ${active ? 'border-fg bg-fg text-ink' : 'border-line-2 text-fg-2 hover:border-fg-2 hover:text-fg'}`}>
                  {t(`subject.${value}`)}<span className={`num ${active ? 'text-ink/60' : 'text-muted-2'}`}>{count}</span>
                </button>
              );
            })}
          </div>
          <div role="group" aria-label={t('experiments.difficulty')} className="flex gap-2">
            {(['all', 'beginner', 'intermediate'] as const).map(value => (
              <button key={value} type="button" aria-pressed={difficulty === value} onClick={() => setDifficulty(value)}
                className={`label inline-flex h-9 items-center rounded-md px-3 transition-colors ${difficulty === value ? 'bg-surface-3 text-fg' : 'text-muted hover:text-fg'}`}>
                {value === 'all' ? t('subject.all') : t(`exp.difficulty.${value}`)}
              </button>
            ))}
          </div>
        </div>

        <p role="status" className="label mb-5 text-muted-2">{t('experiments.showing', { count: visible.length })}</p>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((exp, index) => <ExperimentCard key={exp.id} experiment={exp} index={index} />)}
        </div>
      </main>
      <Footer />
    </div>
  );
}
