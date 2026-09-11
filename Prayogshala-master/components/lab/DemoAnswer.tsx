'use client';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ExperimentId } from '@/lib/experiments';
import { EXPERIMENT_FACTS } from '@/lib/experimentFacts';
import { IconPlay, IconClose } from '@/components/icons';

/** Compact demo-answer toggle for labs that do not use LabWorkspace. */
export default function DemoAnswer({ experimentId }: { experimentId: ExperimentId }) {
  const [open, setOpen] = useState(false);
  const fact = EXPERIMENT_FACTS[experimentId];
  return (
    <>
      <button type="button" className={`lab-button ${open ? '' : 'lab-button-primary'}`} onClick={() => setOpen(v => !v)} aria-pressed={open} aria-controls="demo-answer-panel">
        {open ? <IconClose size={13} /> : <IconPlay size={13} />} {open ? 'Hide demo' : 'Demo answer'}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div id="demo-answer-panel" role="region" aria-label="Demo answer"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="fixed inset-x-4 top-36 z-40 mx-auto max-w-3xl rounded-lg border border-accent/50 bg-ink/95 p-5 shadow-2xl backdrop-blur-md sm:inset-x-8">
            <p className="label text-accent">// Demo answer / expected result</p>
            <p className="display mt-3 text-xl text-fg">{fact.question}</p>
            <p className="mt-3 text-sm leading-relaxed text-fg-2">{fact.answer}</p>
            <div className="mt-4 grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-3">
              {fact.readouts.map(r => (
                <div key={r.label} className="bg-surface px-4 py-3">
                  <p className="label text-muted">{r.label}</p>
                  <p className="num mt-1 text-base text-fg">{r.value}</p>
                </div>
              ))}
            </div>
            {fact.equation && <p className="num mt-3 inline-block rounded border border-line bg-surface px-3 py-1.5 text-sm text-fg">{fact.equation}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
