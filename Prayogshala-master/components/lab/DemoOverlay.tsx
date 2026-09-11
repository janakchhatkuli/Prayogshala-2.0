'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { IconClose } from '@/components/icons';

/** Caption bar shown over the bench while a scripted demo plays. */
export default function DemoOverlay({ playing, index, total, caption, onStop, className }: { playing: boolean; index: number; total: number; caption: string; onStop: () => void; className?: string }) {
  return (
    <AnimatePresence>
      {playing && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
          className={`pointer-events-none absolute inset-x-3 bottom-3 z-20 ${className ?? ''}`}
        >
          <div className="pointer-events-auto mx-auto flex max-w-2xl items-center gap-4 rounded-lg border border-accent/60 bg-ink/92 px-4 py-3 shadow-2xl backdrop-blur-md">
            <span className="h-2.5 w-2.5 shrink-0 bg-accent blink" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="label text-accent">// Demo / step {index + 1} of {total}</p>
              <motion.p key={index} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-0.5 text-sm text-fg">{caption}</motion.p>
              <span className="mt-2 block h-0.5 w-full overflow-hidden rounded bg-line">
                <motion.span className="block h-full bg-accent" initial={{ width: 0 }} animate={{ width: `${((index + 1) / Math.max(total, 1)) * 100}%` }} transition={{ duration: 0.4 }} />
              </span>
            </div>
            <button type="button" onClick={onStop} className="lab-button shrink-0" aria-label="Stop demo"><IconClose size={13} /> Stop</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
