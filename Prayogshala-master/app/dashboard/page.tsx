'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { useT } from '@/hooks/useTranslation';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import { formatDate } from '@/lib/utils';
import { EXPERIMENTS, getExperiment } from '@/lib/experiments';
import { SectionLabel, CountUp } from '@/components/shared/Reveal';
import { EXPERIMENT_ICON_MAP, IconFlame, IconAward, IconBook, IconArrowUpRight, IconEye, IconFlask, IconMicroscope, IconCheck, IconUser } from '@/components/icons';

const BADGE_META = {
  'first-titration': { icon: IconFlask, tone: 'text-chemistry border-chemistry/40' },
  'triple-scientist': { icon: IconMicroscope, tone: 'text-biology border-biology/40' },
  'steady-hands': { icon: IconCheck, tone: 'text-ok border-ok/40' },
} as const;

export default function DashboardPage() {
  const t = useT();
  const router = useRouter();
  const { completedExperiments, streak, badges, session, viewLog, logout } = useStore();
  const completedCount = EXPERIMENTS.filter(exp => completedExperiments.some(r => r.experimentId === exp.id)).length;
  const labViews = viewLog.filter(v => v.experimentId);
  const viewsByLab = labViews.reduce<Record<string, number>>((acc, v) => { acc[v.experimentId!] = (acc[v.experimentId!] ?? 0) + 1; return acc; }, {});
  const topLabs = Object.entries(viewsByLab).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxViews = topLabs[0]?.[1] ?? 1;

  useEffect(() => {
    // Zustand persist hydrates after mount; wait one tick so a stored session is not misread as logged-out.
    const id = setTimeout(() => { if (!useStore.getState().session) router.replace('/login?next=/dashboard'); }, 60);
    return () => clearTimeout(id);
  }, [router]);

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col bg-ink"><Header />
        <div role="status" className="flex flex-1 items-center justify-center label text-muted">{t('loading')}</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-ink">
      <Header />
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-5 pb-24 pt-28 sm:px-8">
        <div className="flex flex-col gap-6 border-b border-line pb-10 md:flex-row md:items-end md:justify-between">
          <div>
            <SectionLabel>{t('dash.title')}</SectionLabel>
            <h1 className="display mt-5 text-4xl text-fg sm:text-6xl">{session.name}</h1>
            <p className="label mt-4 text-muted">{session.role === 'teacher' ? t('login.roleTeacher') : t('login.roleStudent')} / {t('dash.grade', { grade: session.grade })} / {session.school}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="label inline-flex h-9 items-center gap-2 rounded-md border border-line px-3 text-muted"><IconUser size={13} /> {session.email}</span>
            <button type="button" onClick={() => { logout(); router.push('/'); }} className="btn btn-ghost btn-sm">{t('nav.logout')}</button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-8 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: IconFlame, v: streak, l: t('dash.streak'), tone: 'text-accent' },
            { icon: IconBook, v: completedCount, l: t('dash.completed'), suffix: ` / ${EXPERIMENTS.length}`, tone: 'text-fg' },
            { icon: IconAward, v: badges.length, l: t('dash.badges'), tone: 'text-fg' },
            { icon: IconEye, v: viewLog.length, l: t('activity.views'), tone: 'text-fg' },
          ].map((s, i) => (
            <motion.div key={s.l} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="bg-surface p-6">
              <div className="flex items-center justify-between"><span className="label text-muted">{s.l}</span><s.icon size={16} className="text-muted" /></div>
              <p className={`display mt-6 text-5xl ${s.tone}`}><CountUp to={s.v} duration={1} />{s.suffix && <span className="text-xl text-muted-2">{s.suffix}</span>}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.3fr_1fr]">
          {/* History */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="display text-2xl text-fg">{t('dash.history')}</h2>
              <Link href="/lab" className="label inline-flex items-center gap-1.5 text-fg-2 hover:text-fg">{t('dash.go.lab')} <IconArrowUpRight size={13} /></Link>
            </div>
            {completedExperiments.length === 0 ? (
              <div className="rounded-lg border border-dashed border-line-2 p-12 text-center">
                <IconBook size={28} className="mx-auto text-muted-2" />
                <p className="mt-4 text-sm text-muted">{t('dash.empty')}</p>
                <Link href="/lab" className="btn btn-accent btn-sm mt-6">{t('dash.go.lab')}</Link>
              </div>
            ) : (
              <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
                {completedExperiments.slice().reverse().map(result => {
                  const meta = getExperiment(result.experimentId);
                  const Icon = meta ? EXPERIMENT_ICON_MAP[meta.icon] : IconBook;
                  return (
                    <li key={result.experimentId} className="flex flex-wrap items-center gap-4 px-5 py-4">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-line bg-ink text-fg-2"><Icon size={18} /></span>
                      <div className="min-w-0 flex-1 basis-40">
                        <p className="font-medium text-fg">{meta ? t(meta.nameKey) : result.experimentId}</p>
                        <p className="label mt-0.5 text-muted-2">{formatDate(result.completedAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="num text-xl text-fg">{result.score}<span className="text-xs text-muted">%</span></p>
                        <p className="label text-muted-2">{t('dash.score')}</p>
                      </div>
                      {meta && <Link href={`/lab/${result.experimentId}`} className="btn btn-ghost btn-sm">{t('exp.repeat')}</Link>}
                    </li>
                  );
                })}
              </ul>
            )}

            {badges.length > 0 && (
              <div className="mt-8">
                <h2 className="display mb-4 text-2xl text-fg">{t('dash.badges')}</h2>
                <div className="flex flex-wrap gap-3">
                  {badges.map(badge => {
                    const meta = BADGE_META[badge as keyof typeof BADGE_META] ?? { icon: IconAward, tone: 'text-fg border-line-2' };
                    const BadgeIcon = meta.icon;
                    return (
                      <div key={badge} className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3">
                        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-md border bg-ink ${meta.tone}`}><BadgeIcon size={16} /></span>
                        <div>
                          <p className="text-sm font-medium text-fg">{t(`badge.${badge}` as `badge.${string}`)}</p>
                          <p className="text-xs text-muted">{t(`badge.${badge}.desc` as `badge.${string}.desc`)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* Tracked activity */}
          <section>
            <h2 className="display mb-4 text-2xl text-fg">{t('activity.title').replace('\n', ' ')}</h2>
            <div className="rounded-lg border border-line bg-surface p-5">
              <p className="label text-muted">{t('activity.topLabs')}</p>
              {topLabs.length === 0 ? <p className="mt-4 text-sm text-muted">{t('activity.empty')}</p> : (
                <ul className="mt-4 space-y-3">
                  {topLabs.map(([id, count]) => {
                    const meta = getExperiment(id);
                    return (
                      <li key={id}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-fg-2">{meta ? t(meta.nameKey) : id}</span>
                          <span className="num text-muted">{count}</span>
                        </div>
                        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-line"><div className="h-full bg-accent" style={{ width: `${(count / maxViews) * 100}%` }} /></div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="mt-4 rounded-lg border border-line bg-surface">
              <p className="label border-b border-line px-5 py-3 text-muted">{t('activity.recent')}</p>
              <ul className="max-h-80 divide-y divide-line overflow-y-auto">
                {viewLog.slice(-20).reverse().map((v, i) => (
                  <li key={`${v.at}-${i}`} className="flex items-center justify-between px-5 py-2.5 text-sm">
                    <span className="num truncate text-fg-2">{v.path}</span>
                    <span className="label shrink-0 text-muted-2">{new Date(v.at).toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                  </li>
                ))}
                {viewLog.length === 0 && <li className="px-5 py-4 text-sm text-muted">{t('activity.empty')}</li>}
              </ul>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted-2">{t('dash.localNotice')}</p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
