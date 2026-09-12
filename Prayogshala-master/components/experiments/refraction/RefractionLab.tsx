'use client';

import { useMemo, useState } from 'react';
import LabWorkspace from '@/components/lab/LabWorkspace';
import DraggableSVG, { type Point } from '@/components/lab/DraggableSVG';
import type { DemoStep } from '@/components/lab/useDemoRunner';
import { useStore } from '@/lib/store';

const N_GLASS = 1.5;
const N_WATER = 1.33;
const O = { x: 400, y: 250 }; // point of incidence on the top face of the block
const BLOCK = { x: 240, y: 250, w: 320, h: 130 };
const RAY = 190; // length of drawn incident ray

type Trial = { i: number; r: number };
type Medium = 'glass' | 'water';

const deg = (rad: number) => rad * 180 / Math.PI;
const rad = (d: number) => d * Math.PI / 180;

export default function RefractionLab() {
  const save = useStore(s => s.completeExperiment);
  const [medium, setMedium] = useState<Medium>('glass');
  const [incidence, setIncidence] = useState(40);
  const [preview, setPreview] = useState<number | null>(null);
  const [lampOn, setLampOn] = useState(false);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [complete, setComplete] = useState(false);
  const [feedback, setFeedback] = useState('Switch on the ray box, then drag it around the pin to change the angle of incidence.');

  const n = medium === 'glass' ? N_GLASS : N_WATER;
  const i = preview ?? incidence;
  const r = deg(Math.asin(Math.sin(rad(i)) / n));
  const measured = useMemo(() => {
    if (trials.length < 2) return null;
    return trials.reduce((s, t) => s + Math.sin(rad(t.i)) / Math.sin(rad(t.r)), 0) / trials.length;
  }, [trials]);

  const lampPos = (angle: number) => ({ x: O.x - Math.sin(rad(angle)) * RAY, y: O.y - Math.cos(rad(angle)) * RAY });
  const angleFrom = (p: Point) => Math.max(10, Math.min(80, Math.round(deg(Math.atan2(O.x - p.x, O.y - p.y)))));
  const constrain = (p: Point) => lampPos(angleFrom(p));
  const lamp = lampPos(i);

  // Refracted ray exits the bottom face; emergent ray is parallel to the incident ray.
  const exitY = BLOCK.y + BLOCK.h;
  const exit = { x: O.x + Math.tan(rad(r)) * BLOCK.h, y: exitY };
  const emergent = { x: exit.x + Math.sin(rad(i)) * 90, y: exit.y + Math.cos(rad(i)) * 90 };

  const record = () => {
    if (!lampOn || complete || trials.some(t => t.i === incidence)) return;
    setTrials(prev => [...prev, { i: incidence, r: Number(r.toFixed(1)) }].sort((a, b) => a.i - b.i));
    setFeedback('Angles recorded. Try a clearly different angle of incidence for the next reading.');
  };

  const reset = () => { setIncidence(40); setPreview(null); setLampOn(false); setTrials([]); setComplete(false); setMedium('glass'); setFeedback('Bench reset. Switch on the ray box to begin.'); };
  const currentStep = !lampOn ? 0 : trials.length === 0 ? 1 : trials.length < 3 ? 2 : 3;

  const rOf = (angle: number) => Number(deg(Math.asin(Math.sin(rad(angle)) / N_GLASS)).toFixed(1));
  const demo: DemoStep[] = [
    { caption: 'Place the glass block and switch on the ray box. A single ray hits the top face.', run: () => { setMedium('glass'); setLampOn(true); setIncidence(30); } },
    { caption: 'Angle of incidence 30 degrees. The ray bends toward the normal: r is about 19.5 degrees.', wait: 1800 },
    { caption: 'Record i = 30, r = 19.5.', run: () => setTrials([{ i: 30, r: rOf(30) }]) },
    { caption: 'Swing the ray box to 45 degrees.', run: () => setIncidence(45), wait: 1800 },
    { caption: 'Record i = 45, r = 28.1. sin i / sin r is still about 1.5.', run: () => setTrials([{ i: 30, r: rOf(30) }, { i: 45, r: rOf(45) }]) },
    { caption: 'Swing to 60 degrees. Notice the emergent ray stays parallel to the incident ray.', run: () => setIncidence(60), wait: 1800 },
    { caption: 'Record i = 60, r = 35.3. Mean n = 1.50: the refractive index of glass.', run: () => setTrials([{ i: 30, r: rOf(30) }, { i: 45, r: rOf(45) }, { i: 60, r: rOf(60) }]), wait: 2000 },
  ];

  return (
    <div lang="en">
      <LabWorkspace experimentId="refraction" demo={demo} title="Refraction through a block" subject="Physics"
        intro="How does light bend when it enters a denser medium? Aim a single ray at a rectangular block, measure the angles of incidence and refraction from the normal, and test whether sin i / sin r is constant."
        equipment={['Ray box with single slit', 'Rectangular glass block', 'Rectangular water cell', 'Protractor', 'Optical pins and paper']}
        steps={['Switch on the ray box', 'Set an angle and read i and r', 'Record three angles', 'Compute refractive index']}
        currentStep={currentStep} complete={complete} onReset={reset}
        controls={<div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-fg-2">Angle of incidence <strong className="num float-right text-physics">{incidence} deg</strong>
              <input aria-label="Angle of incidence" type="range" min="10" max="80" step="1" value={incidence} disabled={complete} onChange={e => setIncidence(Number(e.target.value))} className="mt-2 w-full" /></label>
            <div className="text-sm text-fg-2">Block material
              <div className="mt-2 flex gap-2">
                {(['glass', 'water'] as const).map(m => <button key={m} className="lab-button" aria-pressed={medium === m} disabled={complete || trials.length > 0} onClick={() => { setMedium(m); setFeedback(`${m === 'glass' ? 'Glass block' : 'Water cell'} placed. Record angles for this medium only.`); }}>{m}</button>)}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="lab-button" aria-pressed={lampOn} disabled={complete} onClick={() => { setLampOn(v => !v); setFeedback(lampOn ? 'Ray box off.' : 'Ray box on. Drag the box to change the angle, then record.'); }}>{lampOn ? 'Ray box on' : 'Switch on ray box'}</button>
            <button className="lab-button" disabled={!lampOn || complete || trials.some(t => t.i === incidence)} onClick={record}>Record angles</button>
            <button className="lab-button lab-button-primary" disabled={trials.length < 3 || complete} onClick={() => { save('refraction', measured && Math.abs(measured - n) / n < 0.03 ? 100 : 90); setComplete(true); setFeedback('Investigation saved.'); }}>Complete investigation</button>
          </div>
          <p className="text-xs text-muted">Angles are measured from the normal (dashed line), not from the surface. The ray box can be dragged directly on the bench.</p>
          <p role="status" className="text-sm text-accent-2">{feedback}</p>
        </div>}
        observations={<div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div className="lab-readout"><p className="label text-muted">i</p><p className="num mt-1 text-xl text-fg">{i} deg</p></div>
            <div className="lab-readout"><p className="label text-muted">r</p><p className="num mt-1 text-xl text-physics">{lampOn ? r.toFixed(1) : '--'} deg</p></div>
          </div>
          <p className="text-fg-2">sin i / sin r = <strong className="num">{lampOn ? (Math.sin(rad(i)) / Math.sin(rad(r))).toFixed(3) : '--'}</strong></p>
          {trials.length === 0 ? <p className="text-muted">Recorded angle pairs appear here.</p> : (
            <table className="w-full text-left text-xs"><thead><tr className="border-b border-line text-muted"><th className="py-2">i</th><th>r</th><th>sin i / sin r</th></tr></thead>
              <tbody>{trials.map(t => <tr key={t.i} className="border-b border-line text-fg-2"><td className="num py-2">{t.i}</td><td className="num">{t.r.toFixed(1)}</td><td className="num">{(Math.sin(rad(t.i)) / Math.sin(rad(t.r))).toFixed(3)}</td></tr>)}</tbody></table>
          )}
          {measured && <p className="text-fg-2">Mean n: <strong className="num text-physics">{measured.toFixed(3)}</strong></p>}
          <p className="num rounded border border-line p-3 text-xs">n = sin i / sin r</p>
        </div>}
        conclusion={complete
          ? <><p><strong>Result:</strong> n({medium}) = {measured?.toFixed(2)} from {trials.length} readings. Accepted value: {n}.</p><p className="mt-3">Light slows down entering the denser medium and bends toward the normal. The ratio sin i / sin r is constant for a given pair of media, which is Snell's law. The emergent ray is parallel to the incident ray because the two faces are parallel.</p></>
          : 'The refracted ray bends toward the normal. sin i / sin r should give roughly the same value at every angle: about 1.5 for glass and 1.33 for water.'}
      >
        <svg viewBox="0 0 800 470" role="group" aria-label="Optics bench with ray box and rectangular block">
          <defs>
            <linearGradient id="rf-glass" x1="0" x2="0" y1="0" y2="1"><stop stopColor={medium === 'glass' ? '#93c5fd' : '#67e8f9'} stopOpacity=".25" /><stop offset="1" stopColor={medium === 'glass' ? '#60a5fa' : '#22d3ee'} stopOpacity=".12" /></linearGradient>
            <filter id="rf-glow"><feGaussianBlur stdDeviation="2.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          <text x="30" y="35" fill="#8a8a8f" fontFamily="var(--font-jetbrains)" fontSize="11" letterSpacing="3">OPTICS / BENCH 04</text>
          <rect x="60" y="60" width="680" height="380" fill="#f4f1e8" opacity=".06" />
          {/* protractor */}
          <circle cx={O.x} cy={O.y} r="120" fill="none" stroke="#3a3a3f" strokeDasharray="2 4" />
          {Array.from({ length: 19 }, (_, k) => k * 10 - 90).map(a => (
            <g key={a}>
              <line x1={O.x + Math.sin(rad(a)) * 112} y1={O.y - Math.cos(rad(a)) * 112} x2={O.x + Math.sin(rad(a)) * 120} y2={O.y - Math.cos(rad(a)) * 120} stroke="#5f5f66" />
              {a % 30 === 0 && a !== 0 && <text x={O.x + Math.sin(rad(a)) * 132} y={O.y - Math.cos(rad(a)) * 132 + 3} textAnchor="middle" fontSize="8" fill="#8a8a8f" fontFamily="var(--font-jetbrains)">{Math.abs(a)}</text>}
            </g>
          ))}
          {/* normal */}
          <line x1={O.x} y1={O.y - 150} x2={O.x} y2={O.y + BLOCK.h + 60} stroke="#8a8a8f" strokeDasharray="6 5" />
          <text x={O.x + 6} y={O.y - 140} fontSize="9" fill="#8a8a8f" fontFamily="var(--font-jetbrains)">NORMAL</text>
          {/* block */}
          <rect x={BLOCK.x} y={BLOCK.y} width={BLOCK.w} height={BLOCK.h} fill="url(#rf-glass)" stroke="#c9c9c6" strokeWidth="1.5" />
          <text x={BLOCK.x + 10} y={BLOCK.y + BLOCK.h - 10} fontSize="10" fill="#c9c9c6" fontFamily="var(--font-jetbrains)" letterSpacing="2">{medium.toUpperCase()} n = {n}</text>
          {/* rays */}
          {lampOn && <g filter="url(#rf-glow)">
            <line x1={lamp.x} y1={lamp.y} x2={O.x} y2={O.y} stroke="#fe5b2a" strokeWidth="2.5" />
            <line x1={O.x} y1={O.y} x2={exit.x} y2={exit.y} stroke="#fe5b2a" strokeWidth="2.5" opacity=".9" />
            <line x1={exit.x} y1={exit.y} x2={emergent.x} y2={emergent.y} stroke="#fe5b2a" strokeWidth="2.5" opacity=".7" />
            {/* weak reflection */}
            <line x1={O.x} y1={O.y} x2={O.x + Math.sin(rad(i)) * 90} y2={O.y - Math.cos(rad(i)) * 90} stroke="#fe5b2a" strokeWidth="1" opacity=".25" />
          </g>}
          {/* angle arcs */}
          {lampOn && <>
            <path d={`M${O.x} ${O.y - 60} A60 60 0 0 0 ${O.x - Math.sin(rad(i)) * 60} ${O.y - Math.cos(rad(i)) * 60}`} fill="none" stroke="#fbbf24" strokeWidth="1.5" />
            <text x={O.x - Math.sin(rad(i / 2)) * 74} y={O.y - Math.cos(rad(i / 2)) * 74 + 4} textAnchor="middle" fontSize="11" fill="#fbbf24" fontFamily="var(--font-jetbrains)">i={i}</text>
            <path d={`M${O.x} ${O.y + 60} A60 60 0 0 0 ${O.x + Math.sin(rad(r)) * 60} ${O.y + Math.cos(rad(r)) * 60}`} fill="none" stroke="#4ade80" strokeWidth="1.5" />
            <text x={O.x + Math.sin(rad(r / 2)) * 78} y={O.y + Math.cos(rad(r / 2)) * 78 + 4} textAnchor="middle" fontSize="11" fill="#4ade80" fontFamily="var(--font-jetbrains)">r={r.toFixed(1)}</text>
          </>}
          <circle cx={O.x} cy={O.y} r="3" fill="#f2f2f0" />
          {/* ray box */}
          <DraggableSVG x={lamp.x} y={lamp.y} label="Ray box; drag around the pin to change the angle of incidence" disabled={complete}
            constrain={constrain} onMove={p => setPreview(angleFrom(p))} onCancel={() => setPreview(null)}
            onDrop={p => { setPreview(null); setIncidence(angleFrom(p)); if (!lampOn) setLampOn(true); setFeedback(`Angle of incidence set to ${angleFrom(p)} degrees.${lampOn ? '' : ' Ray box switched on.'}`); }}>
            <g transform={`rotate(${-i})`}>
              <rect x="-26" y="-58" width="52" height="60" rx="5" fill="#27272a" stroke="#5f5f66" />
              <rect x="-4" y="-2" width="8" height="6" fill={lampOn ? '#fe5b2a' : '#3a3a3f'} />
              <circle cx="0" cy="-42" r="6" fill={lampOn ? '#fbbf24' : '#3a3a3f'} className={lampOn ? 'led-on' : ''} />
              <text y="-18" textAnchor="middle" fontSize="8" fill="#8a8a8f" fontFamily="var(--font-jetbrains)">RAY BOX</text>
            </g>
          </DraggableSVG>
          <text x="30" y="450" fill="#8a8a8f" fontSize="11" fontFamily="var(--font-jetbrains)">DRAG RAY BOX / ANGLES FROM NORMAL</text>
          <text x="560" y="450" fill="#8a8a8f" fontSize="11" fontFamily="var(--font-jetbrains)">{lampOn ? 'RAY ON' : 'RAY OFF'} / {trials.length} RECORDED</text>
        </svg>
      </LabWorkspace>
    </div>
  );
}
