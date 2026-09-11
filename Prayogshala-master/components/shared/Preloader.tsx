'use client';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const KEY = 'prayogshala:booted';
const LINES = ['// PLEASE WAIT', '// LOADING BENCH', '// CALIBRATING INSTRUMENTS', '// READY'];

export default function Preloader() {
  const [show, setShow] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (sessionStorage.getItem(KEY)) return;
    setShow(true);
    document.documentElement.style.overflow = 'hidden';
    const start = performance.now();
    const duration = 1600;
    let frame = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      // ease-out so the counter slows near the end
      setProgress(Math.round((1 - Math.pow(1 - p, 3)) * 100));
      if (p < 1) frame = requestAnimationFrame(tick);
      else {
        sessionStorage.setItem(KEY, '1');
        setTimeout(() => {
          setShow(false);
          document.documentElement.style.overflow = '';
        }, 350);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      document.documentElement.style.overflow = '';
    };
  }, []);

  const lineIndex = progress < 30 ? 0 : progress < 65 ? 1 : progress < 100 ? 2 : 3;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="preloader"
          className="fixed inset-0 z-[100] flex bg-ink"
          initial={{ opacity: 1 }}
          exit={{ y: '-100%', transition: { duration: 0.7, ease: [0.76, 0, 0.24, 1] } }}
          aria-live="polite"
          aria-label="Loading PrayogShala"
        >
          <motion.div
            className="relative h-full bg-accent"
            initial={{ width: '8%' }}
            animate={{ width: `${8 + progress * 0.42}%` }}
            transition={{ ease: 'linear', duration: 0.1 }}
          >
            <div className="absolute left-6 top-10 sm:left-10 sm:top-14">
              <p className="display text-5xl text-ink sm:text-7xl">// P</p>
              <div className="mt-8 space-y-1 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/80">
                {LINES.slice(0, lineIndex + 1).map(line => <p key={line}>{line}</p>)}
              </div>
            </div>
          </motion.div>
          <div className="plus-dots relative flex-1">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex items-center gap-4">
                <span className={`block h-4 w-4 bg-accent ${progress < 100 ? 'blink' : ''}`} />
                <span className="display text-3xl text-fg-2 sm:text-5xl">{progress < 100 ? 'LOADING' : 'READY'}</span>
              </div>
            </div>
            <div className="absolute bottom-8 right-8 font-mono text-6xl font-medium tabular-nums text-fg/90 sm:bottom-12 sm:right-12 sm:text-8xl">
              {String(progress).padStart(3, '0')}
            </div>
            <div className="absolute bottom-8 left-8 font-mono text-[11px] uppercase tracking-[0.14em] text-muted sm:bottom-12 sm:left-12">
              PrayogShala / Virtual Science Lab / Nepal
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
