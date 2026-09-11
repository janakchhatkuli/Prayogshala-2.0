'use client';

import { useMemo, useState } from 'react';
import LabWorkspace from '@/components/lab/LabWorkspace';
import DraggableSVG, { type Point } from '@/components/lab/DraggableSVG';
import type { DemoStep } from '@/components/lab/useDemoRunner';
import { useStore } from '@/lib/store';

const K = 49; // N/m, spring constant of the model spring
const G = 9.81;
const ELASTIC_LIMIT_G = 600; // beyond this the spring deforms permanently
const MASSES = [50, 100, 200] as const;
const HOOK = { x: 300, y: 92 };
const PX_PER_CM = 8; // scale drawn on the bench

type Trial = { massG: number; forceN: number; extensionCm: number };

export default function HookesLawLab() {
  const save = useStore(s => s.completeExperiment);
  const [loadG, setLoadG] = useState(0);
  const [zeroed, setZeroed] = useState(false);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [complete, setComplete] = useState(false);
  const [feedback, setFeedback] = useState('Zero the pointer against the scale with no load, then drag a mass onto the hook.');
  const [hoverMass, setHoverMass] = useState<number | null>(null);

  const forceN = (loadG / 1000) * G;
  const overLimit = loadG > ELASTIC_LIMIT_G;
  // Beyond the elastic limit the model adds a permanent set that grows quickly.
  const extensionCm = (forceN / K) * 100 + (overLimit ? Math.pow((loadG - ELASTIC_LIMIT_G) / 100, 1.6) * 1.8 : 0);
  const extPx = extensionCm * PX_PER_CM;

  const fit = useMemo(() => {
    const pts = trials.filter(t => t.massG <= ELASTIC_LIMIT_G);
    if (pts.length < 2) return null;
    const n = pts.length;
    const sx = pts.reduce((s, p) => s + p.extensionCm / 100, 0), sy = pts.reduce((s, p) => s + p.forceN, 0);
    const sxx = pts.reduce((s, p) => s + (p.extensionCm / 100) ** 2, 0), sxy = pts.reduce((s, p) => s + (p.extensionCm / 100) * p.forceN, 0);
    return (n * sxy - sx * sy) / (n * sxx - sx * sx);
  }, [trials]);

  const addMass = (g: number) => {
    if (complete) return;
    if (!zeroed) { setZeroed(true); setFeedback(`Pointer zeroed automatically, then ${g} g added. Total load ${loadG + g} g.`); setLoadG(v => v + g); return; }
    setLoadG(v => v + g);
    setFeedback(`${g} g added. Total load ${loadG + g} g. Read the pointer and record when it settles.`);
  };

  const dropMass = (g: number, p: Point) => {
    const hookPoint = { x: HOOK.x, y: HOOK.y + 150 + extPx + 30 };
    if (Math.hypot(p.x - hookPoint.x, p.y - hookPoint.y) < 60) addMass(g);
    else setFeedback('Release the mass on the hanger below the spring.');
  };

  const record = () => {
    if (!zeroed || complete || loadG === 0 || trials.some(t => t.massG === loadG)) return;
    setTrials(prev => [...prev, { massG: loadG, forceN, extensionCm }].sort((a, b) => a.massG - b.massG));
    setFeedback(overLimit ? 'Recorded, but this point is past the elastic limit and will not be used in the fit.' : 'Recorded. Add another mass for the next point.');
  };

  const removeAll = () => { setLoadG(0); setFeedback('Hanger emptied. Add masses again or record more points.'); };

  const reset = () => { setLoadG(0); setZeroed(false); setTrials([]); setComplete(false); setFeedback('Bench reset. Zero the pointer, then load the spring.'); };

  const trialFor = (massG: number): Trial => { const f = (massG / 1000) * G; return { massG, forceN: f, extensionCm: (f / K) * 100 }; };
  const demo: DemoStep[] = [
    { caption: 'Zero the pointer against the scale with no load.', run: () => { setZeroed(true); setLoadG(0); } },
    { caption: 'Hang 100 g on the hanger. The spring stretches about 2 cm.', run: () => setLoadG(100) },
    { caption: 'Record the reading: 0.98 N, 2.0 cm.', run: () => setTrials([trialFor(100)]) },
    { caption: 'Add another 100 g. Extension doubles to 4 cm.', run: () => setLoadG(200) },
    { caption: 'Record: 1.96 N, 4.0 cm.', run: () => setTrials([trialFor(100), trialFor(200)]) },
    { caption: 'Add a 200 g mass. Total 400 g, extension 8 cm.', run: () => setLoadG(400) },
    { caption: 'Record: 3.92 N, 8.0 cm. The points fall on a straight line.', run: () => setTrials([trialFor(100), trialFor(200), trialFor(400)]) },
    { caption: 'Add 400 g more: past the elastic limit the spring stretches further than the line predicts.', run: () => setLoadG(800), wait: 2200 },
    { caption: 'Remove the masses. The slope of F against x gives k = 49 N/m.', run: () => setLoadG(0), wait: 1800 },
  ];

  const currentStep = !zeroed ? 0 : loadG === 0 && trials.length === 0 ? 1 : trials.length < 3 ? 2 : 3;
  const springTop = HOOK.y + 8;
  const springLen = 150 + extPx;
  const coils = 14;

  return (
    <div lang="en">
      <LabWorkspace experimentId="hookes-law" demo={demo} title="Hooke's law" subject="Physics"
        intro="Is the extension of a spring proportional to the load hanging from it? Zero the pointer, add slotted masses one at a time and read the extension. Plot force against extension and find the spring constant."
        equipment={['Retort stand and clamp', 'Steel spring with pointer', 'Metre rule (cm)', 'Mass hanger', 'Slotted masses 50 g, 100 g, 200 g']}
        steps={['Zero the pointer', 'Load the hanger', 'Record three or more points', 'Find k from the graph']}
        currentStep={currentStep} complete={complete} onReset={reset}
        controls={<div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button className="lab-button" aria-pressed={zeroed} disabled={complete || loadG > 0} onClick={() => { setZeroed(true); setFeedback('Pointer zeroed at 0.0 cm. Drag a mass onto the hanger.'); }}>{zeroed ? 'Pointer zeroed' : 'Zero pointer'}</button>
            {MASSES.map(m => <button key={m} className="lab-button" disabled={complete} onClick={() => addMass(m)}>+ {m} g</button>)}
            <button className="lab-button" disabled={loadG === 0 || complete} onClick={removeAll}>Remove masses</button>
            <button className="lab-button" disabled={!zeroed || loadG === 0 || complete || trials.some(t => t.massG === loadG)} onClick={record}>Record reading</button>
            <button className="lab-button lab-button-primary" disabled={trials.filter(t => t.massG <= ELASTIC_LIMIT_G).length < 3 || complete} onClick={() => { save('hookes-law', fit && Math.abs(fit - K) / K < 0.05 ? 100 : 90); setComplete(true); setFeedback('Investigation saved. Compare your k with the model value.'); }}>Complete investigation</button>
          </div>
          <p className="text-xs text-muted">Masses can be dragged from the tray onto the hanger, or added with the buttons. Loads above {ELASTIC_LIMIT_G} g exceed the elastic limit in this model.</p>
          <p role="status" className="text-sm text-accent-2">{feedback}</p>
        </div>}
        observations={<div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div className="lab-readout"><p className="label text-muted">Load</p><p className="num mt-1 text-xl text-fg">{loadG} g</p></div>
            <div className="lab-readout"><p className="label text-muted">Extension</p><p className={`num mt-1 text-xl ${overLimit ? 'text-bad' : 'text-physics'}`}>{zeroed ? extensionCm.toFixed(1) : '--'} cm</p></div>
          </div>
          <p className="text-fg-2">Force on spring: <strong className="num">{forceN.toFixed(2)} N</strong></p>
          {trials.length === 0 ? <p className="text-muted">Recorded points appear here.</p> : (
            <table className="w-full text-left text-xs"><thead><tr className="border-b border-line text-muted"><th className="py-2">m (g)</th><th>F (N)</th><th>x (cm)</th></tr></thead>
              <tbody>{trials.map(t => <tr key={t.massG} className={`border-b border-line ${t.massG > ELASTIC_LIMIT_G ? 'text-bad' : 'text-fg-2'}`}><td className="num py-2">{t.massG}</td><td className="num">{t.forceN.toFixed(2)}</td><td className="num">{t.extensionCm.toFixed(1)}</td></tr>)}</tbody></table>
          )}
          {fit && <p className="text-fg-2">Slope of F-x line: <strong className="num text-physics">{fit.toFixed(1)} N/m</strong></p>}
          <p className="num rounded border border-line p-3 text-xs">F = k x</p>
        </div>}
        conclusion={complete
          ? <><p><strong>Result:</strong> k = {fit?.toFixed(1)} N/m from {trials.filter(t => t.massG <= ELASTIC_LIMIT_G).length} points. Model spring: {K} N/m.</p><p className="mt-3">Extension is directly proportional to force up to the elastic limit, so the graph is a straight line through the origin. Past the limit the spring stretches more than the law predicts and does not return to its original length.</p></>
          : 'Extension should grow in equal steps for equal added masses. The gradient of the force-extension graph is the spring constant.'}
      >
        <svg viewBox="0 0 800 470" role="group" aria-label="Spring bench with stand, scale and slotted masses">
          <defs>
            <linearGradient id="hk-steel" x1="0" x2="1"><stop stopColor="#3a3a3f" /><stop offset=".5" stopColor="#9a9a9f" /><stop offset="1" stopColor="#3a3a3f" /></linearGradient>
            <linearGradient id="hk-brass" x1="0" x2="1"><stop stopColor="#6b4a12" /><stop offset=".5" stopColor="#f2c66b" /><stop offset="1" stopColor="#6b4a12" /></linearGradient>
          </defs>
          <text x="30" y="35" fill="#8a8a8f" fontFamily="var(--font-jetbrains)" fontSize="11" letterSpacing="3">MECHANICS / BENCH 03</text>
          <rect x="0" y="420" width="800" height="50" fill="#1f1f21" /><rect x="0" y="420" width="800" height="3" fill="#fe5b2a" />
          {/* Stand */}
          <rect x="120" y="405" width="240" height="16" rx="3" fill="url(#hk-steel)" /><rect x="180" y="40" width="10" height="368" rx="3" fill="url(#hk-steel)" />
          <rect x="185" y="78" width="120" height="8" rx="3" fill="url(#hk-steel)" /><circle cx={HOOK.x} cy={HOOK.y - 4} r="6" fill="#5f5f66" />
          {/* Spring */}
          <path d={Array.from({ length: coils }, (_, i) => { const y0 = springTop + (springLen / coils) * i; const y1 = y0 + springLen / coils; return `${i === 0 ? `M${HOOK.x} ${springTop}` : ''} L${HOOK.x + 16} ${y0 + (y1 - y0) * 0.25} L${HOOK.x - 16} ${y0 + (y1 - y0) * 0.75} L${HOOK.x} ${y1}`; }).join(' ')}
            stroke={overLimit ? '#f87171' : '#c9c9c6'} strokeWidth="2.5" fill="none" strokeLinejoin="round" style={{ transition: 'd 400ms' }} />
          {/* Pointer */}
          <path d={`M${HOOK.x} ${springTop + springLen} h70`} stroke="#fe5b2a" strokeWidth="2" style={{ transition: 'd 400ms' }} />
          <path d={`M${HOOK.x + 70} ${springTop + springLen} l8 -4 v8 z`} fill="#fe5b2a" style={{ transition: 'd 400ms' }} />
          {/* Hanger */}
          <g style={{ transform: `translateY(${extPx}px)`, transition: 'transform 400ms' }}>
            <path d={`M${HOOK.x} ${springTop + 150} v18`} stroke="#c9c9c6" strokeWidth="2" />
            <rect x={HOOK.x - 3} y={springTop + 168} width="6" height="40" fill="#9a9a9f" />
            <rect x={HOOK.x - 26} y={springTop + 206} width="52" height="8" rx="2" fill="url(#hk-brass)" />
            {/* stacked masses, drawn as slotted discs */}
            {Array.from({ length: Math.round(loadG / 50) }, (_, i) => (
              <rect key={i} x={HOOK.x - 22} y={springTop + 198 - i * 10} width="44" height="9" rx="2" fill="url(#hk-brass)" stroke="#2a2a2e" strokeWidth=".5" />
            ))}
            <text x={HOOK.x} y={springTop + 232} textAnchor="middle" fill="#8a8a8f" fontFamily="var(--font-jetbrains)" fontSize="10">{loadG} g</text>
          </g>
          {/* Scale */}
          <rect x="390" y="228" width="44" height="172" rx="3" fill="#e9e2c8" stroke="#8a8a8f" />
          {Array.from({ length: 19 }, (_, i) => (
            <g key={i}>
              <line x1="390" x2={i % 5 === 0 ? 408 : i % 2 === 0 ? 402 : 398} y1={HOOK.y + 158 + i * PX_PER_CM} y2={HOOK.y + 158 + i * PX_PER_CM} stroke="#3a3a3f" />
              {i % 5 === 0 && <text x="412" y={HOOK.y + 161 + i * PX_PER_CM} fontSize="9" fill="#3a3a3f" fontFamily="var(--font-jetbrains)">{i}</text>}
            </g>
          ))}
          <text x="412" y="414" fontSize="9" fill="#8a8a8f" fontFamily="var(--font-jetbrains)">cm</text>
          {!zeroed && <text x="380" y="216" fill="#fe5b2a" fontSize="10" fontFamily="var(--font-jetbrains)">ZERO POINTER FIRST</text>}
          {/* Mass tray */}
          <g transform="translate(520 300)">
            <rect width="250" height="110" rx="6" fill="#161618" stroke="#2a2a2e" />
            <text x="12" y="20" fill="#8a8a8f" fontFamily="var(--font-jetbrains)" fontSize="10" letterSpacing="2">SLOTTED MASSES / DRAG TO HANGER</text>
            {MASSES.map((m, i) => (
              <DraggableSVG key={m} x={45 + i * 80} y={68} label={`${m} gram mass; drag onto the hanger`} disabled={complete}
                onMove={() => setHoverMass(m)} onCancel={() => setHoverMass(null)}
                onDrop={p => { setHoverMass(null); dropMass(m, { x: p.x + 520, y: p.y + 300 }); }}>
                <rect x="-26" y="-12" width="52" height="24" rx="3" fill="url(#hk-brass)" stroke="#2a2a2e" />
                <rect x="-3" y="-12" width="6" height="8" fill="#161618" />
                <text y="6" textAnchor="middle" fill="#2a1a05" fontFamily="var(--font-jetbrains)" fontSize="10" fontWeight="700">{m} g</text>
              </DraggableSVG>
            ))}
          </g>
          {hoverMass && <circle cx={HOOK.x} cy={HOOK.y + 150 + extPx + 30} r="40" fill="none" stroke="#fe5b2a" strokeDasharray="4 4" opacity=".7" />}
          {/* Live graph */}
          <g transform="translate(520 60)">
            <rect width="250" height="220" rx="6" fill="#0f0f10" stroke="#2a2a2e" />
            <text x="12" y="20" fill="#8a8a8f" fontFamily="var(--font-jetbrains)" fontSize="10" letterSpacing="2">F (N) vs x (cm)</text>
            <line x1="36" y1="196" x2="236" y2="196" stroke="#3a3a3f" /><line x1="36" y1="196" x2="36" y2="36" stroke="#3a3a3f" />
            {[0, 2, 4, 6].map(f => <text key={f} x="28" y={199 - f * 25} textAnchor="end" fontSize="8" fill="#5f5f66" fontFamily="var(--font-jetbrains)">{f}</text>)}
            {[0, 5, 10, 15, 20].map(x => <text key={x} x={36 + x * 10} y="210" textAnchor="middle" fontSize="8" fill="#5f5f66" fontFamily="var(--font-jetbrains)">{x}</text>)}
            {fit && <line x1="36" y1="196" x2={36 + 20 * 10} y2={196 - (fit * 0.2) * 25} stroke="#fe5b2a" strokeDasharray="4 3" />}
            {trials.map(t => <circle key={t.massG} cx={36 + Math.min(20, t.extensionCm) * 10} cy={196 - Math.min(6.4, t.forceN) * 25} r="4" fill={t.massG > ELASTIC_LIMIT_G ? '#f87171' : '#fbbf24'} stroke="#0f0f10" strokeWidth="1.5" />)}
            {zeroed && loadG > 0 && <circle cx={36 + Math.min(20, extensionCm) * 10} cy={196 - Math.min(6.4, forceN) * 25} r="6" fill="none" stroke="#c9c9c6" strokeDasharray="2 2" />}
          </g>
          <text x="30" y="450" fill="#8a8a8f" fontSize="11" fontFamily="var(--font-jetbrains)">k (model) = {K} N/m</text><text x="230" y="450" fill="#8a8a8f" fontSize="11" fontFamily="var(--font-jetbrains)">g = {G} m/s²</text>
        </svg>
      </LabWorkspace>
    </div>
  );
}
