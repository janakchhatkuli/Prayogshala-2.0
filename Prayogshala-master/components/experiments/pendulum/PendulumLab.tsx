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
  const [feedback, setFeedback] = useState('Drag the brass bob sideways, then release it. Drag the blue string collar vertically to adjust length.');
  const clock = useRef(0);
  const period = 2 * Math.PI * Math.sqrt(length / GRAVITY);
  const pixels = 105 + length * 105;
  const radians = angle * Math.PI / 180;
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
    setRunning(false); setLength(Math.max(0.4, Math.min(1.8, Math.round(value * 20) / 20)));
    clock.current = 0; setElapsed(0); setAngle(amplitude);
    setFeedback('Length set. Pull the bob aside and release to time five oscillations.');
  }

  function release(point: Point) {
    if (running || complete) return;
    const degrees = Math.atan2(point.x - 370, Math.max(20, point.y - 86)) * 180 / Math.PI;
    if (Math.abs(degrees) < 3 || Math.abs(degrees) > 25) {
      setFeedback('Pull the bob gently to one side (3-25 degrees). Large angles do not fit the small-angle model.');
      return;
    }
    setAmplitude(degrees); setAngle(degrees); clock.current = 0; setElapsed(0); setRunning(true);
    setFeedback('Released. The photogate is timing five full swings; watch the period change with length.');
  }

  function record() {
    if (!measured || complete || trials.some(t => t.length === length)) return;
    setTrials(previous => [...previous, { length, period: elapsed / 5, time: elapsed }]);
    setFeedback('Trial recorded. Compare at least two different lengths to complete your investigation.');
  }

  function reset() {
    setRunning(false); clock.current = 0; setElapsed(0); setLength(1); setAmplitude(12); setAngle(12); setTrials([]); setComplete(false);
    setFeedback('Bench reset. Pull the bob aside to begin a fresh investigation.');
  }

  return <div lang="en"><LabWorkspace title="Simple pendulum" subject="Physics"
    intro="Does a longer pendulum swing more slowly? Adjust the string, release the bob and time five oscillations at two different lengths. This ideal small-angle model ignores friction; the photogate records simulation time."
    equipment={['Retort stand', 'Adjustable string', 'Brass bob', 'Length scale', 'Photogate timer']}
    steps={['Set length and release bob', 'Time five oscillations', 'Record two different lengths', 'Calculate gravity']}
    currentStep={trials.length >= 2 ? 3 : running || measured ? measured ? 2 : 1 : 0}
    complete={complete} onReset={reset}
    controls={<div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">String length <strong className="float-right text-amber-300">{length.toFixed(2)} m</strong><input aria-label="String length" type="range" min="0.4" max="1.8" step="0.05" value={length} disabled={running || complete} onChange={e => adjustLength(Number(e.target.value))} className="mt-2 w-full" /></label>
        <label className="text-sm">Release angle <strong className="float-right text-amber-300">{Math.abs(amplitude).toFixed(0)} degrees</strong><input aria-label="Release angle" type="range" min="3" max="20" step="1" value={Math.abs(amplitude)} disabled={running || complete} onChange={e => { const value = Number(e.target.value); setAmplitude(value); setAngle(value); clock.current = 0; setElapsed(0); }} className="mt-2 w-full" /></label></div>
      <div className="flex flex-wrap gap-2">
        <button className="lab-button lab-button-primary" disabled={running || complete} onClick={() => release(bob)}>Release bob</button>
        <button className="lab-button" disabled={!running} onClick={() => { setRunning(false); setFeedback('Motion paused. Resume the same timed trial, or adjust the length for a fresh trial.'); }}>Pause motion</button>
        <button className="lab-button" disabled={running || elapsed === 0 || measured || complete} onClick={() => setRunning(true)}>Resume timing</button>
        <button className="lab-button" disabled={!measured || complete || trials.some(t => t.length === length)} onClick={record}>Record trial</button>
        <button className="lab-button lab-button-primary" disabled={trials.length < 2 || running || complete} onClick={() => { save('simple-pendulum'); setComplete(true); setFeedback('Two lengths compared. Your investigation is saved.'); }}>Complete investigation</button>
      </div><p role="status" className="text-sm text-blue-200">{feedback}</p>
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
      <path d={`M${370-Math.sin(25*Math.PI/180)*pixels} ${86+Math.cos(25*Math.PI/180)*pixels} Q370 ${86+pixels+22} ${370+Math.sin(25*Math.PI/180)*pixels} ${86+Math.cos(25*Math.PI/180)*pixels}`} fill="none" stroke="#475569" strokeDasharray="5 6"/>
      <line x1="370" y1="86" x2={bob.x} y2={bob.y} stroke="#f1f5f9" strokeWidth="2"/>
      <rect x="526" y="124" width="34" height="190" rx="4" fill="#d8cba7"/>
      {Array.from({ length: 15 }, (_, i) => <g key={i}><line x1="526" x2={i % 2 === 0 ? '541' : '535'} y1={128+i*12.5} y2={128+i*12.5} stroke="#61543c"/>{i % 2 === 0 && <text x="544" y={132+i*12.5} fontSize="8" fill="#51442d">{(.4+i*.1).toFixed(1)}</text>}</g>)}
      <DraggableSVG x={512} y={86 + pixels - 65} label="String length collar; drag vertically or use string length slider" disabled={running || complete} onDrop={p => adjustLength((p.y + 65 - 86 - 105)/105)}>
        <path d="M0 -9 L14 0 L0 9Z" fill="#60a5fa"/><rect x="-28" y="-15" width="29" height="30" rx="6" fill="#2563eb"/><path d="M-18 -5 H-9 M-18 0 H-9 M-18 5 H-9" stroke="#dbeafe"/>
      </DraggableSVG>
      <text x="495" y="342" fontSize="11" fill="#93c5fd">ADJUST LENGTH</text>
      <DraggableSVG x={bob.x} y={bob.y} label="Brass pendulum bob; drag sideways and release" disabled={running || complete} onDrop={release}>
        <circle r="28" fill="transparent"/><circle r="19" fill={`url(#${id}-brass)`} stroke="#fcd34d" filter={`url(#${id}-shadow)`}/><ellipse cx="-6" cy="-7" rx="5" ry="3" fill="#fff7d6" opacity=".65"/>
      </DraggableSVG>
      <text x="302" y="366" fill="#cbd5e1" fontSize="11">PULL ASIDE & RELEASE</text>
      <g transform="translate(600 265)"><rect width="159" height="109" rx="12" fill={`url(#${id}-steel)`}/><rect x="9" y="9" width="141" height="91" rx="7" fill="#081421"/><text x="22" y="30" fill="#94a3b8" fontSize="10" letterSpacing="1">PHOTOGATE / 5 SWINGS</text><text x="22" y="66" fill="#fcd34d" fontFamily="monospace" fontSize="30">{elapsed.toFixed(2)} s</text><text x="22" y="85" fill="#6ee7b7" fontSize="10">{running ? 'TIMING' : measured ? 'READY TO RECORD' : 'AWAITING RELEASE'}</text></g>
      <text x="29" y="444" fill="#cbd5e1" fontSize="12">L = {length.toFixed(2)} m</text><text x="235" y="444" fill="#cbd5e1" fontSize="12">g = 9.81 m/s²</text><text x="465" y="444" fill="#cbd5e1" fontSize="12">Ideal model / real-time motion</text>
    </svg>
  </LabWorkspace></div>;
}
