'use client';

import { useEffect, useRef, useState } from 'react';
import LabWorkspace from '@/components/lab/LabWorkspace';
import DraggableSVG, { type Point } from '@/components/lab/DraggableSVG';
import type { DemoStep } from '@/components/lab/useDemoRunner';
import { useStore } from '@/lib/store';

const RAIL = { x0: 120, x1: 520, y: 330 }; // lamp slides along this rail
const BEAKER_X = 620;
const MAX_RATE = 42; // bubbles per minute, the CO2-limited plateau
const HALF_DIST = 12; // cm at which light gives half the plateau rate

type Trial = { distance: number; bubbles: number };

/** Saturating response: rate rises with intensity (1/d^2) and plateaus when CO2 limits. */
function rateFor(distanceCm: number, hasCO2: boolean) {
  const intensity = 1 / (distanceCm * distanceCm);
  const half = 1 / (HALF_DIST * HALF_DIST);
  const plateau = hasCO2 ? MAX_RATE : MAX_RATE * 0.25;
  return plateau * intensity / (intensity + half);
}

export default function PhotosynthesisLab() {
  const save = useStore(s => s.completeExperiment);
  const [distance, setDistance] = useState(20);
  const [preview, setPreview] = useState<number | null>(null);
  const [lampOn, setLampOn] = useState(false);
  const [co2, setCo2] = useState(false);
  const [counting, setCounting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [bubbles, setBubbles] = useState(0);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [complete, setComplete] = useState(false);
  const [feedback, setFeedback] = useState('Add sodium hydrogencarbonate to the water, switch on the lamp and slide it to a distance. Then count bubbles for one minute.');
  const last = useRef<number | null>(null);
  const bubbleAcc = useRef(0);

  const shownDistance = preview ?? distance;
  const rate = lampOn ? rateFor(distance, co2) : 0;
  const lampX = RAIL.x1 - ((shownDistance - 5) / 45) * (RAIL.x1 - RAIL.x0);
  const distanceFrom = (p: Point) => Math.max(5, Math.min(50, Math.round(50 - ((p.x - RAIL.x0) / (RAIL.x1 - RAIL.x0)) * 45)));
  const constrain = (p: Point) => ({ x: Math.max(RAIL.x0, Math.min(RAIL.x1, p.x)), y: RAIL.y });

  // One "minute" of counting is compressed to 12 real seconds.
  useEffect(() => {
    if (!counting) { last.current = null; return; }
    let frame: number;
    const tick = (now: number) => {
      if (last.current !== null) {
        const dt = (now - last.current) / 1000;
        const simMinutes = dt * (1 / 12);
        setElapsed(e => Math.min(1, e + simMinutes));
        bubbleAcc.current += rate * simMinutes;
        setBubbles(Math.floor(bubbleAcc.current));
      }
      last.current = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [counting, rate]);

  useEffect(() => { if (elapsed >= 1 && counting) { setCounting(false); setFeedback('One minute counted. Record this distance, then move the lamp.'); } }, [elapsed, counting]);

  const startCount = () => {
    if (!lampOn || complete) { setFeedback('Switch on the lamp first.'); return; }
    bubbleAcc.current = 0; setBubbles(0); setElapsed(0); setCounting(true);
    setFeedback(`Counting bubbles at ${distance} cm for one minute (time compressed).`);
  };
  const record = () => {
    if (elapsed < 1 || complete || trials.some(t => t.distance === distance)) return;
    setTrials(prev => [...prev, { distance, bubbles }].sort((a, b) => a.distance - b.distance));
    setFeedback('Recorded. Choose a different distance and count again.');
    setElapsed(0); setBubbles(0); bubbleAcc.current = 0;
  };
  const moveLamp = (d: number) => { if (complete) return; if (counting) { setCounting(false); } setDistance(d); setElapsed(0); setBubbles(0); bubbleAcc.current = 0; setFeedback(`Lamp at ${d} cm. Start a one-minute count.`); };
  const reset = () => { setDistance(20); setPreview(null); setLampOn(false); setCo2(false); setCounting(false); setElapsed(0); setBubbles(0); setTrials([]); setComplete(false); bubbleAcc.current = 0; setFeedback('Bench reset.'); };

  const currentStep = !co2 ? 0 : !lampOn ? 1 : trials.length === 0 ? 2 : trials.length < 3 ? 3 : 4;
  const bubbleCount = Math.min(10, Math.round(rate / 4));

  const countFor = (d: number) => Math.round(rateFor(d, true));
  const showCount = (d: number) => { setDistance(d); setElapsed(1); setBubbles(countFor(d)); bubbleAcc.current = countFor(d); };
  const demo: DemoStep[] = [
    { caption: 'Dissolve sodium hydrogencarbonate so the pondweed has plenty of carbon dioxide.', run: () => setCo2(true) },
    { caption: 'Switch on the lamp at 40 cm. Only a few bubbles per minute.', run: () => { setLampOn(true); setDistance(40); setElapsed(0); setBubbles(0); }, wait: 2000 },
    { caption: 'Count for one minute: about 3 bubbles.', run: () => showCount(40) },
    { caption: 'Record and move the lamp to 20 cm. Intensity is four times higher.', run: () => { setTrials([{ distance: 40, bubbles: countFor(40) }]); setDistance(20); setElapsed(0); setBubbles(0); }, wait: 2000 },
    { caption: 'Count again: about 11 bubbles per minute.', run: () => showCount(20) },
    { caption: 'Record and move to 10 cm.', run: () => { setTrials([{ distance: 40, bubbles: countFor(40) }, { distance: 20, bubbles: countFor(20) }]); setDistance(10); setElapsed(0); setBubbles(0); }, wait: 2000 },
    { caption: 'About 25 bubbles per minute. Rate rose steeply, then starts to level off.', run: () => showCount(10) },
    { caption: 'Record and try 5 cm: the curve flattens. Light is no longer the limiting factor; CO2 is.', run: () => { setTrials([{ distance: 40, bubbles: countFor(40) }, { distance: 20, bubbles: countFor(20) }, { distance: 10, bubbles: countFor(10) }]); showCount(5); }, wait: 2400 },
    { caption: 'Four points plotted: rate against distance follows an inverse-square rise to a plateau.', run: () => setTrials([{ distance: 40, bubbles: countFor(40) }, { distance: 20, bubbles: countFor(20) }, { distance: 10, bubbles: countFor(10) }, { distance: 5, bubbles: countFor(5) }]), wait: 1800 },
  ];

  return (
    <div lang="en">
      <LabWorkspace experimentId="photosynthesis" demo={demo} title="Rate of photosynthesis" subject="Biology"
        intro="How does light intensity affect how fast a plant photosynthesises? Count oxygen bubbles from a piece of pondweed while a lamp sits at different distances. Decide what limits the rate when the light is very bright."
        equipment={['Elodea (pondweed) in a boiling tube', 'Beaker of water as heat shield', 'Bench lamp on a rail', 'Metre rule', 'Sodium hydrogencarbonate', 'Stopwatch']}
        steps={['Add NaHCO3 for CO2', 'Switch on lamp', 'Count bubbles for 1 minute', 'Record three distances', 'Plot rate vs distance']}
        currentStep={currentStep} complete={complete} onReset={reset}
        controls={<div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-fg-2">Lamp distance <strong className="num float-right text-biology">{shownDistance} cm</strong>
              <input aria-label="Lamp distance" type="range" min="5" max="50" step="1" value={distance} disabled={complete} onChange={e => moveLamp(Number(e.target.value))} className="mt-2 w-full" /></label>
            <div className="flex flex-wrap items-end gap-2">
              <button className="lab-button" aria-pressed={co2} disabled={co2 || complete} onClick={() => { setCo2(true); setFeedback('NaHCO3 dissolved: carbon dioxide supply is no longer the first limit. Switch on the lamp.'); }}>{co2 ? 'NaHCO3 added' : 'Add NaHCO3'}</button>
              <button className="lab-button" aria-pressed={lampOn} disabled={counting || complete} onClick={() => { setLampOn(v => !v); setFeedback(lampOn ? 'Lamp off.' : 'Lamp on. Slide it along the rail, then count.'); }}>{lampOn ? 'Lamp on' : 'Switch on lamp'}</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="lab-button lab-button-primary" disabled={!lampOn || counting || complete} onClick={startCount}>Count for 1 minute</button>
            <button className="lab-button" disabled={elapsed < 1 || complete || trials.some(t => t.distance === distance)} onClick={record}>Record count</button>
            <button className="lab-button lab-button-primary" disabled={trials.length < 3 || complete} onClick={() => { save('photosynthesis', co2 ? 100 : 85); setComplete(true); setFeedback('Investigation saved.'); }}>Complete investigation</button>
          </div>
          <p className="text-xs text-muted">The lamp can be dragged along the rail. A one-minute count is compressed to about 12 seconds. The beaker of water absorbs heat so temperature stays roughly constant.</p>
          <p role="status" className="text-sm text-accent-2">{feedback}</p>
        </div>}
        observations={<div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div className="lab-readout"><p className="label text-muted">Bubbles</p><p className="num mt-1 text-xl text-biology">{bubbles}</p></div>
            <div className="lab-readout"><p className="label text-muted">Timer</p><p className="num mt-1 text-xl text-fg">{Math.round(elapsed * 60)} s</p></div>
          </div>
          <p className="text-fg-2">Relative intensity: <strong className="num">{(10000 / (distance * distance)).toFixed(0)}</strong> (1/d² x 10⁴)</p>
          {trials.length === 0 ? <p className="text-muted">Recorded counts appear here.</p> : (
            <table className="w-full text-left text-xs"><thead><tr className="border-b border-line text-muted"><th className="py-2">d (cm)</th><th>bubbles/min</th><th>1/d² x10⁴</th></tr></thead>
              <tbody>{trials.map(t => <tr key={t.distance} className="border-b border-line text-fg-2"><td className="num py-2">{t.distance}</td><td className="num">{t.bubbles}</td><td className="num">{(10000 / (t.distance ** 2)).toFixed(0)}</td></tr>)}</tbody></table>
          )}
          <p className="num rounded border border-line p-3 text-xs">6CO2 + 6H2O -&gt; C6H12O6 + 6O2</p>
        </div>}
        conclusion={complete
          ? <><p><strong>Result:</strong> {trials.map(t => `${t.distance} cm: ${t.bubbles}/min`).join('; ')}.</p><p className="mt-3">Bubble rate rises as the lamp comes closer (light intensity increases roughly as 1/d²), then levels off. At high intensity light is no longer the limiting factor; {co2 ? 'carbon dioxide concentration or temperature' : 'the low carbon dioxide supply'} limits the rate instead.</p></>
          : 'More light, more bubbles, up to a point. Beyond that, the rate plateaus because something other than light (usually CO2) becomes the limiting factor.'}
      >
        <svg viewBox="0 0 800 470" role="group" aria-label="Photosynthesis bench with pondweed in a tube, a beaker and a bench lamp on a rail">
          <defs>
            <linearGradient id="ps-water" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#60a5fa" stopOpacity=".3" /><stop offset="1" stopColor="#2563eb" stopOpacity=".45" /></linearGradient>
            <linearGradient id="ps-glass" x1="0" x2="1"><stop stopColor="#fff" stopOpacity=".16" /><stop offset=".5" stopColor="#fff" stopOpacity=".03" /><stop offset="1" stopColor="#fff" stopOpacity=".12" /></linearGradient>
            <radialGradient id="ps-light" cx="1" cy=".5" r="1"><stop stopColor="#fbbf24" stopOpacity=".35" /><stop offset="1" stopColor="#fbbf24" stopOpacity="0" /></radialGradient>
          </defs>
          <text x="30" y="35" fill="#8a8a8f" fontFamily="var(--font-jetbrains)" fontSize="11" letterSpacing="3">PLANT BIOLOGY / BENCH 06</text>
          <rect x="0" y="420" width="800" height="50" fill="#1f1f21" /><rect x="0" y="420" width="800" height="3" fill="#fe5b2a" />
          {/* light cone */}
          {lampOn && <path d={`M${lampX + 26} ${RAIL.y - 20} L${BEAKER_X - 60} 200 L${BEAKER_X - 60} 420 L${lampX + 26} ${RAIL.y + 20} Z`} fill="url(#ps-light)" opacity={Math.min(1, 200 / (shownDistance * shownDistance) + .2)} />}
          {/* rail and rule */}
          <rect x={RAIL.x0 - 30} y={RAIL.y + 30} width={RAIL.x1 - RAIL.x0 + 100} height="8" rx="2" fill="#3a3a3f" />
          <rect x={RAIL.x0 - 30} y={RAIL.y + 48} width={RAIL.x1 - RAIL.x0 + 100} height="16" fill="#e9e2c8" />
          {Array.from({ length: 10 }, (_, k) => { const d = k * 5 + 5; const x = RAIL.x1 - ((d - 5) / 45) * (RAIL.x1 - RAIL.x0); return <g key={k}><line x1={x} x2={x} y1={RAIL.y + 48} y2={RAIL.y + 56} stroke="#3a3a3f" /><text x={x} y={RAIL.y + 76} textAnchor="middle" fontSize="8" fill="#8a8a8f" fontFamily="var(--font-jetbrains)">{d}</text></g>; })}
          <text x={RAIL.x1 + 76} y={RAIL.y + 60} fontSize="8" fill="#8a8a8f" fontFamily="var(--font-jetbrains)">cm</text>
          {/* beaker */}
          <rect x={BEAKER_X - 60} y="200" width="120" height="200" rx="6" fill="url(#ps-glass)" stroke="#c9c9c6" strokeWidth="1.5" />
          <rect x={BEAKER_X - 58} y="230" width="116" height="168" rx="4" fill="url(#ps-water)" />
          <text x={BEAKER_X} y="190" textAnchor="middle" fontSize="9" fill="#8a8a8f" fontFamily="var(--font-jetbrains)" letterSpacing="1.5">HEAT SHIELD</text>
          {/* boiling tube with pondweed */}
          <rect x={BEAKER_X - 18} y="160" width="36" height="230" rx="16" fill="url(#ps-glass)" stroke="#e5e5e5" strokeWidth="1.5" />
          <rect x={BEAKER_X - 16} y="176" width="32" height="212" rx="14" fill={co2 ? 'rgba(96,165,250,.25)' : 'rgba(96,165,250,.15)'} />
          <path d={`M${BEAKER_X} 385 c-8 -30 8 -50 -4 -80 c-8 -28 10 -50 2 -80`} stroke="#22c55e" strokeWidth="3" fill="none" strokeLinecap="round" />
          {[0, 1, 2, 3, 4, 5, 6].map(k => <ellipse key={k} cx={BEAKER_X + (k % 2 ? 8 : -8)} cy={370 - k * 24} rx="7" ry="3" fill="#4ade80" transform={`rotate(${k % 2 ? 25 : -25} ${BEAKER_X + (k % 2 ? 8 : -8)} ${370 - k * 24})`} />)}
          {/* bubbles */}
          {lampOn && Array.from({ length: bubbleCount }, (_, k) => (
            <circle key={k} cx={BEAKER_X - 6 + (k % 3) * 6} cy="240" r={1.4 + (k % 2) * .6} fill="#fff" opacity=".85" className="bubble" style={{ animationDelay: `${(k * 0.37) % 3}s`, animationDuration: `${2.4 + (k % 3) * 0.3}s` }} />
          ))}
          <text x={BEAKER_X} y="150" textAnchor="middle" fontSize="9" fill="#8a8a8f" fontFamily="var(--font-jetbrains)" letterSpacing="1.5">ELODEA</text>
          {/* lamp */}
          <DraggableSVG x={lampX} y={RAIL.y} label="Bench lamp; drag along the rail to change distance" disabled={complete}
            constrain={constrain} onMove={p => setPreview(distanceFrom(p))} onCancel={() => setPreview(null)}
            onDrop={p => { setPreview(null); moveLamp(distanceFrom(p)); }}>
            <rect x="-30" y="16" width="60" height="14" rx="3" fill="#3a3a3f" />
            <rect x="-4" y="-10" width="8" height="30" fill="#5f5f66" />
            <path d="M-6 -12 L32 -30 L32 8 L-6 -4 Z" fill="#27272a" stroke="#5f5f66" />
            <rect x="26" y="-26" width="6" height="30" fill={lampOn ? '#fbbf24' : '#3a3a3f'} className={lampOn ? 'led-on' : ''} />
            <text y="42" textAnchor="middle" fontSize="8" fill="#8a8a8f" fontFamily="var(--font-jetbrains)">LAMP</text>
          </DraggableSVG>
          {/* distance marker */}
          <line x1={lampX + 32} x2={BEAKER_X - 62} y1={RAIL.y - 40} y2={RAIL.y - 40} stroke="#fe5b2a" strokeDasharray="4 3" />
          <text x={(lampX + 32 + BEAKER_X - 62) / 2} y={RAIL.y - 46} textAnchor="middle" fontSize="11" fill="#fe5b2a" fontFamily="var(--font-jetbrains)">d = {shownDistance} cm</text>
          {/* NaHCO3 */}
          <g transform="translate(60 340)" opacity={co2 ? .5 : 1}>
            <rect width="44" height="60" rx="4" fill="#1f1f21" stroke="#3a3a3f" /><rect x="14" y="-10" width="16" height="12" rx="2" fill="#3a3a3f" />
            <rect x="6" y="22" width="32" height="24" fill="#f2f2f0" /><text x="22" y="33" textAnchor="middle" fontSize="7" fill="#0f0f10" fontWeight="700" fontFamily="var(--font-jetbrains)">NaHCO3</text><text x="22" y="42" textAnchor="middle" fontSize="6" fill="#5f5f66">CO2 source</text>
          </g>
          {/* live graph */}
          <g transform="translate(40 60)">
            <rect width="260" height="200" rx="6" fill="#0f0f10" stroke="#2a2a2e" />
            <text x="12" y="20" fill="#8a8a8f" fontFamily="var(--font-jetbrains)" fontSize="10" letterSpacing="2">BUBBLES/MIN vs DISTANCE</text>
            <line x1="36" y1="176" x2="246" y2="176" stroke="#3a3a3f" /><line x1="36" y1="176" x2="36" y2="36" stroke="#3a3a3f" />
            {[0, 15, 30, 45].map(v => <text key={v} x="28" y={179 - v * 3} textAnchor="end" fontSize="8" fill="#5f5f66" fontFamily="var(--font-jetbrains)">{v}</text>)}
            {[5, 20, 35, 50].map(d => <text key={d} x={36 + (d - 5) * 4.6} y="190" textAnchor="middle" fontSize="8" fill="#5f5f66" fontFamily="var(--font-jetbrains)">{d}</text>)}
            {/* model curve, faint */}
            <path d={Array.from({ length: 46 }, (_, k) => { const d = 5 + k; return `${k === 0 ? 'M' : 'L'}${36 + (d - 5) * 4.6} ${176 - rateFor(d, co2) * 3}`; }).join(' ')} stroke="#4ade80" strokeOpacity=".25" fill="none" />
            {trials.map(t => <circle key={t.distance} cx={36 + (t.distance - 5) * 4.6} cy={176 - t.bubbles * 3} r="4" fill="#4ade80" stroke="#0f0f10" strokeWidth="1.5" />)}
            {elapsed > 0 && <circle cx={36 + (distance - 5) * 4.6} cy={176 - (bubbles / Math.max(elapsed, 0.05)) * 3} r="5" fill="none" stroke="#c9c9c6" strokeDasharray="2 2" />}
          </g>
          <text x="30" y="450" fill="#8a8a8f" fontSize="11" fontFamily="var(--font-jetbrains)">{counting ? `COUNTING / ${Math.round(elapsed * 60)} s` : lampOn ? 'LAMP ON' : 'LAMP OFF'}</text>
          <text x="560" y="450" fill="#8a8a8f" fontSize="11" fontFamily="var(--font-jetbrains)">{co2 ? 'CO2 SUPPLIED' : 'LOW CO2'} / {trials.length} RECORDED</text>
        </svg>
      </LabWorkspace>
    </div>
  );
}
