'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import type { ExperimentId } from '@/lib/experiments';
import { EXPERIMENT_FACTS } from '@/lib/experimentFacts';
import { IconArrowReturn, IconReset, IconCheck, IconPlay, IconClose } from '@/components/icons';

export interface LabWorkspaceProps {
  title: string;
  subject: 'Physics' | 'Chemistry' | 'Biology';
  intro: string;
  equipment: string[];
  steps: string[];
  currentStep: number;
  children: ReactNode;
  controls: ReactNode;
  observations: ReactNode;
  conclusion?: ReactNode;
  complete?: boolean;
  onReset: () => void;
  /** Enables the "Demo answer" button, which reveals the expected result without running the bench. */
  experimentId?: ExperimentId;
}

const TONE = {
  Physics: { text: 'text-physics', bg: 'bg-physics' },
  Chemistry: { text: 'text-chemistry', bg: 'bg-chemistry' },
  Biology: { text: 'text-biology', bg: 'bg-biology' },
} as const;

export default function LabWorkspace({ title, subject, intro, equipment, steps, currentStep, children, controls, observations, conclusion, complete, onReset, experimentId }: LabWorkspaceProps) {
  const [showBrief, setShowBrief] = useState(true);
  const [showDemo, setShowDemo] = useState(false);
  const tone = TONE[subject];
  const fact = experimentId ? EXPERIMENT_FACTS[experimentId] : null;
  const progress = complete ? 100 : Math.round((currentStep / steps.length) * 100);

  return (
    <div className="min-h-[calc(100dvh-64px)] bg-ink text-fg">
      {/* Top bar */}
      <div className="border-b border-line bg-ink-2">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/lab" aria-label="Back to experiment library" className="label inline-flex h-9 items-center gap-2 rounded-md border border-line px-3 text-fg-2 hover:border-line-2 hover:text-fg">
              <IconArrowReturn size={14} className="-scale-x-100" /> Labs
            </Link>
            <div>
              <p className={`label ${tone.text}`}>// {subject} / Hands-on lab</p>
              <h1 className="display mt-0.5 text-xl text-fg sm:text-2xl">{title}</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden items-center gap-3 sm:flex">
              <span className="label text-muted">{complete ? 'Complete' : `Step ${Math.min(currentStep + 1, steps.length)} / ${steps.length}`}</span>
              <span className="h-1 w-28 overflow-hidden rounded-full bg-line"><span className={`block h-full ${complete ? 'bg-ok' : 'bg-accent'} transition-[width] duration-500`} style={{ width: `${progress}%` }} /></span>
            </div>
            {fact && (
              <button type="button" className={`lab-button ${showDemo ? '' : 'lab-button-primary'}`} onClick={() => setShowDemo(v => !v)} aria-pressed={showDemo}>
                {showDemo ? <IconClose size={13} /> : <IconPlay size={13} />} {showDemo ? 'Hide demo' : 'Demo answer'}
              </button>
            )}
            <button className="lab-button" onClick={() => setShowBrief(!showBrief)} aria-expanded={showBrief}>Briefing</button>
            <button className="lab-button" onClick={onReset}><IconReset size={13} /> Reset</button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] p-4 sm:p-6">
        {/* Demo answer */}
        <AnimatePresence>
          {showDemo && fact && (
            <motion.section initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }} className="mb-5 overflow-hidden" aria-label="Demo answer">
              <div className="corner-marks grid gap-6 rounded-lg border border-accent/50 bg-accent-soft p-5 lg:grid-cols-[1fr_360px]">
                <div>
                  <p className="label text-accent">// Demo answer / expected result</p>
                  <p className="display mt-3 text-xl text-fg">{fact.question}</p>
                  <p className="mt-3 text-sm leading-relaxed text-fg-2">{fact.answer}</p>
                  {fact.equation && <p className="num mt-3 inline-block rounded border border-line bg-ink px-3 py-1.5 text-sm text-fg">{fact.equation}</p>}
                  <ol className="mt-4 flex flex-wrap gap-2">
                    {fact.steps.map((s, i) => <li key={s} className="label rounded border border-line bg-ink px-2 py-1 text-muted"><span className="text-accent">0{i + 1}</span> {s}</li>)}
                  </ol>
                </div>
                <div className="grid gap-px overflow-hidden rounded-md border border-line bg-line">
                  {fact.readouts.map(r => (
                    <div key={r.label} className="flex items-center justify-between bg-ink px-4 py-3">
                      <span className="label text-muted">{r.label}</span>
                      <span className="num text-base text-fg">{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Briefing */}
        {showBrief && (
          <section className="mb-5 grid gap-6 rounded-lg border border-line bg-surface p-5 md:grid-cols-[1.2fr_1fr]">
            <div>
              <p className="label text-muted">// The question</p>
              <p className="mt-3 text-sm leading-relaxed text-fg-2">{intro}</p>
              <p className="mt-3 text-xs leading-relaxed text-muted-2">Drag the equipment, or focus it and use arrow keys to move, then Enter to place. Use the labelled controls for fine adjustments.</p>
            </div>
            <div>
              <p className="label text-muted">// Equipment on your bench</p>
              <div className="mt-3 flex flex-wrap gap-2">{equipment.map(item => <span key={item} className="rounded border border-line bg-ink px-2.5 py-1.5 text-xs text-fg-2">{item}</span>)}</div>
            </div>
          </section>
        )}

        {/* Steps */}
        <ol aria-label="Experiment progress" className="mb-5 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-flow-col lg:auto-cols-fr">
          {steps.map((step, i) => {
            const done = complete || i < currentStep;
            const active = !complete && i === currentStep;
            return (
              <li key={step} aria-current={active ? 'step' : undefined} className={`flex items-center gap-3 px-4 py-3 text-xs ${active ? 'bg-surface-2 text-fg' : done ? 'bg-ink text-ok' : 'bg-ink text-muted'}`}>
                <span className={`num flex h-6 w-6 shrink-0 items-center justify-center rounded border text-[11px] ${active ? 'border-accent text-accent' : done ? 'border-ok/50' : 'border-line'}`}>{done ? <IconCheck size={12} /> : i + 1}</span>
                <span className="leading-snug">{step}</span>
              </li>
            );
          })}
        </ol>

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0">
            <section aria-label="Interactive laboratory bench" className="lab-scene corner-marks overflow-hidden rounded-lg border border-line">{children}</section>
            <section aria-label="Equipment controls" className="mt-4 rounded-lg border border-line bg-surface p-4">{controls}</section>
          </div>
          <aside className="space-y-4">
            <section className="rounded-lg border border-line bg-surface p-5">
              <p className="label text-accent">// Next action</p>
              <p className="mt-2 text-sm leading-relaxed text-fg">{complete ? 'Experiment recorded. Reset the bench to try again.' : steps[Math.min(currentStep, steps.length - 1)]}</p>
            </section>
            <section className="rounded-lg border border-line bg-surface p-5">
              <p className="label mb-4 text-muted">// Observation notebook</p>
              {observations}
            </section>
            {conclusion && (
              <section aria-label="Experiment conclusion" className={`rounded-lg border p-5 ${complete ? 'border-ok/40 bg-ok/10' : 'border-line bg-surface'}`}>
                <p className={`label mb-3 ${complete ? 'text-ok' : 'text-muted'}`}>// {complete ? 'Result and conclusion' : 'Expected result'}</p>
                <div className="text-sm leading-relaxed text-fg-2">{conclusion}</div>
              </section>
            )}
            <p className="px-1 text-xs leading-relaxed text-muted-2">Educational simulation. Results use simplified models. Progress is saved in this browser only.</p>
          </aside>
        </div>
      </div>
    </div>
  );
}
