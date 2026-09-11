'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface DemoStep {
  /** Shown in the bench overlay while the step runs. */
  caption: string;
  /** Mutates lab state. Always executed against the latest closure. */
  run?: () => void;
  /** Poll until true (max 30 s) before moving on, for steps that let a simulation advance. */
  until?: () => boolean;
  /** Pause after run/until, in ms. Default 1400. */
  wait?: number;
}

const POLL = 100;
const UNTIL_TIMEOUT = 30_000;

/**
 * Plays scripted steps against live lab state. Steps are read from a ref on each
 * tick, so scripts can close over the newest state and setters.
 */
export function useDemoRunner(steps: DemoStep[] | undefined, { onStart, onFinish }: { onStart?: () => void; onFinish?: () => void } = {}) {
  const stepsRef = useRef(steps);
  stepsRef.current = steps;
  const callbacks = useRef({ onStart, onFinish });
  callbacks.current = { onStart, onFinish };
  const token = useRef(0);
  const [index, setIndex] = useState(-1);

  const stop = useCallback(() => { token.current += 1; setIndex(-1); }, []);
  useEffect(() => () => { token.current += 1; }, []);

  const start = useCallback(() => {
    const mine = ++token.current;
    const alive = () => token.current === mine;
    const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
    (async () => {
      callbacks.current.onStart?.();
      await sleep(500);
      const list = stepsRef.current ?? [];
      for (let i = 0; i < list.length; i++) {
        if (!alive()) return;
        setIndex(i);
        // Re-read so `run` sees state produced by earlier steps.
        const step = (stepsRef.current ?? [])[i];
        step?.run?.();
        if (step?.until) {
          const started = Date.now();
          while (alive() && !(stepsRef.current ?? [])[i]?.until?.() && Date.now() - started < UNTIL_TIMEOUT) await sleep(POLL);
        }
        await sleep(step?.wait ?? 1400);
      }
      if (!alive()) return;
      setIndex(-1);
      callbacks.current.onFinish?.();
    })();
  }, []);

  const total = steps?.length ?? 0;
  return { playing: index >= 0, index, total, caption: index >= 0 ? steps?.[index]?.caption ?? '' : '', start, stop };
}
