'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Flame, Award, BookOpen, ArrowRight } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useT } from '@/hooks/useTranslation';
import Header from '@/components/shared/Header';
import { formatDate } from '@/lib/utils';
import { EXPERIMENTS, getExperiment } from '@/lib/experiments';
import { EXPERIMENT_ICONS } from '@/components/lab/ExperimentCard';

const BADGE_META = {
  'first-titration': { emoji: '🧪', color: 'bg-blue-50 border-blue-200' },
  'triple-scientist': { emoji: '🔬', color: 'bg-purple-50 border-purple-200' },
  'steady-hands': { emoji: '🎯', color: 'bg-green-50 border-green-200' },
} as const;

export default function DashboardPage() {
  const t = useT();
  const { completedExperiments, streak, badges } = useStore();
  const completedCount = EXPERIMENTS.filter(exp => completedExperiments.some(result => result.experimentId === exp.id)).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {t('dash.title')}
          </h1>
          <p className="text-gray-500 mt-1">
            {t('dash.localProfile')}
          </p>
          <p className="mt-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm leading-relaxed text-gray-500">{t('dash.localNotice')}</p>
        </div>

        {/* Stats row */}
        <div className="grid gap-4 mb-8 sm:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-orange-50 border border-orange-200 p-5 flex items-center gap-4"
          >
            <div className="rounded-xl bg-orange-100 p-3">
              <Flame className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{streak}</div>
              <div className="text-sm text-gray-500">{t('dash.streak')}</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl bg-blue-50 border border-blue-200 p-5 flex items-center gap-4"
          >
            <div className="rounded-xl bg-blue-100 p-3">
              <BookOpen className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{completedCount}<span className="text-base font-normal text-gray-400"> / {EXPERIMENTS.length}</span></div>
              <div className="text-sm text-gray-500">{t('dash.completed')}</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl bg-purple-50 border border-purple-200 p-5 flex items-center gap-4"
          >
            <div className="rounded-xl bg-purple-100 p-3">
              <Award className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{badges.length}</div>
              <div className="text-sm text-gray-500">{t('dash.badges')}</div>
            </div>
          </motion.div>
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('dash.badges')}</h2>
            <div className="flex gap-3 flex-wrap">
              {badges.map((badge) => {
                const meta = BADGE_META[badge as keyof typeof BADGE_META] ?? { emoji: '🏅', color: 'bg-gray-50 border-gray-200' };
                return (
                  <motion.div
                    key={badge}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`flex items-center gap-2 rounded-2xl border px-4 py-3 ${meta.color}`}
                  >
                    <span className="text-2xl">{meta.emoji}</span>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {t(`badge.${badge}` as `badge.${string}`)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {t(`badge.${badge}.desc` as `badge.${string}.desc`)}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Experiment history */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('dash.history')}</h2>
          {completedExperiments.length === 0 ? (
            <div className="rounded-2xl bg-white border border-gray-100 p-12 text-center">
              <BookOpen className="mx-auto h-10 w-10 text-gray-300 mb-3" />
              <p className="text-gray-400 mb-4">{t('dash.empty')}</p>
              <Link
                href="/lab"
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                {t('dash.go.lab')} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {completedExperiments.map((result, i) => {
                const meta = getExperiment(result.experimentId);
                const Icon = meta ? EXPERIMENT_ICONS[meta.icon] : BookOpen;
                return (
                  <motion.div
                    key={result.experimentId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex flex-wrap items-center gap-3 rounded-xl bg-white border border-gray-100 p-4 sm:gap-4"
                  >
                    <div className={`rounded-xl ${meta?.subjectBg ?? 'bg-gray-50 text-gray-600'} p-3`}>
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1 basis-36">
                      <div className="break-words font-semibold text-gray-900">{meta ? t(meta.nameKey) : result.experimentId}</div>
                      <div className="text-sm text-gray-400">{formatDate(result.completedAt)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-700">{result.score}%</div>
                      <div className="text-xs text-gray-400">{t('dash.score')}</div>
                    </div>
                    {meta && <Link
                      href={`/lab/${result.experimentId}`}
                      aria-label={`${t('exp.repeat')}: ${t(meta.nameKey)}`}
                      className="flex min-h-11 w-full items-center justify-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors sm:w-auto"
                    >
                      {t('exp.repeat')}
                    </Link>}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
