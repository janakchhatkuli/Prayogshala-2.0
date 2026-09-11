'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useInView, type Variants } from 'framer-motion';

const EASE = [0.16, 1, 0.3, 1] as const;

export function Reveal({ children, delay = 0, className, y = 24 }: { children: ReactNode; delay?: number; className?: string; y?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

const lineVariants: Variants = {
  hidden: { y: '110%' },
  show: (i: number) => ({ y: 0, transition: { duration: 0.8, delay: 0.08 * i, ease: EASE } }),
};

/** Splits text on \n and slides each line up from a clipped box. */
export function SplitLines({ text, className, as = 'h1', delay = 0 }: { text: string; className?: string; as?: 'h1' | 'h2' | 'p'; delay?: number }) {
  const lines = text.split('\n');
  const Tag = motion[as];
  // The observer sits on the un-clipped parent: a line translated out of its
  // overflow-hidden box would otherwise never register as "in view".
  return (
    <Tag className={className} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-40px' }}>
      {lines.map((line, i) => (
        <span key={i} className="-my-[0.14em] block overflow-hidden py-[0.14em]">
          <motion.span className="block" custom={i + delay} variants={lineVariants}>
            {line}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

/** Odometer-style count-up that starts when scrolled into view. */
export function CountUp({ to, duration = 1.6, suffix = '', prefix = '', decimals = 0, className }: { to: number; duration?: number; suffix?: string; prefix?: string; decimals?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - p, 4);
      setValue(to * eased);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, to, duration]);

  return (
    <span ref={ref} className={`num ${className ?? ''}`}>
      {prefix}{value.toFixed(decimals)}{suffix}
    </span>
  );
}

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className ?? ''}`}>
      <span className="h-2 w-2 bg-accent" aria-hidden="true" />
      <span className="eyebrow">{children}</span>
    </div>
  );
}
