'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { EXPERIMENTS, type Experiment } from '@/lib/experiments';
import { EXPERIMENT_FACTS } from '@/lib/experimentFacts';
import { useT } from '@/hooks/useTranslation';
import { EXPERIMENT_ICON_MAP, IconGrip, IconArrowUpRight, IconPlay } from '@/components/icons';

const SUBJECT_COLOR = { physics: 'text-physics', chemistry: 'text-chemistry', biology: 'text-biology' } as const;
const SUBJECT_BORDER = { physics: 'border-physics/50', chemistry: 'border-chemistry/50', biology: 'border-biology/50' } as const;

/**
 * Drag an experiment token onto the bench to launch it. Hovering (or focusing)
 * a token previews the question, the expected answer and the key readouts.
 */
export default function BenchLauncher() {
  const t = useT();
  const router = useRouter();
  const benchRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<Experiment | null>(null);
  const [over, setOver] = useState(false);
  const [docked, setDocked] = useState<Experiment | null>(null);
  const [revealed, setRevealed] = useState(false);

  const active = docked ?? hovered ?? EXPERIMENTS[0];
  const fact = EXPERIMENT_FACTS[active.id];
  const Icon = EXPERIMENT_ICON_MAP[active.icon];

  const insideBench = (info: PanInfo) => {
    const r = benchRef.current?.getBoundingClientRect();
    if (!r) return false;
    return info.point.x >= r.left && info.point.x <= r.right && info.point.y >= r.top && info.point.y <= r.bottom;
  };

  const launch = (exp: Experiment) => {
    setDocked(exp);
    setRevealed(false);
    setTimeout(() => router.push(`/lab/${exp.id}`), 900);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      {/* Bench */}
      <div
        ref={benchRef}
        className={`corner-marks relative min-h-[380px] overflow-hidden rounded-lg border bg-surface transition-colors duration-200 ${over ? 'border-accent bg-accent-soft' : 'border-line'}`}
        aria-live="polite"
      >
        <div className="plus-dots absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="absolute left-5 top-5 flex items-center gap-3">
          <span className={`h-2 w-2 ${docked ? 'bg-ok' : over ? 'bg-accent blink' : 'bg-muted-2'}`} />
          <span className="label text-muted">{docked ? t('bench.docking') : over ? t('bench.release') : t('bench.idle')}</span>
        </div>
        <div className="absolute right-5 top-5 label text-muted-2">BENCH 00</div>

        <div className="relative flex h-full min-h-[380px] flex-col justify-end p-6 pt-20">
          <AnimatePresence mode="wait">
            <motion.div key={active.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
              <div className="flex items-center gap-3">
                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-md border bg-ink ${SUBJECT_BORDER[active.subject]} ${SUBJECT_COLOR[active.subject]}`}>
                  <Icon size={20} />
                </span>
                <div>
                  <p className={`label ${SUBJECT_COLOR[active.subject]}`}>{t(`subject.${active.subject}`)} / {t(active.gradeKey)}</p>
                  <h3 className="display mt-0.5 text-2xl text-fg sm:text-3xl">{t(active.nameKey)}</h3>
                </div>
              </div>
              <p className="mt-5 max-w-xl text-sm leading-relaxed text-fg-2">{fact.question}</p>

              <div className="mt-5 grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-3">
                {fact.readouts.map(r => (
                  <div key={r.label} className="bg-ink px-4 py-3">
                    <p className="label text-muted-2">{r.label}</p>
                    <p className={`num mt-1 text-lg text-fg transition-all duration-500 ${revealed || docked ? 'blur-0 opacity-100' : 'blur-sm opacity-40 select-none'}`}>{r.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => setRevealed(v => !v)} className="btn btn-ghost btn-sm">
                  <IconPlay size={13} /> {revealed ? t('bench.hideAnswer') : t('bench.showAnswer')}
                </button>
                <button type="button" onClick={() => launch(active)} className="btn btn-accent btn-sm">
                  {t('bench.launch')} <IconArrowUpRight size={14} />
                </button>
                <span className="label text-muted-2">{t('exp.estimatedDuration', { minutes: active.duration })}</span>
              </div>

              <AnimatePresence>
                {(revealed || docked) && (
                  <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-4 overflow-hidden border-l-2 border-accent pl-4 text-sm leading-relaxed text-fg-2">
                    <span className="label mr-2 text-accent">{t('bench.answer')}</span>{fact.answer}
                    {fact.equation && <span className="num ml-2 text-muted">[{fact.equation}]</span>}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {docked && (
            <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, ease: 'easeInOut' }} className="absolute bottom-0 left-0 h-1 w-full origin-left bg-accent" />
          )}
        </AnimatePresence>
      </div>

      {/* Token tray */}
      <div className="rounded-lg border border-line bg-ink-2 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="eyebrow">{t('bench.tray')}</span>
          <span className="label text-muted-2">{EXPERIMENTS.length}</span>
        </div>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
          {EXPERIMENTS.map(exp => {
            const TokenIcon = EXPERIMENT_ICON_MAP[exp.icon];
            return (
              <li key={exp.id} className="relative">
                <motion.button
                  type="button"
                  drag
                  dragSnapToOrigin
                  dragElastic={0.2}
                  dragMomentum={false}
                  whileDrag={{ scale: 1.06, zIndex: 40, boxShadow: '0 20px 40px -12px rgba(0,0,0,.7)' }}
                  whileHover={{ y: -2 }}
                  onDrag={(_, info) => setOver(insideBench(info))}
                  onDragStart={() => { setHovered(exp); setRevealed(false); }}
                  onDragEnd={(_, info) => { setOver(false); if (insideBench(info)) launch(exp); }}
                  onHoverStart={() => { if (!docked) { setHovered(exp); setRevealed(false); } }}
                  onFocus={() => { if (!docked) { setHovered(exp); setRevealed(false); } }}
                  onClick={() => launch(exp)}
                  aria-label={`${t(exp.nameKey)}: ${t('bench.launch')}`}
                  className={`flex w-full cursor-grab items-center gap-2.5 rounded-md border bg-surface px-3 py-2.5 text-left transition-colors active:cursor-grabbing ${active.id === exp.id ? 'border-fg-2' : 'border-line hover:border-line-2'}`}
                >
                  <IconGrip size={14} className="shrink-0 text-muted-2" />
                  <span className={`shrink-0 ${SUBJECT_COLOR[exp.subject]}`}><TokenIcon size={18} /></span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium text-fg">{t(exp.nameKey)}</span>
                    <span className="label block text-muted-2">{t(`subject.${exp.subject}`)}</span>
                  </span>
                </motion.button>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-muted">{t('bench.help')}</p>
      </div>
    </div>
  );
}
