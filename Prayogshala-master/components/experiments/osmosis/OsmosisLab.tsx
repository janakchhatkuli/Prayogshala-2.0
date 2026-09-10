'use client';

import { useEffect, useId, useRef, useState } from 'react';
import LabWorkspace from '@/components/lab/LabWorkspace';
import DraggableSVG, { type Point } from '@/components/lab/DraggableSVG';
import { useStore } from '@/lib/store';

const INTERNAL = 0.3;
const INITIAL_MASS = 10;
const DURATION = 60;
const TIME_SCALE = 3; // One real second represents three model minutes.
type Phase = 'ready' | 'running' | 'finished';
type Trial = { concentration: number; mass: number; change: number };

export default function OsmosisLab() {
  const uid = useId().replace(/:/g, '');
  const id = (name: string) => `${uid}-${name}`;
  const paint = (name: string) => `url(#${id(name)})`;
  const completeExperiment = useStore(s => s.completeExperiment);
  const [concentration, setConcentration] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [phase, setPhase] = useState<Phase>('ready');
  const [elapsed, setElapsed] = useState(0);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [complete, setComplete] = useState(false);
  const [feedback, setFeedback] = useState('Set the bath concentration, then place the fresh potato sample into the beaker.');
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const gradient = INTERNAL - concentration;
  const isotonic = Math.abs(gradient) < 0.001;
  const condition = isotonic ? 'Isotonic' : gradient > 0 ? 'Hypotonic' : 'Hypertonic';
  // Fixed-bath teaching model: bounded exponential response, not measured potato kinetics.
  const change = 60 * gradient * (1 - Math.exp(-elapsed / 18));
  const mass = INITIAL_MASS * (1 + change / 100);
  const size = Math.cbrt(mass / INITIAL_MASS);
  const alreadyRecorded = trials.some(trial => trial.concentration === concentration);
  const canRecord = phase === 'finished' && !alreadyRecorded && !complete;
  const waterDirection = isotonic ? 'Equal movement both ways; no net flow' : gradient > 0 ? 'Net water movement into potato' : 'Net water movement out of potato';

  useEffect(() => {
    if (phase !== 'running') return;
    const start = performance.now();
    const handle = setInterval(() => {
      const minutes = Math.min(DURATION, (performance.now() - start) / 1000 * TIME_SCALE);
      setElapsed(minutes);
      if (minutes >= DURATION) {
        clearInterval(handle);
        timer.current = null;
        setPhase('finished');
        setFeedback('60 model minutes reached. Blotted mass is ready to record; then compare another bath.');
      }
    }, 100);
    timer.current = handle;
    return () => { clearInterval(handle); if (timer.current === handle) timer.current = null; };
  }, [phase]);

  function freshTrial(nextConcentration = concentration) {
    if (timer.current !== null) clearInterval(timer.current);
    timer.current = null;
    setPhase('ready'); setElapsed(0); setLoaded(false); setConcentration(nextConcentration);
    setFeedback('Fresh 10.00 g sample prepared. Place it into the bath and start a new trial.');
  }

  function reset() {
    freshTrial(0);
    setTrials([]); setComplete(false);
    setFeedback('Bench and notebook reset. Begin with a fresh sample.');
  }

  function place(point: Point) {
    if (phase !== 'ready') return;
    if (point.x >= 202 && point.x <= 384 && point.y >= 162 && point.y <= 303) {
      setLoaded(true);
      setFeedback('Potato sample immersed. Start the timer to model water exchange.');
    } else {
      setLoaded(false);
      setFeedback('Sample missed the liquid. Drop its center inside the dashed bath target, or use Place sample in bath.');
    }
  }

  function start() {
    if (!loaded || phase !== 'ready' || complete) return;
    setElapsed(0); setPhase('running');
    setFeedback('Trial running: 1 real second = 3 model minutes. Bath concentration is locked until the trial ends.');
  }

  function record() {
    if (!canRecord) return;
    setTrials(previous => [...previous, { concentration, mass, change }]);
    setFeedback('Final mass recorded. Choose a different concentration and use a fresh sample for comparison.');
  }

  function finish() {
    if (trials.length < 2 || phase === 'running' || complete) return;
    completeExperiment('osmosis');
    setComplete(true);
    setFeedback('Two distinct bath concentrations compared. Your osmosis experiment has been saved.');
  }

  return (
    <LabWorkspace title="Osmosis in potato tissue" subject="Biology"
      intro="How does sucrose concentration change potato mass? Immerse equal fresh samples, run a 60-minute model and compare at least two different baths. Water crosses cell membranes in response to differences in water potential."
      equipment={['10.00 g potato samples', 'Sucrose bath: 0.00-0.60 M', 'Model timer', 'Virtual blotting and balance']}
      steps={['Set bath and immerse sample', 'Run the 60-minute model', 'Record two distinct baths', 'Complete the comparison']}
      currentStep={trials.length >= 2 ? 3 : !loaded ? 0 : phase !== 'finished' ? 1 : 2}
      complete={complete} onReset={reset}
      controls={<div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
          <label className="space-y-2 text-sm"><span className="block">External sucrose concentration <strong className="text-cyan-300">{concentration.toFixed(2)} M</strong></span>
            <input type="range" min="0" max="0.6" step="0.05" value={concentration} disabled={phase === 'running' || complete}
              onChange={e => freshTrial(Number(e.target.value))} className="w-full accent-cyan-300 disabled:opacity-40" />
            <span className="flex justify-between text-xs text-slate-400"><span>0.00 M / pure water</span><span>0.60 M</span></span>
          </label>
          <div className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm"><p>Internal equivalent: <strong className="text-amber-200">0.30 M</strong></p>
            <p className="mt-1 text-xs text-slate-400">Same sample size, temperature and duration in every trial. Changing the bath prepares a fresh sample.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Bath concentration presets">
          {[0, 0.3, 0.6].map(value => <button key={value} className="lab-button min-h-11 disabled:opacity-40" disabled={phase === 'running' || complete}
            onClick={() => freshTrial(value)}>{value.toFixed(2)} M {value === 0 ? 'hypotonic' : value === 0.3 ? 'isotonic' : 'hypertonic'}</button>)}
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="lab-button min-h-11 disabled:opacity-40" disabled={loaded || phase !== 'ready' || complete} onClick={() => place({ x: 292, y: 233 })}>Place sample in bath</button>
          <button className="lab-button min-h-11 disabled:opacity-40" disabled={!loaded || phase !== 'ready' || complete} onClick={start}>Start 60-minute trial</button>
          <button className="lab-button min-h-11 disabled:opacity-40" disabled={complete} onClick={() => freshTrial()}>{phase === 'running' ? 'Cancel trial / fresh sample' : 'Fresh sample / retry bath'}</button>
        </div>
        <div className="space-y-2"><div className="flex justify-between text-xs text-slate-300"><span>{phase === 'running' ? 'Model advancing' : phase === 'finished' ? 'Trial finished' : 'Timer ready'}</span><span>{elapsed.toFixed(1)} / 60.0 model min</span></div>
          <progress aria-label="Model trial progress" max={DURATION} value={elapsed} className="h-2 w-full accent-emerald-400" />
        </div>
        <p role="status" className="rounded-lg bg-slate-950 p-3 text-sm text-emerald-200">{feedback}</p>
        <p className="text-xs leading-relaxed text-slate-400">Illustrative, time-compressed model: 20 real seconds = 60 model minutes. Mass change (%) = 60 x (0.30 - bath M) x (1 - exp(-minutes / 18)). The bath and internal reference are held fixed; the response approaches a bounded plateau. This is not a calibrated prediction of real potato mass. Surface water is excluded from the modeled blotted mass.</p>
      </div>}
      observations={<div className="space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-2"><div className="rounded-lg bg-slate-950 p-3"><p className="text-xs text-slate-400">Modeled mass</p><p className="mt-1 font-mono text-xl text-amber-200">{mass.toFixed(2)} g</p></div>
          <div className="rounded-lg bg-slate-950 p-3"><p className="text-xs text-slate-400">Mass change</p><p className="mt-1 font-mono text-xl text-cyan-200">{change > 0 ? '+' : ''}{change.toFixed(2)}%</p></div></div>
        <p className="text-xs text-slate-400">{phase === 'finished' ? 'Final modeled blotted mass, ready for your notebook.' : 'Live model readout, not a recorded final result.'}</p>
        <div className="overflow-x-auto"><table className="w-full text-left text-xs">
          <caption className="mb-2 text-left text-slate-300">Matched 60-minute trials ({trials.length} / 2 baths)</caption>
          <thead className="border-b border-slate-600 text-slate-400"><tr><th scope="col" className="py-2 pr-2">Bath M</th><th scope="col" className="pr-2">Final g</th><th scope="col">Change</th></tr></thead>
          <tbody>{trials.map(trial => <tr key={trial.concentration} className="border-b border-slate-800"><th scope="row" className="py-3 font-normal">{trial.concentration.toFixed(2)}</th><td>{trial.mass.toFixed(2)}</td><td className={trial.change < 0 ? 'text-rose-300' : 'text-emerald-300'}>{trial.change > 0 ? '+' : ''}{trial.change.toFixed(2)}%</td></tr>)}</tbody>
        </table></div>
        {trials.length === 0 && <p className="text-xs text-slate-400">No observations yet. Every sample starts at 10.00 g.</p>}
        <button className="lab-button min-h-11 w-full disabled:opacity-40" disabled={!canRecord} onClick={record}>{alreadyRecorded ? 'Bath already recorded' : 'Record final mass'}</button>
        <p className="text-xs text-slate-400">Finish the timer before recording. Repeat baths do not count as a comparison.</p>
        <button className="lab-button min-h-11 w-full disabled:opacity-40" disabled={trials.length < 2 || phase === 'running' || complete} onClick={finish}>{complete ? 'Comparison saved' : 'Complete comparison'}</button>
        {trials.length >= 2 && <p className="text-xs leading-relaxed text-emerald-200">Across your trials, the lower-concentration bath gives a greater final mass. Compare baths on either side of 0.30 M to see the direction reverse.</p>}
      </div>}
      conclusion={<div className="space-y-2"><p><strong>Below 0.30 M:</strong> hypotonic bath; net water enters, mass rises and tissue becomes more turgid.</p>
        <p><strong>At 0.30 M:</strong> isotonic reference; water exchanges in both directions with no net mass change.</p>
        <p><strong>Above 0.30 M:</strong> hypertonic bath; net water leaves, mass falls and tissue becomes flaccid.</p>
        <p className="text-xs text-slate-400">Sucrose is treated as non-penetrating. Real tissue also involves pressure potential, varying cell solutes and experimental uncertainty.</p></div>}
    >
      <div className="grid bg-[#0b1820] md:grid-cols-[1.2fr_1fr]">
        <svg viewBox="0 0 440 420" className="w-full self-center" role="group" aria-label={`Osmosis bench: ${concentration.toFixed(2)} molar bath, ${loaded ? 'sample immersed' : 'sample on tray'}`}>
          <defs>
            <linearGradient id={id('glass')} x1="0" x2="1"><stop stopColor="#a5f3fc" stopOpacity=".24" /><stop offset=".22" stopColor="#e0f2fe" stopOpacity=".04" /><stop offset=".8" stopColor="#e0f2fe" stopOpacity=".08" /><stop offset="1" stopColor="#67e8f9" stopOpacity=".3" /></linearGradient>
            <linearGradient id={id('water')} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#22d3ee" stopOpacity=".18" /><stop offset="1" stopColor="#0891b2" stopOpacity=".55" /></linearGradient>
            <linearGradient id={id('potato')} x1="0" x2="1"><stop stopColor="#a97936" /><stop offset=".18" stopColor="#efd18b" /><stop offset=".6" stopColor="#f5dfa7" /><stop offset="1" stopColor="#bc8a44" /></linearGradient>
            <linearGradient id={id('balance')} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#64748b" /><stop offset="1" stopColor="#1e293b" /></linearGradient>
            <filter id={id('shadow')} x="-40%" y="-30%" width="180%" height="180%"><feDropShadow dx="3" dy="7" stdDeviation="5" floodOpacity=".45" /></filter>
            <clipPath id={id('bath')}><path d="M199 160H387V299Q387 316 367 316H219Q199 316 199 299Z" /></clipPath>
          </defs>
          <text x="20" y="29" fill="#94a3b8" fontSize="12" letterSpacing="2">01 / IMMERSION BENCH</text>
          <path d="M0 329H440V420H0Z" fill="#1d3036" /><path d="M0 329H440" stroke="#45616a" />
          <ellipse cx="294" cy="331" rx="111" ry="13" fill="#020617" opacity=".6" />
          <g filter={paint('shadow')}>
            <path d="M190 104L199 121V299Q199 321 219 321H367Q389 321 389 299V120L402 105" fill={paint('glass')} stroke="#a5d8df" strokeWidth="2" />
            <path d="M199 161H389V299Q389 317 367 317H219Q199 317 199 299Z" fill={paint('water')} />
            <ellipse cx="294" cy="161" rx="94" ry="9" fill="#67e8f9" fillOpacity=".2" stroke="#67e8f9" strokeOpacity=".65" />
            <path d="M210 126V290Q210 308 223 308" fill="none" stroke="#cffafe" strokeWidth="4" opacity=".3" />
            <path d="M379 132V297" stroke="#cffafe" strokeWidth="2" opacity=".25" />
          </g>
          {[180, 210, 240, 270, 300].map((y, i) => <g key={y}><path d={`M362 ${y}H384`} stroke="#a5d8df" /><text x="356" y={y + 4} textAnchor="end" fontSize="9" fill="#a5d8df">{250 - i * 50}</text></g>)}
          <text x="369" y="144" fill="#a5d8df" fontSize="10">mL</text>
          <g clipPath={paint('bath')}>
            {Array.from({ length: Math.round(concentration * 65) }, (_, index) => <g key={index} transform={`translate(${212 + (index * 43) % 162} ${179 + (index * 37) % 125})`} opacity=".55">
              <path d="M-3 -2L0 -4L3 -2V2L0 4L-3 2Z" fill="#c4b5fd" stroke="#ddd6fe" strokeWidth=".6" />
            </g>)}
            {loaded && <g transform={`translate(290 247) scale(${size})`} filter={paint('shadow')}>
              <path d="M-29 -48H29V43Q0 56 -29 43Z" fill={paint('potato')} stroke="#ddb56b" />
              <ellipse cy="-48" rx="29" ry="9" fill="#f9e7b7" stroke="#ddb56b" />
              {Array.from({ length: 20 }, (_, i) => <path key={i} d={`M${-20 + i % 5 * 10} ${-34 + Math.floor(i / 5) * 20}l3 5l-2 5`} stroke="#b89759" strokeWidth=".7" fill="none" opacity=".55" />)}
              <path d="M-18 -35V36" stroke="#fff2cc" opacity=".4" strokeWidth="3" />
            </g>}
            {loaded && phase !== 'ready' && [-1, 1].map(side => <g key={side}>
              {[0, 1, 2].map(index => {
                const progress = (elapsed / 3 + index / 3) % 1;
                const toward = isotonic ? (index % 2 === 0) : gradient > 0;
                const distance = toward ? 75 - progress * 38 : 37 + progress * 38;
                return <circle key={index} cx={290 + side * distance} cy={218 + index * 25} r="3.5" fill="#a5f3fc" opacity={phase === 'running' ? .9 : .4} />;
              })}
            </g>)}
          </g>
          {!loaded && <rect x="202" y="162" width="182" height="141" rx="12" fill="none" stroke="#6ee7b7" strokeDasharray="6 5" />}
          <text x="293" y="78" textAnchor="middle" fill="#67e8f9" fontSize="17">{concentration.toFixed(2)} M sucrose</text>
          <text x="293" y="96" textAnchor="middle" fill="#94a3b8" fontSize="11">{condition} relative to tissue</text>
          <rect x="22" y="260" width="133" height="58" rx="9" fill={paint('balance')} stroke="#64748b" filter={paint('shadow')} />
          <ellipse cx="88" cy="256" rx="62" ry="10" fill="#94a3b8" stroke="#cbd5e1" />
          <rect x="36" y="277" width="88" height="26" rx="4" fill="#0b251f" stroke="#41645a" />
          <text x="80" y="296" textAnchor="middle" fill="#a7f3d0" fontFamily="monospace" fontSize="16">10.00 g</text>
          <circle cx="139" cy="290" r="5" fill="#34d399" />
          <text x="88" y="342" textAnchor="middle" fill="#94a3b8" fontSize="10">INITIAL BLOTTED MASS</text>
          {!loaded && <DraggableSVG x={88} y={199} label="Fresh 10 gram potato sample. Drag into the liquid or use Place sample in bath." disabled={phase !== 'ready' || complete} onDrop={place}>
            <g filter={paint('shadow')}><path d="M-23 -38H23V37Q0 47 -23 37Z" fill={paint('potato')} stroke="#ddb56b" />
              <ellipse cy="-38" rx="23" ry="8" fill="#f9e7b7" stroke="#ddb56b" />
              {Array.from({ length: 12 }, (_, i) => <path key={i} d={`M${-15 + i % 4 * 9} ${-22 + Math.floor(i / 4) * 22}l2 9`} stroke="#b89759" strokeWidth="1" opacity=".6" />)}
            </g>
          </DraggableSVG>}
          <text x="88" y="130" textAnchor="middle" fill="#fde68a" fontSize="12">{loaded ? 'Sample in bath' : 'DRAG FRESH SAMPLE'}</text>
          <rect x="203" y="349" width="184" height="48" rx="7" fill="#020617" stroke="#475569" />
          <text x="219" y="366" fill="#94a3b8" fontSize="9">MODEL TIME / MINUTES</text>
          <text x="219" y="388" fill="#6ee7b7" fontSize="22" fontFamily="monospace">{elapsed.toFixed(1).padStart(4, '0')} / 60</text>
          <text x="22" y="391" fill="#94a3b8" fontSize="10">20 seconds in real time</text>
        </svg>
        <div className="border-t border-slate-700 p-4 md:border-l md:border-t-0">
          <p className="text-xs tracking-widest text-slate-400">02 / INSIDE THE TISSUE</p>
          <svg viewBox="0 0 340 280" className="mx-auto w-full max-w-[440px]" role="img" aria-label={`${waterDirection}. ${condition} bath. Cell schematic with rigid wall and changing protoplast.`}>
            <defs>
              <linearGradient id={id('cell')} x1="0" x2="1" y1="0" y2="1"><stop stopColor="#d9f99d" /><stop offset="1" stopColor="#65a30d" /></linearGradient>
              <marker id={id('arrow')} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#67e8f9" /></marker>
            </defs>
            <rect x="60" y="44" width="220" height="185" rx="23" fill="#365314" stroke="#a3b859" strokeWidth="6" />
            <rect x="68" y="52" width="204" height="169" rx="18" fill="#e2e8f0" fillOpacity=".15" />
            <g transform={`translate(170 136) scale(${loaded ? 0.88 + change / 160 : .88})`}>
              <path d="M-101 -69Q-104 -87 -82 -87H83Q101 -85 101 -66V66Q99 88 80 88H-81Q-102 87 -101 66Z" fill={paint('cell')} stroke="#ecfccb" strokeWidth="2" />
              <rect x="-75" y="-64" width="143" height="130" rx="25" fill="#d9f99d" stroke="#84cc16" strokeWidth="2" />
              <ellipse cx="80" cy="-12" rx="13" ry="19" fill="#7c3aed" /><ellipse cx="82" cy="-15" rx="5" ry="7" fill="#4c1d95" />
              <text x="-5" y="4" textAnchor="middle" fill="#365314" fontSize="15">Vacuole</text>
              <text x="-5" y="25" textAnchor="middle" fill="#4d7c0f" fontSize="11">water storage</text>
            </g>
            {[-1, 1].map(side => <g key={side} opacity={loaded ? 1 : .3}>
              <path d={gradient >= 0 ? `M${170 + side * 156} 115H${170 + side * 102}` : `M${170 + side * 102} 115H${170 + side * 156}`}
                stroke="#67e8f9" strokeWidth={isotonic ? 2 : 2 + Math.abs(gradient) * 10} markerEnd={paint('arrow')} />
              <path d={gradient >= 0 ? `M${170 + side * 102} 162H${170 + side * 156}` : `M${170 + side * 156} 162H${170 + side * 102}`}
                stroke="#67e8f9" strokeWidth="2" opacity={isotonic ? 1 : .4} markerEnd={paint('arrow')} />
            </g>)}
            <path d="M78 46L59 22H19" fill="none" stroke="#bef264" /><text x="19" y="16" fill="#bef264" fontSize="11">Rigid cell wall</text>
            <path d="M236 208L269 254H331" fill="none" stroke="#ecfccb" /><text x="211" y="270" fill="#ecfccb" fontSize="11">Cell membrane</text>
          </svg>
          <p className="text-center text-sm font-semibold text-cyan-200">{waterDirection}</p>
          <p className="mt-2 text-center text-xs leading-relaxed text-slate-400">Arrows show exchange, with the thicker arrow indicating net movement. Cell and sample size changes are illustrative. Membrane shrinkage is exaggerated; the rigid wall stays fixed.</p>
          <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950 p-3">
            <div className="flex justify-between text-xs text-slate-400"><span>Mass trajectory</span><span>8-12 g</span></div>
            <svg viewBox="0 0 300 95" className="w-full" role="img" aria-label={`Live mass curve: ${mass.toFixed(2)} grams after ${elapsed.toFixed(1)} model minutes`}>
              <path d="M22 8V73H288M22 40H288" fill="none" stroke="#475569" strokeDasharray="3 3" />
              <text x="0" y="43" fill="#94a3b8" fontSize="9">10</text>
              <polyline points={Array.from({ length: 61 }, (_, i) => {
                const t = elapsed * i / 60;
                const m = INITIAL_MASS * (1 + .6 * gradient * (1 - Math.exp(-t / 18)));
                return `${22 + t / 60 * 266},${40 - (m - 10) * 16}`;
              }).join(' ')} fill="none" stroke="#6ee7b7" strokeWidth="2.5" />
              <circle cx={22 + elapsed / 60 * 266} cy={40 - (mass - 10) * 16} r="3" fill="#fde68a" />
              <text x="22" y="90" fill="#94a3b8" fontSize="9">0 min</text><text x="255" y="90" fill="#94a3b8" fontSize="9">60 min</text>
            </svg>
          </div>
        </div>
      </div>
    </LabWorkspace>
  );
}
