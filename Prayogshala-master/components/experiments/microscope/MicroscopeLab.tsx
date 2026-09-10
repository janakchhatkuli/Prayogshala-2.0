'use client';

import { useId, useState } from 'react';
import LabWorkspace from '@/components/lab/LabWorkspace';
import DraggableSVG, { type Point } from '@/components/lab/DraggableSVG';
import { useStore } from '@/lib/store';

const SLIDES = {
  plant: { name: 'Onion epidermis', kind: 'Plant', color: '#c4b5fd', focus: 44, note: 'Regular cells with rigid walls, a large vacuole and a stained nucleus. Onion bulb epidermis has no chloroplasts.' },
  animal: { name: 'Cheek epithelium', kind: 'Animal', color: '#7dd3fc', focus: 58, note: 'Irregular, flattened cells with a stained nucleus and cell boundary; no cell wall or chloroplasts.' },
  blood: { name: 'Human blood smear', kind: 'Blood', color: '#fda4af', focus: 68, note: 'Many red blood cells with central pallor and no nucleus; a larger white blood cell has a lobed nucleus.' },
};
type Specimen = keyof typeof SLIDES;
type Observation = { specimen: Specimen; magnification: number; illumination: number };
const KEYS = Object.keys(SLIDES) as Specimen[];
const STAGE = { x: 208, y: 239 };

export default function MicroscopeLab() {
  const uid = useId().replace(/:/g, '');
  const id = (name: string) => `${uid}-${name}`;
  const paint = (name: string) => `url(#${id(name)})`;
  const completeExperiment = useStore(s => s.completeExperiment);
  const [selected, setSelected] = useState<Specimen>('plant');
  const [loaded, setLoaded] = useState<Specimen | null>(null);
  const [focus, setFocus] = useState(15);
  const [magnification, setMagnification] = useState(100);
  const [illumination, setIllumination] = useState(65);
  const [labels, setLabels] = useState(true);
  const [records, setRecords] = useState<Observation[]>([]);
  const [complete, setComplete] = useState(false);
  const [feedback, setFeedback] = useState('Choose a prepared slide and place it on the dashed stage target.');
  const specimen = loaded ? SLIDES[loaded] : null;
  const targetFocus = (specimen?.focus ?? 50) + (magnification === 400 ? 6 : magnification === 40 ? -5 : 0);
  const focusError = Math.abs(focus - targetFocus);
  const focused = loaded === selected && loaded !== null && focusError <= 4;
  const lit = illumination >= 30 && illumination <= 85;
  const recorded = records.some(row => row.specimen === loaded);
  const canRecord = focused && lit && !recorded && !complete;
  const scale = magnification / 100;
  const status = !loaded ? 'Stage empty' : !lit ? 'Adjust illumination' : focused ? 'Sharp image' : 'Turn the focus dial';
  const structures = loaded === 'plant'
    ? [{ text: 'Cell wall', x: -25, y: 0 }, { text: 'Nucleus', x: 12, y: -17 }, { text: 'Vacuole', x: -3, y: 12 }]
    : loaded === 'animal'
      ? [{ text: 'Cell boundary', x: -24, y: 0 }, { text: 'Nucleus', x: 3, y: -5 }, { text: 'Cytoplasm', x: 14, y: 12 }]
      : [{ text: 'Red blood cell', x: -9, y: 0 }, { text: 'White cell nucleus', x: 24, y: -22 }, { text: 'Central pallor', x: 0, y: 2 }];

  function choose(key: Specimen) {
    setSelected(key);
    setLoaded(null);
    setFocus(15);
    setFeedback(`${SLIDES[key].name} selected. Load it onto the stage before observing.`);
  }

  function place(key: Specimen, point: Point) {
    setSelected(key);
    setFocus(15);
    if (Math.abs(point.x - STAGE.x) <= 66 && Math.abs(point.y - STAGE.y) <= 35) {
      setLoaded(key);
      setFeedback(`${SLIDES[key].name} secured under the stage clips. Adjust focus until sharp.`);
    } else {
      setLoaded(null);
      setFeedback('Slide missed the stage. Drag its center into the dashed target, or use Load selected slide.');
    }
  }

  function record() {
    if (!canRecord || !loaded) return;
    setRecords(previous => [...previous, { specimen: loaded, magnification, illumination }]);
    setFeedback('Focused observation recorded. Compare a different specimen next.');
  }

  function finish() {
    if (records.length < 2 || complete) return;
    completeExperiment('microscope-cells');
    setComplete(true);
    setFeedback('Comparison complete. Your microscope experiment has been saved.');
  }

  function reset() {
    setSelected('plant'); setLoaded(null); setFocus(15); setMagnification(100);
    setIllumination(65); setLabels(true); setRecords([]); setComplete(false);
    setFeedback('Bench reset. Select and load your first prepared slide.');
  }

  return (
    <LabWorkspace title="Cells under the microscope" subject="Biology"
      intro="How do plant, animal and blood cells differ? Load prepared, stained slides, bring real image blur into focus, and record two different specimens. These are authored teaching illustrations, not micrographs."
      equipment={['Compound microscope', '3 prepared slides', '40x / 100x / 400x optics', 'LED illuminator']}
      steps={['Load a prepared slide', 'Focus and illuminate the image', 'Record two different specimens', 'Complete the comparison']}
      currentStep={records.length >= 2 ? 3 : !loaded ? 0 : !focused || !lit ? 1 : 2}
      complete={complete} onReset={reset}
      controls={<div className="space-y-4">
        <fieldset><legend className="mb-2 text-sm font-semibold">Prepared slides</legend>
          <div className="flex flex-wrap gap-2">{KEYS.map(key => <button key={key} onClick={() => choose(key)} aria-pressed={selected === key}
            className={`min-h-11 rounded-lg border px-3 py-2 text-sm ${selected === key ? 'border-emerald-400 bg-emerald-950 text-emerald-200' : 'border-slate-600 bg-slate-800'}`}>
            {SLIDES[key].kind}: {SLIDES[key].name}
          </button>)}</div>
        </fieldset>
        <button className="lab-button min-h-11" onClick={() => place(selected, STAGE)}>Load selected slide onto stage</button>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="space-y-2 text-sm"><span className="block">Focus dial <strong>{focus}</strong> / 100</span>
            <input className="w-full accent-emerald-400" type="range" min="0" max="100" value={focus} onChange={e => setFocus(Number(e.target.value))} />
            <span className="block text-xs text-slate-400">Slowly sweep the dial; stop at the sharpest image.</span>
          </label>
          <label className="space-y-2 text-sm"><span className="block">Total magnification</span>
            <select value={magnification} onChange={e => setMagnification(Number(e.target.value))} className="min-h-11 w-full rounded-lg border border-slate-600 bg-slate-800 px-3">
              {[40, 100, 400].map(value => <option key={value} value={value}>{value}x</option>)}
            </select><span className="block text-xs text-slate-400">10x eyepiece; refocus after changing objectives.</span>
          </label>
          <label className="space-y-2 text-sm"><span className="block">Illumination <strong>{illumination}%</strong></span>
            <input className="w-full accent-amber-300" type="range" min="0" max="100" value={illumination} onChange={e => setIllumination(Number(e.target.value))} />
            <span className="block text-xs text-slate-400">Use 30-85% to avoid darkness or glare.</span>
          </label>
        </div>
        <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={labels} onChange={e => setLabels(e.target.checked)} className="h-4 w-4 accent-emerald-400" />Show structure labels when focused at 100x or 400x</label>
        <p role="status" className="rounded-lg bg-slate-950 p-3 text-sm text-emerald-200">{feedback}</p>
      </div>}
      observations={<div className="space-y-4 text-sm">
        <p className="text-slate-300">{records.length} / 2 different specimens recorded</p>
        {records.length === 0 && <p className="text-slate-400">Your notebook is empty. Load, focus and record a slide.</p>}
        {records.map(row => <article key={row.specimen} className="rounded-xl border border-slate-700 bg-slate-950 p-3">
          <h3 className="font-semibold" style={{ color: SLIDES[row.specimen].color }}>{SLIDES[row.specimen].name}</h3>
          <p className="my-2 text-xs text-slate-400">{row.magnification}x / sharp focus / light {row.illumination}%</p>
          <p className="text-xs leading-relaxed text-slate-300">{SLIDES[row.specimen].note}</p>
        </article>)}
        <button className="lab-button min-h-11 w-full disabled:opacity-40" disabled={!canRecord} onClick={record}>{recorded ? 'Specimen already recorded' : 'Record focused specimen'}</button>
        {!canRecord && !recorded && !complete && <p className="text-xs text-slate-400">Recording needs a loaded slide, sharp focus and 30-85% illumination.</p>}
        <button className="lab-button min-h-11 w-full disabled:opacity-40" disabled={records.length < 2 || complete} onClick={finish}>{complete ? 'Comparison saved' : 'Complete comparison'}</button>
      </div>}
      conclusion={<p>Plant cell walls form a regular framework. Cheek cells lack walls. Mature human red blood cells lack nuclei, unlike cheek cells and white blood cells. Greater magnification enlarges structures but narrows the field of view. Colors represent preparation stains.</p>}
    >
      <div className="grid bg-[#09151c] md:grid-cols-2">
        <svg viewBox="0 0 420 440" className="w-full" role="group" aria-label="Microscope bench with draggable prepared slides">
          <defs>
            <linearGradient id={id('metal')} x1="0" x2="1"><stop stopColor="#334155" /><stop offset=".35" stopColor="#cbd5e1" /><stop offset=".65" stopColor="#64748b" /><stop offset="1" stopColor="#1e293b" /></linearGradient>
            <linearGradient id={id('body')} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e2e8f0" /><stop offset=".45" stopColor="#94a3b8" /><stop offset="1" stopColor="#334155" /></linearGradient>
            <radialGradient id={id('lamp')}><stop stopColor="#fef9c3" /><stop offset="1" stopColor="#eab308" stopOpacity="0" /></radialGradient>
            <filter id={id('shadow')} x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="3" dy="7" stdDeviation="6" floodOpacity=".5" /></filter>
          </defs>
          <text x="22" y="29" fill="#94a3b8" fontSize="12" letterSpacing="2">01 / PREPARATION BENCH</text>
          <path d="M0 347H420V440H0Z" fill="#172b32" />
          <path d="M0 347H420" stroke="#45616a" />
          <ellipse cx="225" cy="355" rx="133" ry="17" fill="#020617" opacity=".6" />
          <g filter={paint('shadow')}>
            <path d="M280 317 L280 162 Q282 114 226 106 L211 132 Q251 140 246 172 L240 310Z" fill={paint('body')} stroke="#94a3b8" strokeWidth="2" />
            <path d="M247 300L299 320Q329 327 323 347H111Q105 332 139 324L187 310Z" fill={paint('body')} />
            <path d="M113 343H323V352H112Z" fill="#1e293b" />
            <path d="M193 125L168 73L197 59L226 117Z" fill={paint('metal')} stroke="#cbd5e1" />
            <path d="M167 77L158 59L191 44L201 63Z" fill="#0f172a" stroke="#64748b" strokeWidth="3" />
            <ellipse cx="174" cy="52" rx="18" ry="7" transform="rotate(-24 174 52)" fill="#020617" stroke="#94a3b8" strokeWidth="3" />
            <ellipse cx="218" cy="145" rx="31" ry="12" fill={paint('metal')} transform="rotate(-12 218 145)" />
            {[[-22, 17, '#ef4444'], [0, 30, '#eab308'], [23, 22, '#60a5fa']].map(([x, length, color], i) => <g key={i} transform={`translate(${218 + Number(x)} 150)`}>
              <rect x="-7" width="14" height={Number(length) + (magnification === [40, 100, 400][i] ? 10 : 0)} rx="3" fill={paint('metal')} />
              <path d="M-7 8H7" stroke={String(color)} strokeWidth="4" />
            </g>)}
            <circle cx="278" cy="214" r="24" fill="#17202c" stroke="#94a3b8" strokeWidth="3" />
            <circle cx="278" cy="214" r="13" fill={paint('metal')} />
            <path d="M278 204V211" stroke="#fff" strokeWidth="3" transform={`rotate(${focus * 3.6} 278 214)`} />
            <path d="M136 249H270L282 258H141Z" fill="#475569" />
            <rect x="135" y="244" width="138" height="9" rx="2" fill="#0f172a" stroke="#64748b" />
            <path d="M197 260H230L225 279H202Z" fill={paint('metal')} />
            <ellipse cx="210" cy="316" rx="31" ry="12" fill="#0f172a" />
            <ellipse cx="210" cy="313" rx="24" ry="8" fill="#fef08a" opacity={illumination / 100} />
          </g>
          <path d="M184 306L202 259H223L237 306Z" fill={paint('lamp')} opacity={illumination / 100} />
          <rect x="149" y="222" width="118" height="28" rx="5" fill="#34d399" fillOpacity=".06" stroke="#34d399" strokeDasharray="5 4" />
          <text x="26" y="212" fill="#6ee7b7" fontSize="12">SLIDE STAGE</text>
          <path d="M98 216L148 236" stroke="#6ee7b7" fill="none" />
          {loaded && <g transform={`translate(${STAGE.x} ${STAGE.y})`}>
            <rect x="-48" y="-8" width="96" height="12" rx="2" fill="#d1fae5" fillOpacity=".55" stroke="#e2e8f0" />
            <ellipse rx="12" ry="4" fill={SLIDES[loaded].color} />
            <path d="M-34 -11V7M34 -11V7" stroke="#e2e8f0" strokeWidth="4" />
          </g>}
          <text x="25" y="374" fill="#94a3b8" fontSize="11">PREPARED SLIDES / drag to stage</text>
          {KEYS.map((key, index) => <DraggableSVG key={key} x={77 + index * 132} y={402} label={`${SLIDES[key].name} slide. Drag to stage or use the load button.`}
            onMove={() => { if (loaded) setLoaded(null); setSelected(key); }} onDrop={point => place(key, point)}>
            <rect x="-54" y="-18" width="108" height="36" rx="4" fill="#cbd5e1" fillOpacity=".2" stroke={selected === key ? '#6ee7b7' : '#64748b'} strokeWidth="2" />
            <rect x="-48" y="-13" width="29" height="26" rx="2" fill={SLIDES[key].color} />
            <circle cx="17" cy="-1" r="10" fill={SLIDES[key].color} fillOpacity=".45" />
            <path d="M9 -9L25 7M10 7L24 -8" stroke={SLIDES[key].color} />
            <text x="-34" y="4" textAnchor="middle" fontSize="9" fill="#0f172a">{SLIDES[key].kind}</text>
          </DraggableSVG>)}
        </svg>
        <div className="border-t border-slate-700 md:border-l md:border-t-0">
          <svg viewBox="0 0 420 440" className="w-full" role="img" aria-label={`${loaded ? SLIDES[loaded].name : 'Empty'} microscope field at ${magnification} times magnification. ${status}.`}>
            <defs>
              <clipPath id={id('field')}><circle cx="210" cy="211" r="153" /></clipPath>
              <radialGradient id={id('fieldLight')}><stop stopColor="#fffbeb" /><stop offset=".8" stopColor="#e2e8da" /><stop offset="1" stopColor="#9cae9f" /></radialGradient>
              <radialGradient id={id('redCell')}><stop stopColor="#ffe4e6" /><stop offset=".4" stopColor="#fecdd3" /><stop offset=".72" stopColor="#e8798c" /><stop offset="1" stopColor="#be4b68" /></radialGradient>
              <filter id={id('focus')} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={focusError <= 4 ? focusError * .06 : (focusError - 4) * .24} /></filter>
            </defs>
            <text x="22" y="29" fill="#94a3b8" fontSize="12" letterSpacing="2">02 / THROUGH THE EYEPIECE</text>
            <circle cx="210" cy="211" r="164" fill="#020617" stroke="#475569" strokeWidth="7" />
            <g clipPath={paint('field')}>
              <circle cx="210" cy="211" r="153" fill={paint('fieldLight')} />
              {loaded && <g filter={paint('focus')}><g transform={`translate(210 211) scale(${scale})`}>
                {Array.from({ length: 289 }, (_, index) => {
                  const col = index % 17 - 8;
                  const row = Math.floor(index / 17) - 8;
                  return <g key={index} transform={`translate(${col * 56 + (row % 2) * 9} ${row * 76})`}>
                    {loaded === 'plant' ? <>
                      <path d="M-26 -36L24 -35L27 34L-25 36Z" fill="#e9d5ff" fillOpacity=".5" stroke="#7c598f" strokeWidth="2" />
                      <path d="M-22 -31L20 -30L22 30L-21 31Z" fill="#d8b4fe" fillOpacity=".4" stroke="#a78bba" strokeWidth=".7" />
                      <path d="M-17 -23Q-4 -28 7 -23L15 21Q1 29 -16 24Z" fill="#faf5ff" fillOpacity=".8" stroke="#c4a6d6" />
                      <ellipse cx="12" cy="-17" rx="6" ry="8" fill="#7e4299" /><circle cx="13" cy="-18" r="2" fill="#4c1d65" />
                      {[[-20, 7], [17, 23], [-15, -29], [21, -7]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1" fill="#a879bd" />)}
                    </> : loaded === 'animal' ? <g transform={`rotate(${(col * 13 + row * 7) % 25})`}>
                      <path d="M-24 -10Q-27 -27 -9 -31Q11 -35 23 -18L28 7Q20 30 -3 29Q-23 24 -24 -10Z" fill="#bae6fd" fillOpacity=".5" stroke="#4d91b5" strokeWidth="1.2" />
                      <path d="M-18 -12Q-21 -22 -8 -24" fill="none" stroke="#e0f2fe" strokeWidth="3" />
                      <ellipse cx="3" cy="-5" rx="9" ry="11" fill="#6366a9" /><circle cx="5" cy="-7" r="3" fill="#373075" />
                      {[-15, -7, 13, 18].map((x, i) => <circle key={x} cx={x} cy={12 + i % 2 * 6} r="1.2" fill="#6399b7" />)}
                    </g> : <>
                      {[[0, 0], [-19, -24], [18, 24], [-19, 31]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="11" ry="9" transform={`rotate(${i * 27} ${x} ${y})`} fill={paint('redCell')} stroke="#b75a72" strokeWidth=".5" />)}
                      {col % 3 === 0 && row % 3 === 0 && <g transform="translate(24 -22)"><circle r="15" fill="#ede9fe" stroke="#a78bba" /><path d="M-8 -5Q-2 -12 2 -6Q7 -9 9 -3Q10 3 4 4Q1 12 -5 7Q-9 4 -4 0Z" fill="#705098" /><circle cx="8" cy="8" r="1" fill="#a78bba" /></g>}
                      <circle cx="-20" cy="14" r="2" fill="#8b5c9d" />
                    </>}
                  </g>;
                })}
              </g></g>}
              <circle cx="210" cy="211" r="154" fill="#020617" opacity={Math.max(0, (55 - illumination) / 55) * .98} />
              <circle cx="210" cy="211" r="154" fill="white" opacity={Math.max(0, (illumination - 75) / 25) * .8} />
            </g>
            {labels && focused && lit && magnification >= 100 && structures.map((structure, index) => {
              const x = index === 0 ? 32 : 280;
              const y = index === 2 ? 343 : 88;
              return <g key={structure.text}><path d={`M${210 + structure.x * scale} ${211 + structure.y * scale}L${x + 40} ${y + 8}`} stroke="#0f766e" strokeWidth="1.2" />
                <rect x={x - 6} y={y - 13} width="119" height="23" rx="5" fill="#0f172a" fillOpacity=".92" /><text x={x} y={y + 2} fontSize="10" fill="#a7f3d0">{structure.text}</text>
              </g>;
            })}
            {!loaded && <text x="210" y="216" textAnchor="middle" fill="#475569" fontSize="16">Load a slide to begin</text>}
            <text x="210" y="394" textAnchor="middle" fill={focused && lit ? '#6ee7b7' : '#fcd34d'} fontSize="15">{magnification}x / {status}</text>
            <text x="210" y="419" textAnchor="middle" fill="#94a3b8" fontSize="11">{specimen?.name ?? 'No specimen on stage'} / illustrative field, not to absolute scale</text>
          </svg>
        </div>
      </div>
    </LabWorkspace>
  );
}
