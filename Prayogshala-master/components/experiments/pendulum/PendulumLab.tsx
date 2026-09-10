'use client';

import { useEffect, useId, useRef, useState } from 'react';
import LabWorkspace from '@/components/lab/LabWorkspace';
import DraggableSVG, { type Point } from '@/components/lab/DraggableSVG';
import { useStore } from '@/lib/store';

const GRAVITY = 9.81;
type Trial = { length: number; period: number; time: number };

export default function PendulumLab() {
  const id = useId().replace(/:/g, '');
  const save = useStore(s => s.completeExperiment);
  const [length, setLength] = useState(1);
  const [amplitude, setAmplitude] = useState(12);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [angle, setAngle] = useState(12);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [complete, setComplete] = useState(false);
  const [clampOpen, setClampOpen] = useState(false);
  const [previewAngle, setPreviewAngle] = useState<number | null>(null);
  const [previewLength, setPreviewLength] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('Pull the bob sideways and release. To adjust length, loosen the clamp screw on the stand, slide the blue scale collar, then tighten the screw.');
  const clock = useRef(0);
  const period = 2 * Math.PI * Math.sqrt(length / GRAVITY);
  // The scale and string share one true linear calibration: 160 SVG units per metre.
  const shownLength = previewLength ?? length;
  const pixels = shownLength * 160;
  const radians = (previewAngle ?? angle) * Math.PI / 180;
  const bob = { x: 370 + Math.sin(radians) * pixels, y: 86 + Math.cos(radians) * pixels };
  const cycles = Math.min(5, Math.floor((elapsed + 0.00001) / period));
  const measured = elapsed >= 5 * period;

  useEffect(() => {
    if (!running) return;
    const started = performance.now() - clock.current * 1000;
    let frame: number;
    function tick(now: number) {
      const time = Math.min(5 * period, (now - started) / 1000);
      clock.current = time;
      setElapsed(time);
      setAngle(amplitude * Math.cos(2 * Math.PI * time / period));
      if (time >= 5 * period) {
        setRunning(false);
        setFeedback('Five oscillations timed. Record this length, then compare a different string length.');
      } else frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, period, amplitude]);

  function adjustLength(value: number) {
    if (running || complete) return;
    setRunning(false); setLength(Math.max(0.4, Math.min(1.8, Math.round(value * 20) / 20)));
    setPreviewLength(null); setPreviewAngle(null);
    clock.current = 0; setElapsed(0); setAngle(amplitude);
    setFeedback('Length set. Pull the bob aside and release to time five oscillations.');
  }

  function release(point: Point) {
    setPreviewAngle(null);
    if (running || complete || clampOpen) return;
    const degrees = Math.max(-20, Math.min(20, Math.atan2(point.x - 370, point.y - 86) * 180 / Math.PI));
    if (Math.abs(degrees) < 3) {
      setFeedback('Pull the bob gently to one side (3-20 degrees). Large angles do not fit the small-angle model.');
      return;
    }
    setAmplitude(degrees); setAngle(degrees); clock.current = 0; setElapsed(0); setRunning(true);
    setFeedback('Released. The model timer is timing five full oscillations; watch the period change with length.');
  }

  function constrainBob(point: Point) {
    const theta = Math.max(-20, Math.min(20, Math.atan2(point.x - 370, point.y - 86) * 180 / Math.PI)) * Math.PI / 180;
    return { x: 370 + Math.sin(theta) * pixels, y: 86 + Math.cos(theta) * pixels };
  }

  function toggleClamp() {
    if (running || complete) return;
    setClampOpen(!clampOpen);
    setFeedback(clampOpen ? 'Clamp tightened. Release the bob to start timing.' : 'Clamp loosened. Drag the blue collar along the ruler to set pivot-to-bob-centre length, then tighten the screw.');
  }

  function toggleTimer() {
    if (complete || clampOpen) return;
    if (running) { setRunning(false); setFeedback('Motion and model timer paused together. Start resumes this same trial.'); }
    else if (elapsed > 0 && !measured) { setRunning(true); setFeedback('Resumed the same timed trial.'); }
    else release(bob);
  }

  function record() {
    if (!measured || complete || trials.some(t => t.length === length)) return;
    setTrials(previous => [...previous, { length, period: elapsed / 5, time: elapsed }]);
    setFeedback('Trial recorded. Compare at least two different lengths to complete your investigation.');
  }

  function reset() {
    setRunning(false); clock.current = 0; setElapsed(0); setLength(1); setAmplitude(12); setAngle(12); setTrials([]); setComplete(false);
    setClampOpen(false); setPreviewAngle(null); setPreviewLength(null);
    setFeedback('Bench reset. Pull the bob aside to begin a fresh investigation.');
  }

  return <div lang="en"><LabWorkspace title="Simple pendulum" subject="Physics"
    intro="Does a longer pendulum swing more slowly? Adjust the string, release the bob and time five oscillations at two different lengths. This ideal small-angle model ignores friction and bob size; the timer records simulation time, not an independent measurement."
    equipment={['Retort stand and clamp', 'Adjustable string', 'Brass bob', 'Metre scale', 'Five-cycle model timer']}
    steps={['Set length and release bob', 'Time five oscillations', 'Record two different lengths', 'Calculate gravity']}
    currentStep={trials.length >= 2 ? 3 : running || measured ? measured ? 2 : 1 : 0}
    complete={complete} onReset={reset}
    controls={<div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">String length <strong className="float-right text-amber-300">{length.toFixed(2)} m</strong><input aria-label="String length" type="range" min="0.4" max="1.8" step="0.05" value={length} disabled={running || complete} onChange={e => { adjustLength(Number(e.target.value)); setClampOpen(false); }} className="mt-2 w-full" /></label>
        <label className="text-sm">Release angle <strong className="float-right text-amber-300">{Math.abs(amplitude).toFixed(0)} degrees</strong><input aria-label="Release angle" type="range" min="3" max="20" step="1" value={Math.abs(amplitude)} disabled={running || complete} onChange={e => { const value = Number(e.target.value); setAmplitude(value); setAngle(value); clock.current = 0; setElapsed(0); }} className="mt-2 w-full" /></label></div>
      <div className="flex flex-wrap gap-2">
        <button className="lab-button" disabled={running || complete} aria-pressed={clampOpen} onClick={toggleClamp}>{clampOpen ? 'Tighten clamp' : 'Loosen clamp'}</button>
        <button className="lab-button lab-button-primary" disabled={running || complete || clampOpen} onClick={() => release(bob)}>Release bob</button>
        <button className="lab-button" disabled={!running} onClick={toggleTimer}>Pause motion</button>
        <button className="lab-button" disabled={running || elapsed === 0 || measured || complete || clampOpen} onClick={toggleTimer}>Resume timing</button>
        <button className="lab-button" disabled={!measured || complete || trials.some(t => t.length === length)} onClick={record}>Record trial</button>
        <button className="lab-button lab-button-primary" disabled={trials.length < 2 || running || complete} onClick={() => { save('simple-pendulum'); setComplete(true); setFeedback('Two lengths compared. Your investigation is saved.'); }}>Complete investigation</button>
      </div><p className="text-xs text-slate-400">Length is measured from the pivot to the bob centre at rest, not to the bob surface. The length slider sets and secures the string directly. Pause freezes both motion and model time.</p><p role="status" className="text-sm text-blue-200">{feedback}</p>
    </div>}
    observations={<div className="space-y-4 text-sm"><div className="grid grid-cols-2 gap-2"><div className="rounded-xl bg-slate-950 p-3"><p className="text-xs text-slate-400">Elapsed</p><p className="mt-1 font-mono text-xl text-amber-300">{elapsed.toFixed(2)} s</p></div><div className="rounded-xl bg-slate-950 p-3"><p className="text-xs text-slate-400">Full swings</p><p className="mt-1 font-mono text-xl">{cycles} / 5</p></div></div>
      <p className="text-slate-300">Expected period: <strong>{period.toFixed(3)} s</strong></p>
      {trials.length === 0 ? <p className="text-slate-400">Your measurements will appear here after five oscillations.</p> : <table className="w-full text-left text-xs"><caption className="mb-2 text-left text-slate-400">Recorded trials</caption><thead><tr className="border-b border-slate-700"><th className="py-2">L (m)</th><th>5T (s)</th><th>T (s)</th></tr></thead><tbody>{trials.map(t => <tr key={t.length} className="border-b border-slate-800"><td className="py-2">{t.length.toFixed(2)}</td><td>{t.time.toFixed(2)}</td><td>{t.period.toFixed(3)}</td></tr>)}</tbody></table>}
      <p className="rounded-lg border border-slate-700 p-3 font-mono text-xs">T = 2 pi sqrt(L / g)</p>
    </div>}
    conclusion={complete ? <><p><strong>Observation:</strong> {trials.slice().sort((a,b) => a.length-b.length).map(t => `${t.length.toFixed(2)} m: ${t.period.toFixed(3)} s`).join('; ')}.</p><p className="mt-3"><strong>Calculated g:</strong> {(trials.reduce((sum, t) => sum + 4 * Math.PI ** 2 * t.length / t.period ** 2, 0) / trials.length).toFixed(2)} m/s². Expected: 9.81 m/s².</p><p className="mt-3">A longer string gives a longer period. Doubling length multiplies the period by about 1.41, not 2. Exact agreement is expected here because the timer uses the ideal model.</p></> : 'Longer pendulums have longer periods. Keep the release angle small and compare lengths while gravity stays constant.'}
  >
    <svg viewBox="0 0 800 470" role="group" aria-label="Pendulum bench with draggable brass bob and string length collar">
      <defs>
        <linearGradient id={`${id}-steel`}><stop stopColor="#475569"/><stop offset=".45" stopColor="#e2e8f0"/><stop offset=".7" stopColor="#94a3b8"/><stop offset="1" stopColor="#334155"/></linearGradient>
        <radialGradient id={`${id}-brass`} cx=".3" cy=".25"><stop stopColor="#fff4bb"/><stop offset=".4" stopColor="#eabb51"/><stop offset="1" stopColor="#875015"/></radialGradient>
        <linearGradient id={`${id}-bench`} x2="0" y2="1"><stop stopColor="#657184"/><stop offset="1" stopColor="#202c40"/></linearGradient>
        <filter id={`${id}-shadow`}><feDropShadow dx="2" dy="6" stdDeviation="4" floodOpacity=".4"/></filter>
      </defs>
      <text x="30" y="35" fill="#94a3b8" fontSize="12" letterSpacing="3">MECHANICS / BENCH 02</text>
      <path d="M0 402 H800 V470 H0Z" fill={`url(#${id}-bench)`}/><path d="M0 404 H800" stroke="#94a3b8"/>
      <ellipse cx="342" cy="413" rx="160" ry="14" fill="#020617" opacity=".4"/>
      <g filter={`url(#${id}-shadow)`}><rect x="206" y="385" width="260" height="19" rx="8" fill={`url(#${id}-steel)`}/><rect x="242" y="61" width="13" height="328" rx="6" fill={`url(#${id}-steel)`}/><rect x="248" y="64" width="148" height="13" rx="5" fill={`url(#${id}-steel)`}/><rect x="359" y="65" width="23" height="25" rx="5" fill="#94a3b8"/><circle cx="370" cy="86" r="5" fill="#0f172a"/></g>
      <path d={`M370 86 V${86 + pixels}`} stroke="#64748b" strokeDasharray="4 5"/>
      <g role="button" tabIndex={running || complete ? -1 : 0} aria-label={clampOpen ? 'Tighten stand clamp' : 'Loosen stand clamp'} aria-pressed={clampOpen} aria-disabled={running || complete} className="cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-300" onClick={toggleClamp} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleClamp(); } }}>
        <rect x="346" y="49" width="48" height="44" fill="transparent"/>
        <path d="M370 57 V75" stroke="#cbd5e1" strokeWidth="4"/>
        <rect x="355" y="53" width="30" height="9" rx="4" fill={clampOpen ? '#60a5fa' : '#59697c'} transform={`rotate(${clampOpen ? -30 : 0} 370 58)`}/>
      </g>
      <text x="407" y="67" fontSize="10" fill="#93c5fd">CLAMP {clampOpen ? 'LOOSE' : 'LOCKED'}</text>
      <path d={`M${370-Math.sin(20*Math.PI/180)*pixels} ${86+Math.cos(20*Math.PI/180)*pixels} A${pixels} ${pixels} 0 0 0 ${370+Math.sin(20*Math.PI/180)*pixels} ${86+Math.cos(20*Math.PI/180)*pixels}`} fill="none" stroke="#475569" strokeDasharray="5 6"/>
      <line data-pendulum-string="" x1="370" y1="86" x2={bob.x} y2={bob.y} stroke="#f1f5f9" strokeWidth="2"/>
      <rect x="526" y="79" width="43" height="303" rx="4" fill="#d8cba7" stroke="#a79974"/>
      <text x="547" y="399" fontSize="10" textAnchor="middle" fill="#d8cba7">L / m</text>
      {Array.from({ length: 37 }, (_, i) => <g key={i}><line x1="526" x2={i % 4 === 0 ? '542' : i % 2 === 0 ? '537' : '532'} y1={86+i*8} y2={86+i*8} stroke="#61543c"/>{i % 4 === 0 && <text x="544" y={89+i*8} fontSize="9" fill="#51442d">{(i*.05).toFixed(1)}</text>}</g>)}
      <path d={`M370 86 H526 M370 ${86+pixels} H526`} stroke="#93c5fd" strokeDasharray="3 5" opacity=".6"/>
      <DraggableSVG x={512} y={86 + pixels} label="String length collar; loosen clamp then drag vertically" disabled={running || complete || !clampOpen}
        constrain={(p: Point) => ({ x: 512, y: 86 + Math.max(.4, Math.min(1.8, Math.round((p.y-86)/160*20)/20))*160 })}
        onMove={p => setPreviewLength((p.y-86)/160)} onCancel={() => setPreviewLength(null)}
        onDrop={p => adjustLength((p.y - 86)/160)}>
        <path d="M0 -9 L14 0 L0 9Z" fill="#60a5fa"/><rect x="-28" y="-15" width="29" height="30" rx="6" fill="#2563eb"/><path d="M-18 -5 H-9 M-18 0 H-9 M-18 5 H-9" stroke="#dbeafe"/>
      </DraggableSVG>
      <DraggableSVG x={bob.x} y={bob.y} label="Brass pendulum bob; drag sideways and release" disabled={running || complete || clampOpen}
        constrain={constrainBob} onMove={p => setPreviewAngle(Math.atan2(p.x-370, p.y-86)*180/Math.PI)} onCancel={() => setPreviewAngle(null)} onDrop={release}>
        <circle r="28" fill="transparent"/><circle r="19" fill={`url(#${id}-brass)`} stroke="#fcd34d" filter={`url(#${id}-shadow)`}/><ellipse cx="-6" cy="-7" rx="5" ry="3" fill="#fff7d6" opacity=".65"/>
      </DraggableSVG>
      <text x="302" y="425" fill="#cbd5e1" fontSize="11">PULL ASIDE & RELEASE</text>
      <g transform="translate(600 245)"><rect width="174" height="151" rx="12" fill={`url(#${id}-steel)`}/><rect x="9" y="9" width="156" height="91" rx="7" fill="#081421"/><text x="20" y="30" fill="#94a3b8" fontSize="10">MODEL TIMER / 5 CYCLES</text><text x="20" y="66" fill="#fcd34d" fontFamily="monospace" fontSize="30">{elapsed.toFixed(2)} s</text><text x="20" y="85" fill="#6ee7b7" fontSize="10">{running ? 'TIMING' : measured ? 'READY TO RECORD' : elapsed > 0 ? 'PAUSED' : 'AWAITING RELEASE'}</text>
        <g role="button" tabIndex={complete || clampOpen ? -1 : 0} aria-label={running ? 'Pause model timer' : 'Start model timer'} aria-disabled={complete || clampOpen} onClick={toggleTimer} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleTimer(); } }} className="cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-300" opacity={complete || clampOpen ? .4 : 1}>
          <rect x="12" y="104" width="150" height="42" rx="5" fill={running ? '#844e29' : '#235b4c'} stroke="#152a30"/>
          <text x="87" y="130" textAnchor="middle" fill="#fff" fontSize="12">{running ? 'PAUSE' : measured ? 'NEW RUN' : elapsed > 0 ? 'RESUME' : 'START / RELEASE'}</text>
        </g>
      </g>
      <text x="29" y="444" fill="#cbd5e1" fontSize="12">L = {shownLength.toFixed(2)} m</text><text x="235" y="444" fill="#cbd5e1" fontSize="12">g = 9.81 m/s²</text><text x="465" y="444" fill="#cbd5e1" fontSize="12">Ideal model / real-time motion</text>
    </svg>
  </LabWorkspace></div>;
}
