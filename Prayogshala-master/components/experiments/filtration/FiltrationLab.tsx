'use client';

import { useEffect, useId, useRef, useState } from 'react';
import LabWorkspace from '@/components/lab/LabWorkspace';
import type { DemoStep } from '@/components/lab/useDemoRunner';
import DraggableSVG, { type Point } from '@/components/lab/DraggableSVG';
import { useStore } from '@/lib/store';

const INITIAL_VOLUME = 100;
const FUNNEL = { x: 520, y: 195 };
const POUR = { x: 395, y: 165 };
const near = (point: Point, target: Point) => Math.hypot(point.x - target.x, point.y - target.y) < 65;
const buttonClass = 'rounded-xl border border-slate-600 px-4 py-3 text-sm text-slate-100 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-blue-300 disabled:cursor-not-allowed disabled:opacity-40';

export default function FiltrationLab() {
  const completeExperiment = useStore(s => s.completeExperiment);
  const id = useId().replace(/:/g, '');
  const [funnelPlaced, setFunnelPlaced] = useState(false);
  const [paperPlaced, setPaperPlaced] = useState(false);
  const [beakerPlaced, setBeakerPlaced] = useState(false);
  const [pouring, setPouring] = useState(false);
  const [volumes, setVolumes] = useState({ source: INITIAL_VOLUME, paper: 0, filtrate: 0 });
  const [status, setStatus] = useState('Place the glass funnel over the receiving flask.');
  const [run, setRun] = useState(0);
  const recorded = useRef(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const assembled = funnelPlaced && paperPlaced && beakerPlaced;
  const complete = volumes.filtrate === INITIAL_VOLUME;
  const draining = volumes.paper > 0;
  const sediment = INITIAL_VOLUME - volumes.source;
  const step = !funnelPlaced ? 0 : !paperPlaced ? 1 : !beakerPlaced ? 2 : 3;

  function reset() {
    if (timer.current) clearInterval(timer.current);
    setPouring(false);
    setFunnelPlaced(false); setPaperPlaced(false); setBeakerPlaced(false);
    setVolumes({ source: INITIAL_VOLUME, paper: 0, filtrate: 0 });
    recorded.current = false;
    setRun(n => n + 1);
    setStatus('Bench cleaned: fresh filter paper and 100 mL of muddy water. Place the funnel first.');
  }

  function place(item: 'funnel' | 'paper' | 'beaker', point?: Point) {
    if (pouring || draining || complete) return;
    const target = item === 'beaker' ? POUR : FUNNEL;
    if (point && !near(point, target)) {
      setStatus(`Move the ${item} to its dashed target, or use the labeled placement control below.`);
      return;
    }
    if (item === 'funnel' && !funnelPlaced) {
      setFunnelPlaced(true);
      setStatus('Funnel secured over the flask. Fit folded filter paper inside it.');
    } else if (item === 'paper' && funnelPlaced && !paperPlaced) {
      setPaperPlaced(true);
      setStatus('Filter paper fitted. Move the muddy-water beaker above the funnel.');
    } else if (item === 'beaker' && funnelPlaced && paperPlaced && !beakerPlaced) {
      setBeakerPlaced(true);
      setStatus('Assembly ready. Start pouring slowly and watch the paper retain the sediment.');
    } else {
      setStatus('Assemble in order: funnel over flask, paper inside funnel, then beaker above paper.');
    }
  }

  // Keep all three volumes in one update: no liquid is created or lost.
  useEffect(() => {
    if (!assembled || complete || (!pouring && !draining)) return;
    timer.current = setInterval(() => {
      setVolumes(previous => {
        const incoming = pouring ? Math.min(2, previous.source, 20 - previous.paper) : 0;
        const outgoing = Math.min(1, previous.paper + incoming);
        return {
          source: previous.source - incoming,
          paper: previous.paper + incoming - outgoing,
          filtrate: previous.filtrate + outgoing,
        };
      });
    }, 200);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [assembled, complete, pouring, draining]);

  useEffect(() => {
    if (volumes.source === 0) setPouring(false);
    if (!complete || recorded.current) return;
    recorded.current = true;
    completeExperiment('filtration', 100);
    setStatus('Filtration complete and recorded: 100 mL of clear filtrate collected; insoluble sediment remains in the paper.');
  }, [volumes.source, complete, completeExperiment]);

  const flowStatus = complete ? status : pouring
    ? 'Pouring slowly. Brown particles stay in the paper while clear water drains into the flask.'
    : draining ? 'Pouring stopped. Water already in the filter continues draining.' : status;

  const filtrateRef = useRef(volumes.filtrate); filtrateRef.current = volumes.filtrate;
  const demo: DemoStep[] = [
    // Demo runs never earn completion credit.
    { caption: 'Place the glass funnel over the receiving flask.', run: () => { recorded.current = true; setFunnelPlaced(true); } },
    { caption: 'Fold the filter paper into a cone and seat it in the funnel.', run: () => setPaperPlaced(true) },
    { caption: 'Bring the beaker of muddy water to the pouring position.', run: () => setBeakerPlaced(true) },
    { caption: 'Pour slowly. Mud stays on the paper; clear water passes into the flask.', run: () => setPouring(true), until: () => filtrateRef.current >= 50, wait: 400 },
    { caption: 'Half collected. The residue is the insoluble solid; the filtrate is clear water.', until: () => filtrateRef.current >= 100, wait: 1800 },
    { caption: 'All 100 mL filtered. Dissolved salts would still be in the filtrate: filtration removes only insoluble solids.', wait: 2000 },
  ];

  return (
    <div lang="en">
      <LabWorkspace
        experimentId="filtration"
        demo={demo}
        title="Filtration: Separate Muddy Water"
        subject="Chemistry"
        intro="Can filter paper separate an insoluble solid from water? Assemble the apparatus, pour a suspension slowly, and compare the residue with the filtrate. This experiment panel is in English."
        equipment={['100 mL muddy water', 'Glass funnel', 'Folded filter paper', 'Receiving flask', 'Funnel stand']}
        steps={['Place funnel over flask', 'Fit filter paper', 'Position muddy-water beaker', 'Pour and collect filtrate']}
        currentStep={step}
        complete={complete}
        onReset={reset}
        controls={<div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-300">English panel / Keyboard placement</p>
          <div className="flex flex-wrap gap-2">
            <button className={buttonClass} disabled={funnelPlaced} onClick={() => place('funnel')}>1. Place funnel over flask</button>
            <button className={buttonClass} disabled={!funnelPlaced || paperPlaced} onClick={() => place('paper')}>2. Fit filter paper in funnel</button>
            <button className={buttonClass} disabled={!paperPlaced || beakerPlaced} onClick={() => place('beaker')}>3. Position beaker for pouring</button>
            <button className={buttonClass} disabled={!assembled || volumes.source === 0 || complete}
              aria-pressed={pouring} onClick={() => {
                if (!assembled || volumes.source === 0 || complete) return;
                if (timer.current) clearInterval(timer.current);
                setPouring(p => !p);
                setStatus(pouring ? 'Pouring paused. Resume to filter the remaining suspension.' : 'Pouring started.');
              }}>{pouring ? 'Pause pouring' : sediment > 0 ? 'Resume pouring' : 'Start pouring'}</button>
            <button className={buttonClass} onClick={reset}>Clean up and restart</button>
          </div>
          <p role="status" className="rounded-lg bg-slate-800 p-3 text-sm text-blue-100">{flowStatus}</p>
          <p className="text-xs text-slate-400">Pouring is locked until the apparatus is assembled. Pausing stops the beaker, not gravity drainage. A full run takes about 20 seconds.</p>
        </div>}
        observations={<div className="space-y-4 text-sm">
          <dl className="space-y-2 font-mono">
            <div className="flex justify-between gap-2"><dt>In beaker</dt><dd>{volumes.source} mL</dd></div>
            <div className="flex justify-between gap-2"><dt>In filter</dt><dd>{volumes.paper} mL</dd></div>
            <div className="flex justify-between gap-2 text-cyan-300"><dt>Clear filtrate</dt><dd>{volumes.filtrate} mL</dd></div>
          </dl>
          <progress aria-label="Volume filtered" value={volumes.filtrate} max={INITIAL_VOLUME} className="h-2 w-full accent-cyan-400" />
          <p className="text-slate-300"><strong>Observation:</strong> {sediment === 0 ? 'The suspension is cloudy; the flask and paper are empty.' : 'Brown sediment accumulates in the paper. The collected liquid is visibly clearer than the original suspension.'}</p>
          <p className="text-slate-400">The model conserves 100 mL of liquid and ignores water retained by wet paper. Insoluble particles are larger than the paper pores.</p>
        </div>}
        conclusion={<div className="space-y-3">
          <p><strong>{complete ? 'Actual result:' : 'Expected result:'}</strong> {complete ? '100 mL of clear filtrate collected after real flow through the paper.' : 'Water will pass through the filter into the flask; insoluble sediment will remain as residue.'}</p>
          <p><strong>Conclusion:</strong> Filtration separates an insoluble solid from a liquid by particle size. It does not remove dissolved salts or reliably remove microbes.</p>
          <p className="font-semibold text-amber-200">Clear does not mean safe to drink. Never drink the filtrate.</p>
        </div>}
      >
        <svg viewBox="0 0 800 500" className="block h-auto w-full" aria-label="Filtration bench with movable funnel, paper and beaker" key={run}>
          <defs>
            <linearGradient id={`${id}-glass`} x1="0" x2="1">
              <stop offset="0" stopColor="#d5f3ff" stopOpacity=".45" /><stop offset=".25" stopColor="#b5e5ff" stopOpacity=".08" />
              <stop offset=".8" stopColor="#8bbadd" stopOpacity=".12" /><stop offset="1" stopColor="#ddf6ff" stopOpacity=".4" />
            </linearGradient>
            <linearGradient id={`${id}-water`} x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="#a5efff" stopOpacity=".6" /><stop offset="1" stopColor="#38bdf8" stopOpacity=".35" />
            </linearGradient>
            <clipPath id={`${id}-flask`}><path d="M501 280 H539 V319 L592 422 Q595 430 583 430 H457 Q445 430 448 422 L501 319 Z" /></clipPath>
            <clipPath id={`${id}-beaker`}><path d="M-48 -85 H48 V0 Q48 8 40 8 H-40 Q-48 8 -48 0 Z" /></clipPath>
          </defs>
          <rect width="800" height="500" fill="#0c1829" />
          {[80, 160, 240, 320, 400].map(y => <line key={y} x1="0" x2="800" y1={y} y2={y} stroke="#1a2c40" />)}
          <rect y="432" width="800" height="68" fill="#263548" /><rect y="430" width="800" height="5" fill="#516276" />
          <text x="30" y="38" fill="#94a3b8" fontSize="12" letterSpacing="3">SEPARATION / INSOLUBLE SOLIDS</text>
          <text x="30" y="61" fill="#dbeafe" fontSize="14">Drag to the targets, or use the controls below.</text>
          <ellipse cx="520" cy="435" rx="92" ry="9" fill="#020617" opacity=".5" />
          <rect x="628" y="132" width="9" height="298" rx="4" fill="#77879a" />
          <rect x="604" y="420" width="64" height="12" rx="4" fill="#475569" />
          <path d="M631 230 H540" stroke="#8495a8" strokeWidth="7" /><ellipse cx="520" cy="230" rx="28" ry="8" fill="none" stroke="#8495a8" strokeWidth="5" />

          <rect x="444" y={430 - volumes.filtrate * .85} width="152" height={volumes.filtrate * .85} fill={`url(#${id}-water)`} clipPath={`url(#${id}-flask)`} />
          <path d="M501 280 H539 V319 L592 422 Q595 430 583 430 H457 Q445 430 448 422 L501 319 Z" fill={`url(#${id}-glass)`} stroke="#a4c7df" strokeWidth="2" />
          <ellipse cx="520" cy="280" rx="20" ry="5" fill="#0c1829" stroke="#a4c7df" strokeWidth="2" />
          <path d="M505 294 V323 L459 413" fill="none" stroke="white" strokeOpacity=".4" strokeWidth="4" />
          <text x="520" y="409" textAnchor="middle" fill="#dbf7ff" fontSize="14">{volumes.filtrate} mL</text>
          <text x="520" y="468" textAnchor="middle" fill="#a5f3fc" fontSize="14">Clear filtrate</text>

          {!funnelPlaced && <path d="M460 195 H580 L526 248 V276 H514 V248 Z" fill="#60a5fa11" stroke="#60a5fa" strokeDasharray="6 5" strokeWidth="2" />}
          {funnelPlaced && !paperPlaced && <path d="M468 198 H572 L520 240 Z" fill="none" stroke="#fef3c7" strokeWidth="3" strokeDasharray="5 5" />}
          {paperPlaced && !beakerPlaced && <g><rect x="332" y="72" width="125" height="110" rx="15" fill="#60a5fa11" stroke="#60a5fa" strokeDasharray="6 5" /><text x="394" y="66" textAnchor="middle" fill="#93c5fd" fontSize="12">Beaker here</text></g>}

          <DraggableSVG x={funnelPlaced ? FUNNEL.x : 295} y={funnelPlaced ? FUNNEL.y : 350}
            label="Glass funnel: place over receiving flask" disabled={funnelPlaced} onDrop={point => place('funnel', point)}>
            <path d="M-60 0 H60 L6 53 V80 H-6 V53 Z" fill={`url(#${id}-glass)`} stroke="#a4c7df" strokeWidth="2" />
            <ellipse cy="0" rx="60" ry="8" fill="#bdeaff" fillOpacity=".12" stroke="#a4c7df" strokeWidth="2" />
            {!funnelPlaced && <text y="105" textAnchor="middle" fill="#cbd5e1" fontSize="14">Glass funnel</text>}
          </DraggableSVG>
          <DraggableSVG x={paperPlaced ? FUNNEL.x : 700} y={paperPlaced ? FUNNEL.y : 358}
            label="Folded filter paper: fit inside the placed funnel" disabled={!funnelPlaced || paperPlaced} onDrop={point => place('paper', point)}>
            <path d="M-52 2 Q0 13 52 2 L0 46 Z" fill={sediment > 0 ? '#c9bba0' : '#f4eddc'} stroke="#d5cbb4" strokeWidth="2" />
            <path d="M0 9 V43" stroke="#aca18b" strokeWidth="1" />
            {paperPlaced && <>
              {volumes.paper > 0 && <path d={`M${-volumes.paper * 1.7} ${44 - volumes.paper * 1.3} Q0 ${48 - volumes.paper * 1.3} ${volumes.paper * 1.7} ${44 - volumes.paper * 1.3} L0 44 Z`} fill="#96734b" opacity=".8" />}
              {Array.from({ length: Math.ceil(sediment / 5) }, (_, i) => <circle key={i} cx={(i % 5 - 2) * (4 + Math.floor(i / 5) * 2)} cy={37 - Math.floor(i / 5) * 7} r="2.5" fill="#68482e" />)}
            </>}
            {!paperPlaced && <text y="69" textAnchor="middle" fill="#fef3c7" fontSize="14">Filter paper</text>}
          </DraggableSVG>

          {draining && <path d="M520 274 V334" stroke="#a5f3fc" strokeWidth="3" strokeDasharray="4 10"><animate attributeName="stroke-dashoffset" from="14" to="0" dur=".5s" repeatCount="indefinite" /></path>}
          {pouring && volumes.source > 0 && <path d="M493 131 Q520 150 520 204" fill="none" stroke="#a88b5c" strokeWidth="5" strokeDasharray="8 3"><animate attributeName="stroke-dashoffset" from="11" to="0" dur=".3s" repeatCount="indefinite" /></path>}
          <DraggableSVG x={beakerPlaced ? POUR.x : 145} y={beakerPlaced ? POUR.y : 420}
            label="Muddy-water beaker: position above the assembled filter" disabled={!paperPlaced || beakerPlaced} onDrop={point => place('beaker', point)}>
            <g transform={beakerPlaced ? 'rotate(35)' : undefined}>
              <g clipPath={`url(#${id}-beaker)`}>
                <rect x="-50" y={8 - volumes.source * .78} width="100" height={volumes.source * .78} fill="#94764f" />
                {Array.from({ length: Math.ceil(volumes.source / 5) }, (_, i) => <circle key={i} cx={-36 + i % 5 * 18} cy={3 - Math.floor(i / 5) * 15} r="2.5" fill="#513b27" />)}
              </g>
              <path d="M-53 -85 H40 L62 -91 L48 -75 V0 Q48 8 40 8 H-40 Q-48 8 -48 0 V-85" fill={`url(#${id}-glass)`} stroke="#bdd6e7" strokeWidth="2" />
              <path d="M-41 -76 V-1" stroke="white" strokeOpacity=".5" strokeWidth="4" />
              {[-20, -40, -60].map(y => <path key={y} d={`M32 ${y} h13`} stroke="#e2e8f0" />)}
            </g>
            {!beakerPlaced && <text y="47" textAnchor="middle" fill="#e2d2b5" fontSize="14">Muddy water / 100 mL</text>}
          </DraggableSVG>
          {sediment > 0 && <><path d="M569 214 H695" stroke="#d6b992" /><text x="700" y="209" textAnchor="end" fill="#e7d4b8" fontSize="12">Residue stays</text><text x="700" y="228" textAnchor="end" fill="#e7d4b8" fontSize="12">in paper</text></>}
        </svg>
      </LabWorkspace>
    </div>
  );
}
