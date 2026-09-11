'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { EXPERIMENTS, SUBJECTS, type Subject } from '@/lib/experiments';
import { EXPERIMENT_FACTS } from '@/lib/experimentFacts';
import { useT } from '@/hooks/useTranslation';
import { useStore } from '@/lib/store';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import HeroScene from '@/components/home/HeroScene';
import BenchLauncher from '@/components/home/BenchLauncher';
import ExperimentCard from '@/components/lab/ExperimentCard';
import { Reveal, SplitLines, CountUp, SectionLabel } from '@/components/shared/Reveal';
import { IconArrowReturn, IconArrowUpRight, EXPERIMENT_ICON_MAP } from '@/components/icons';

const SUBJECT_TONE: Record<Subject, string> = { physics: 'text-physics', chemistry: 'text-chemistry', biology: 'text-biology' };

export default function HomePage() {
  const t = useT();
  const completed = useStore(s => s.completedExperiments);
  const viewLog = useStore(s => s.viewLog);

  return (
    <div className="flex min-h-screen flex-col bg-ink text-fg">
      <Header transparent />

      {/* ============ HERO ============ */}
      <section className="relative isolate overflow-hidden">
        <div className="plus-grid absolute inset-0 -z-10" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-64 bg-gradient-to-t from-ink to-transparent" aria-hidden="true" />
        <div className="mx-auto grid max-w-[1400px] items-center gap-10 px-5 pb-16 pt-32 sm:px-8 lg:min-h-[92vh] lg:grid-cols-[1fr_1.05fr] lg:pb-24 lg:pt-28">
          <div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <SectionLabel>{t('hero.badge')}</SectionLabel>
            </motion.div>
            <SplitLines as="h1" text={t('hero.title')} className="display mt-6 text-[2.75rem] text-fg sm:text-6xl lg:text-[5.25rem]" />
            <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.7 }} className="mt-7 max-w-md text-base leading-relaxed text-fg-2 sm:text-lg">
              {t('hero.subtitle')}
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65, duration: 0.7 }} className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/lab" className="btn btn-accent"><IconArrowReturn size={15} /> {t('hero.cta')}</Link>
              <a href="#bench" className="btn btn-ghost">{t('hero.cta2')}</a>
            </motion.div>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="label mt-6 text-muted-2">{t('hero.note')}</motion.p>
          </div>
          <motion.div initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }} className="relative">
            <HeroScene className="w-full drop-shadow-[0_40px_80px_rgba(0,0,0,.6)]" />
          </motion.div>
        </div>

        {/* Stats strip */}
        <div className="border-y border-line bg-ink-2">
          <dl className="mx-auto grid max-w-[1400px] grid-cols-2 divide-x divide-line md:grid-cols-4">
            {[
              { value: EXPERIMENTS.length, label: t('hero.stat1'), suffix: '' },
              { value: 3, label: t('stats.subjects'), suffix: '' },
              { value: 2, label: t('stats.languages'), suffix: '' },
              { value: 100, label: t('hero.statFree'), suffix: '%' },
            ].map((s, i) => (
              <div key={s.label} className="px-6 py-7 sm:px-8">
                <dd className="display text-4xl text-fg sm:text-5xl"><CountUp to={s.value} suffix={s.suffix} duration={1.2 + i * 0.2} /></dd>
                <dt className="label mt-2 text-muted">{s.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ============ ABOUT ============ */}
      <section id="about" className="scroll-mt-16 border-b border-line">
        <div className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 lg:py-28">
          <Reveal><SectionLabel>{t('about.label')}</SectionLabel></Reveal>
          <SplitLines as="h2" text={t('about.title')} className="display mt-6 max-w-5xl text-3xl text-fg sm:text-5xl lg:text-6xl" />
          <Reveal delay={0.2} className="mt-8"><Link href="/lab" className="btn btn-ghost">{t('about.cta')} <IconArrowUpRight size={14} /></Link></Reveal>

          <div className="grid-lines grid-lines-md mt-16 grid border-t border-line md:grid-cols-3">
            {(['1', '2', '3'] as const).map((n, i) => (
              <Reveal key={n} delay={i * 0.1} className="py-8 md:px-8 md:first:pl-0 md:last:pr-0">
                <p className="display text-lg text-fg">{t(`about.${n}.title`)}</p>
                <p className="mt-4 text-sm leading-relaxed text-muted">{t(`about.${n}.desc`)}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ NUMBERS ============ */}
      <section className="border-b border-line bg-ink-2">
        <div className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 lg:py-28">
          <Reveal><SectionLabel>{t('numbers.label')}</SectionLabel></Reveal>
          <SplitLines as="h2" text={t('numbers.title')} className="display mt-6 text-3xl text-fg sm:text-5xl" />
          <div className="mt-14 grid gap-px overflow-hidden rounded-lg border border-line bg-line lg:grid-cols-3">
            {[
              { from: 45, to: 30, unit: 'MIN', label: t('numbers.1'), fact: 'titration-acid-base' as const },
              { from: 0, to: 9.81, unit: 'M/S²', label: t('numbers.2'), fact: 'simple-pendulum' as const, decimals: 2 },
              { from: 1, to: 2, unit: ': 1', label: t('numbers.3'), fact: 'electrolysis' as const },
            ].map((n, i) => {
              const Icon = EXPERIMENT_ICON_MAP[EXPERIMENTS.find(e => e.id === n.fact)!.icon];
              return (
                <Reveal key={n.label} delay={i * 0.1} className="bg-ink p-8">
                  <div className="flex items-center justify-between">
                    <span className="label text-muted">{t(EXPERIMENTS.find(e => e.id === n.fact)!.nameKey)}</span>
                    <Icon size={18} className="text-muted" />
                  </div>
                  <p className="display mt-10 flex items-baseline gap-3 text-5xl text-fg sm:text-6xl">
                    {n.from > 0 && <><span className="text-muted-2">{n.from}</span><span className="text-accent">→</span></>}
                    <CountUp to={n.to} decimals={n.decimals ?? 0} duration={1.8} />
                    <span className="label text-muted">{n.unit}</span>
                  </p>
                  <p className="mt-4 text-sm text-fg-2">{n.label}</p>
                  <Link href={`/lab/${n.fact}`} className="label mt-8 inline-flex items-center gap-2 text-fg hover:text-accent">{t('numbers.open')} <IconArrowUpRight size={13} /></Link>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ PROCESS ============ */}
      <section id="process" className="scroll-mt-16 border-b border-line">
        <div className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 lg:py-28">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <Reveal><SectionLabel>{t('process.label')}</SectionLabel></Reveal>
              <SplitLines as="h2" text={t('process.title')} className="display mt-6 text-3xl text-fg sm:text-5xl" />
              <Reveal delay={0.2}><p className="mt-6 max-w-md text-sm leading-relaxed text-muted">{t('process.subtitle')}</p></Reveal>
            </div>
            <ol className="divide-y divide-line border-y border-line">
              {(['1', '2', '3', '4'] as const).map((n, i) => (
                <Reveal key={n} delay={i * 0.08}>
                  <li className="group grid grid-cols-[3rem_1fr] gap-4 py-6 sm:grid-cols-[5rem_1fr]">
                    <span className="num text-sm text-accent">0{n}</span>
                    <div>
                      <h3 className="display text-xl text-fg sm:text-2xl">{t(`process.${n}.title`)}</h3>
                      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{t(`process.${n}.desc`)}</p>
                    </div>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ============ BENCH LAUNCHER ============ */}
      <section id="bench" className="scroll-mt-16 border-b border-line bg-ink-2">
        <div className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 lg:py-28">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Reveal><SectionLabel>{t('bench.label')}</SectionLabel></Reveal>
              <SplitLines as="h2" text={t('bench.title')} className="display mt-6 text-3xl text-fg sm:text-5xl" />
            </div>
            <Reveal delay={0.2}><p className="max-w-md text-sm leading-relaxed text-muted">{t('bench.subtitle')}</p></Reveal>
          </div>
          <Reveal delay={0.15} className="mt-12"><BenchLauncher /></Reveal>
        </div>
      </section>

      {/* ============ LABS BY SUBJECT ============ */}
      <section id="labs" className="scroll-mt-16 border-b border-line">
        <div className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 lg:py-28">
          <Reveal><SectionLabel>{t('labs.label')}</SectionLabel></Reveal>
          <SplitLines as="h2" text={t('labs.title')} className="display mt-6 text-3xl text-fg sm:text-5xl" />

          <div className="mt-16 space-y-20">
            {SUBJECTS.map((subject, si) => {
              const list = EXPERIMENTS.filter(e => e.subject === subject);
              return (
                <div key={subject} className="grid gap-10 lg:grid-cols-[320px_1fr]">
                  <Reveal delay={0.05}>
                    <p className={`display text-4xl sm:text-5xl ${SUBJECT_TONE[subject]}`}>// {t(`subject.${subject}`)}</p>
                    <p className="mt-5 text-sm leading-relaxed text-muted">{t(`labs.${subject}.desc`)}</p>
                    <ol className="mt-8 space-y-3">
                      {list.map((e, i) => (
                        <li key={e.id} className="flex gap-4 border-t border-line pt-3">
                          <span className="num text-xs text-muted-2">0{i + 1}</span>
                          <span className="display text-sm text-fg-2">{EXPERIMENT_FACTS[e.id].question}</span>
                        </li>
                      ))}
                    </ol>
                  </Reveal>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {list.map((exp, i) => <ExperimentCard key={exp.id} experiment={exp} index={si * 3 + i} />)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ ACTIVITY (tracked) ============ */}
      <section className="border-b border-line bg-ink-2">
        <div className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
            <div>
              <Reveal><SectionLabel>{t('activity.label')}</SectionLabel></Reveal>
              <SplitLines as="h2" text={t('activity.title')} className="display mt-6 text-3xl text-fg sm:text-5xl" />
              <Reveal delay={0.2}><p className="mt-6 max-w-md text-sm leading-relaxed text-muted">{t('activity.subtitle')}</p></Reveal>
              <Reveal delay={0.3} className="mt-8"><Link href="/dashboard" className="btn btn-ghost">{t('nav.dashboard')} <IconArrowUpRight size={14} /></Link></Reveal>
            </div>
            <Reveal delay={0.15}>
              <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-line bg-line">
                {[
                  { v: viewLog.length, l: t('activity.views') },
                  { v: viewLog.filter(x => x.experimentId).length, l: t('activity.labViews') },
                  { v: completed.length, l: t('dash.completed') },
                ].map(s => (
                  <div key={s.l} className="bg-ink p-6">
                    <p className="display text-4xl text-fg"><CountUp to={s.v} duration={1} /></p>
                    <p className="label mt-2 text-muted">{s.l}</p>
                  </div>
                ))}
              </div>
              <ul className="mt-4 divide-y divide-line rounded-lg border border-line bg-ink">
                {viewLog.slice(-5).reverse().map((v, i) => (
                  <li key={`${v.at}-${i}`} className="flex items-center justify-between px-5 py-3 text-sm">
                    <span className="num text-fg-2">{v.path}</span>
                    <span className="label text-muted-2">{new Date(v.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </li>
                ))}
                {viewLog.length === 0 && <li className="px-5 py-4 text-sm text-muted">{t('activity.empty')}</li>}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section>
        <div className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 lg:py-28">
          <div className="grid gap-10 rounded-lg border border-line bg-surface p-8 lg:grid-cols-[1.2fr_1fr] lg:p-14">
            <div>
              <Reveal><SectionLabel>{t('cta.label')}</SectionLabel></Reveal>
              <SplitLines as="h2" text={t('cta.title')} className="display mt-6 text-3xl text-fg sm:text-5xl" />
              <Reveal delay={0.2}><p className="mt-6 max-w-md text-sm leading-relaxed text-muted">{t('cta.subtitle')}</p></Reveal>
            </div>
            <Reveal delay={0.2} className="flex flex-col justify-end gap-3 sm:flex-row lg:flex-col lg:items-end">
              <Link href="/lab" className="btn btn-accent"><IconArrowReturn size={15} /> {t('hero.cta')}</Link>
              <Link href="/login" className="btn btn-ghost">{t('nav.login')}</Link>
            </Reveal>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
