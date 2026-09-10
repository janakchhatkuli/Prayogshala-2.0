'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, RotateCcw, FlaskConical } from 'lucide-react';

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
}

export default function LabWorkspace({ title, subject, intro, equipment, steps, currentStep, children, controls, observations, conclusion, complete, onReset }: LabWorkspaceProps) {
  const [showBrief, setShowBrief] = useState(true);
  const accent = subject === 'Physics' ? 'text-amber-300' : subject === 'Chemistry' ? 'text-blue-300' : 'text-emerald-300';
  return (
    <div className="min-h-[calc(100dvh-64px)] bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-[1600px] p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/lab" aria-label="Back to experiment library" className="rounded-xl border border-slate-700 p-3 hover:bg-slate-800"><ArrowLeft size={18} /></Link>
            <div><p className={`text-xs font-semibold uppercase tracking-[0.18em] ${accent}`}>{subject} / Hands-on lab</p><h1 className="mt-1 text-xl font-semibold sm:text-2xl">{title}</h1></div>
          </div>
          <div className="flex gap-2"><button className="lab-button" onClick={() => setShowBrief(!showBrief)} aria-expanded={showBrief}>Lab briefing</button><button className="lab-button" onClick={onReset}><RotateCcw size={15} /> Reset</button></div>
        </div>
        {showBrief && <section className="mb-5 grid gap-5 rounded-2xl border border-slate-700 bg-slate-900 p-5 md:grid-cols-[1.2fr_1fr]">
          <div><h2 className="mb-2 flex items-center gap-2 text-sm font-semibold"><FlaskConical size={17} className={accent} /> The question</h2><p className="text-sm leading-relaxed text-slate-300">{intro}</p><p className="mt-3 text-xs text-slate-400">Drag the equipment, or focus it and use arrow keys to move, then Enter to place. Use the labeled controls for fine adjustments.</p></div>
          <div><h2 className="mb-2 text-sm font-semibold">Equipment on your bench</h2><div className="flex flex-wrap gap-2">{equipment.map(item => <span key={item} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300">{item}</span>)}</div></div>
        </section>}
        <ol aria-label="Experiment progress" className="mb-5 flex flex-wrap gap-2">{steps.map((step, i) => <li key={step} aria-current={!complete && i === currentStep ? 'step' : undefined} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${complete || i < currentStep ? 'bg-emerald-950 text-emerald-300' : i === currentStep ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400'}`}><span className="flex h-5 w-5 items-center justify-center rounded-full border border-current">{complete || i < currentStep ? <Check size={12} /> : i + 1}</span>{step}</li>)}</ol>
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0"><section aria-label="Interactive laboratory bench" className="lab-scene overflow-hidden rounded-2xl border border-slate-700">{children}</section><section aria-label="Equipment controls" className="mt-4 rounded-2xl border border-slate-700 bg-slate-900 p-4">{controls}</section></div>
          <aside className="space-y-4"><section className="rounded-2xl border border-slate-700 bg-slate-900 p-5"><p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blue-300">Next action</p><p className="text-sm leading-relaxed">{complete ? 'Experiment recorded. Reset the bench to try again.' : steps[Math.min(currentStep, steps.length - 1)]}</p></section><section className="rounded-2xl border border-slate-700 bg-slate-900 p-5"><h2 className="mb-4 text-sm font-semibold">Observation notebook</h2>{observations}</section>{conclusion && <section aria-label="Experiment conclusion" className="rounded-2xl border border-emerald-800 bg-emerald-950/50 p-5"><h2 className="mb-3 text-sm font-semibold text-emerald-300">{complete ? 'Result & conclusion' : 'Expected result'}</h2><div className="text-sm leading-relaxed text-slate-300">{conclusion}</div></section>}<p className="px-1 text-xs leading-relaxed text-slate-500">Educational simulation. Results use simplified models. Progress is saved in this browser only.</p></aside>
        </div>
      </div>
    </div>
  );
}
