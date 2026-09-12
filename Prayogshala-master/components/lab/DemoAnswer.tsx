'use client';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ExperimentId } from '@/lib/experiments';
import { EXPERIMENT_FACTS } from '@/lib/experimentFacts';
import { IconPlay, IconClose, IconCheck } from '@/components/icons';
import { useDemoRunner, type DemoStep } from './useDemoRunner';
import DemoOverlay from './DemoOverlay';

/**
 * Demo controls for labs that do not use LabWorkspace. With `steps`, "Play demo"
 * drives the bench; the answer panel opens when the script finishes.
 */
export default function DemoAnswer({ experimentId, steps, onStart }: { experimentId: ExperimentId; steps?: DemoStep[]; onStart?: () => void }) {
  const [open, setOpen] = useState(false);
  const fact = EXPERIMENT_FACTS[experimentId];
  const runner = useDemoRunner(steps, { onStart: () => { setOpen(false); onStart?.(); }, onFinish: () => setOpen(true) });
  return (
    <>
      {steps && steps.length > 0 && (
        <button type="button" className={`lab-button ${runner.playing ? '' : 'lab-button-primary'}`} onClick={() => (runner.playing ? runner.stop() : runner.start())} aria-pressed={runner.playing}>
          {runner.playing ? <IconClose size={13} /> : <IconPlay size={13} />} {runner.playing ? 'Stop demo' : 'Play demo'}
        </button>
      )}
      <button type="button" className="lab-button" onClick={() => setOpen(v => !v)} aria-pressed={open} aria-controls="demo-answer-panel">
        {open ? <IconClose size={13} /> : <IconCheck size={13} />} {open ? 'Hide answer' : 'Show answer'}
      </button>
      <DemoOverlay playing={runner.playing} index={runner.index} total={runner.total} caption={runner.caption} onStop={runner.stop} className="!fixed !inset-x-4 !bottom-6 z-40 sm:!inset-x-8" />
      <AnimatePresence>
        {open && (
          <motion.div id="demo-answer-panel" role="region" aria-label="Expected result"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="fixed inset-x-4 top-36 z-40 mx-auto max-w-3xl rounded-lg border border-accent/50 bg-ink/95 p-5 shadow-2xl backdrop-blur-md sm:inset-x-8">
            <div className="flex items-start justify-between gap-4">
              <p className="label text-accent">// Expected result</p>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-muted hover:text-fg"><IconClose size={16} /></button>
            </div>
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
