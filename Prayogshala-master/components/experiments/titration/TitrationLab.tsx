'use client';

import { useState, useEffect, useEffectEvent, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { RotateCcw, FileText, ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { calculatePH, getFlaskColor } from '@/lib/utils';
import LabReport from '@/components/lab/LabReport';
import DemoAnswer from '@/components/lab/DemoAnswer';
import type { DemoStep } from '@/components/lab/useDemoRunner';
import PhysicalApparatus, { initialApparatus, near, mountedPosition, reservoirTip, flaskTip, secured, aligned, funnelSeated, bottlePosition, toolsClear, SHELF, type ApparatusState, type Instrument, type Point, type BuretteZoomState } from './PhysicalApparatus';

const NAOH_CONC = 0.1, HCL_VOL = 25, ENDPOINT = 25;
const buttonClass = 'rounded-xl border border-slate-600 px-3 py-2 text-sm text-slate-100 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white disabled:opacity-40 disabled:cursor-not-allowed';

const GUIDE = [
  { en: 'Mount and secure the burette', ne: 'ब्यूरेट सुरक्षित राख्नुहोस्', text: 'Drag the burette into the clamp. Adjust the clamp vertically while loose, then turn its wheel to at least 70%.', why: 'A secure, vertical burette gives reliable readings and avoids spills.' },
  { en: 'Fill the burette', ne: 'ब्यूरेट भर्नुहोस्', text: 'Seat the funnel, position the NaOH bottle above it, and pour to the zero mark. Return the funnel and bottle.', why: 'The 50 mL burette holds 0.1 mol/L NaOH. The tip is assumed pre-rinsed and air-free; filling stops at the zero mark.' },
  { en: 'Pipette exactly 25 mL HCl', ne: 'फ्लास्कमा HCl थप्नुहोस्', text: 'Move the pipette tip into the HCl reservoir. Hold the orange bulb or scroll over it until full. Move the full pipette into the flask and hold again to drain.', why: 'Only a full 25 mL aliquot is accepted. Partial drainage can be resumed, but titration remains locked until all 25 mL reaches the flask.' },
  { en: 'Add the indicator', ne: 'सूचक थप्नुहोस्', text: 'Return the pipette to its holder. Position the indicator dropper over the flask, squeeze twice, and return it.', why: 'Phenolphthalein is colourless below pH 8.2 and becomes pink over pH 8.2-10. Two small drops are sufficient.' },
  { en: 'Titrate carefully', ne: 'अनुमापन गर्नुहोस्!', text: 'Align the flask under the tip and clear the funnel and tools. Open the stopcock wheel gradually. Close it near 25 mL and use single drops. Record the first persistent pink.', why: 'At 25 C, equivalence is 25.00 mL and pH 7. The indicator endpoint is slightly beyond equivalence. The model assumes continuous mixing; the single-drop control briefly opens then closes the valve.' },
];

export default function TitrationLab() {
  const locale = useStore(s => s.locale);
  const completeExperiment = useStore(s => s.completeExperiment);
  const [apparatus, setApparatus] = useState<ApparatusState>(() => initialApparatus());
  const apparatusRef = useRef(apparatus);
  const [volumeML, setVolumeML] = useState(0);
  const volumeRef = useRef(0);
  const [pHCurve, setPHCurve] = useState<{ volume: number; pH: number }[]>([]);
  const [isDone, setIsDone] = useState(false);
  const [isOvershot, setIsOvershot] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const [feedback, setFeedback] = useState('Place the burette in the clamp, then tighten the clamp wheel.');
  const [filling, setFilling] = useState(false);
  const [bulbActive, setBulbActive] = useState(false);
  const [buretteZoom, setBuretteZoom] = useState<BuretteZoomState>({ isZoomed: false, zoomLevel: 1, panOffset: { x: 0, y: 0 } });
  const [showVolumeReading, setShowVolumeReading] = useState(false);
  const [studentVolume, setStudentVolume] = useState<string>('');
  const fillingRef = useRef(false);
  const bulbUntil = useRef(0);
  const singleDropRef = useRef(false);
  const lockedRef = useRef(false);

  // Keep event/timer guards synchronous: no transfer can slip through between renders.
  const update = (next: ApparatusState) => { apparatusRef.current = next; setApparatus(next); };
  const pH = calculatePH(volumeML);
  const ready = (a: ApparatusState) => secured(a) && aligned(a) && a.fill === 50 && a.acid === 25 && a.indicator === 2 && toolsClear(a);
  const canFlow = ready(apparatus) && !isDone && !isOvershot;
  const isFlowing = canFlow && apparatus.opening > 0;
  const canFill = !filling && !isDone && !isOvershot && secured(apparatus) && apparatus.opening === 0 && funnelSeated(apparatus) && apparatus.fill < 50;
  const bulbMode = (a: ApparatusState) => {
    if (lockedRef.current || fillingRef.current || a.fill !== 50 || a.opening > 0) return null;
    if (!a.aliquotLoaded && near(a.positions.pipette, reservoirTip, 18)) return 'aspirate';
    if (a.aliquotLoaded && a.pipette > 0 && near(a.positions.pipette, flaskTip(a), 18)) return 'dispense';
    return null;
  };
  const canIndicator = !isDone && !isOvershot && apparatus.acid === 25 && apparatus.indicator < 2 && near(apparatus.positions.dropper, flaskTip(apparatus), 18) && !near(apparatus.positions.pipette, flaskTip(apparatus), 35);
  const currentStep = !secured(apparatus) ? 0 : apparatus.fill < 50 ? 1 : apparatus.acid < 25 ? 2 : apparatus.indicator < 2 ? 3 : 4;
  const guide = GUIDE[currentStep];

  const stop = () => {
    singleDropRef.current = false;
    update({ ...apparatusRef.current, opening: 0 });
  };

  const move = (id: Instrument, point: Point, snap: boolean) => {
    const a = apparatusRef.current;
    if (lockedRef.current || fillingRef.current || bulbUntil.current > Date.now()) { setFeedback('Finish the active transfer first, or reset a completed run.'); return; }
    if ((id === 'clamp' || id === 'burette') && a.tension >= 70) { setFeedback('Loosen the clamp below 70% before moving the clamp or burette.'); return; }
    const positions = { ...a.positions };
    let mounted = a.mounted;
    let tension = a.tension;
    const p = { x: Math.max(40, Math.min(755, point.x)), y: Math.max(20, Math.min(425, point.y)) };
    if (id === 'clamp') {
      p.x = 450; p.y = Math.max(140, Math.min(165, point.y));
      if (mounted) {
        const dy = p.y - positions.clamp.y;
        positions.burette = { ...positions.burette, y: positions.burette.y + dy };
        if (funnelSeated(a)) positions.funnel = { ...positions.funnel, y: positions.funnel.y + dy };
      }
    }
    if (id === 'burette') {
      p.y = Math.max(60, Math.min(180, p.y));
      mounted = snap && near(p, mountedPosition(a), 35);
      if (mounted) Object.assign(p, mountedPosition(a));
      else tension = 0;
    }
    if (id === 'flask') { p.y = 350; p.x = Math.max(60, Math.min(740, p.x)); if (snap && Math.abs(p.x - 410) < 40) p.x = 410; }
    if (id === 'pipette') {
      p.y = Math.max(160, p.y);
      if (snap && near(p, reservoirTip, 35)) Object.assign(p, reservoirTip);
      else if (snap && near(p, flaskTip(a), 35)) Object.assign(p, flaskTip(a));
    }
    if (id === 'dropper' && snap && near(p, flaskTip(a), 35)) Object.assign(p, flaskTip(a));
    if (id === 'funnel' && snap && secured(a) && near(p, positions.burette, 35)) Object.assign(p, positions.burette);
    if (id === 'bottle') {
      p.x = Math.max(65, p.x);
      if (snap && funnelSeated(a) && near(p, bottlePosition(a), 70)) {
        Object.assign(p, bottlePosition(a));
        if (secured(a) && a.fill < 50) {
          fillingRef.current = true;
          setFilling(true);
          setFeedback('Pouring NaOH through the seated funnel. Filling stops automatically at the 0.00 mL mark.');
        }
      }
    }
    positions[id] = p;
    singleDropRef.current = false;
    const startingFill = id === 'bottle' && snap && funnelSeated(a) && near(p, bottlePosition(a), 70) && secured(a) && a.fill < 50;
    update({ ...a, positions, mounted, tension, opening: 0 });
    if (snap && !startingFill) setFeedback(`${id[0].toUpperCase() + id.slice(1)} positioned. ${a.opening > 0 ? 'Stopcock closed for safety.' : 'Follow the next setup instruction.'}`);
  };

  const turnWheel = (id: 'tension' | 'opening', delta: number) => {
    const a = apparatusRef.current;
    if (id === 'opening' && delta < 0) { singleDropRef.current = false; update({ ...a, opening: Math.max(0, a.opening + delta) }); return; }
    if (lockedRef.current || fillingRef.current || bulbUntil.current > Date.now()) { setFeedback('This control is locked during transfer or after a completed run.'); return; }
    if (id === 'tension') {
      if (!a.mounted) { setFeedback('Place the burette in the clamp before tightening.'); return; }
      const tension = Math.max(0, Math.min(100, a.tension + delta));
      singleDropRef.current = false;
      update({ ...a, tension, opening: 0 });
      setFeedback(tension >= 70 ? 'Burette secured. Fill using the funnel and NaOH bottle.' : 'Clamp loose. Flow is blocked until tension reaches 70%.');
    } else {
      if (!ready(a)) { setFeedback('Flow blocked: secure the burette, fill it, transfer all 25 mL HCl, add two indicator drops, align the flask and return the funnel, pipette and dropper.'); return; }
      update({ ...a, opening: Math.max(0, Math.min(100, a.opening + delta)) });
      setFeedback('Watch the meniscus and pH. Close the stopcock before recording the endpoint.');
    }
  };

  const startFill = () => {
    const a = apparatusRef.current;
    if (!canFill || !secured(a) || !funnelSeated(a)) return;
    fillingRef.current = true; setFilling(true);
    setFeedback('Pouring NaOH through the seated funnel. Filling stops automatically at the 0.00 mL mark.');
  };
  const bulb = (action: 'hold' | 'release' | 'pulse') => {
    if (action === 'release') { bulbUntil.current = 0; setBulbActive(false); return; }
    if (!bulbMode(apparatusRef.current)) { setFeedback('Fill the burette first. Put the pipette tip into HCl to aspirate a full 25 mL, then into the flask to dispense.'); return; }
    bulbUntil.current = action === 'hold' ? Infinity : Date.now() + 1000;
    setBulbActive(true);
  };
  const addIndicator = () => {
    if (!canIndicator) return;
    const a = apparatusRef.current;
    update({ ...a, indicator: a.indicator + 1 });
    if (a.indicator === 1) setPHCurve([{ volume: 0, pH: calculatePH(0) }]);
    setFeedback(a.indicator === 1 ? 'Two indicator drops added. Return the dropper and align the flask for titration.' : 'One indicator drop added. Squeeze once more.');
  };

  const tick = useEffectEvent(() => {
    let a = apparatusRef.current;
    if (lockedRef.current) return;
    if (fillingRef.current) {
      const fill = Math.min(50, +(a.fill + 1).toFixed(1));
      a = { ...a, fill }; update(a);
      if (fill === 50) { fillingRef.current = false; setFilling(false); setFeedback('Burette filled: initial reading 0.00 mL. Return the funnel and bottle, then pipette the HCl.'); }
    }
    if (bulbUntil.current > Date.now()) {
      const mode = bulbMode(a);
      if (mode === 'aspirate') {
        const pipette = Math.min(25, +(a.pipette + 0.5).toFixed(1));
        a = { ...a, pipette, aliquotLoaded: pipette === 25 }; update(a);
        if (pipette === 25) { bulbUntil.current = 0; setFeedback('Full 25 mL aliquot aspirated. Move the pipette into the flask, then operate the bulb again.'); }
      } else if (mode === 'dispense') {
        const amount = Math.min(a.pipette, 0.5);
        a = { ...a, pipette: +(a.pipette - amount).toFixed(1), acid: +(a.acid + amount).toFixed(1) }; update(a);
        if (a.acid === 25) { bulbUntil.current = 0; setFeedback('Exactly 25 mL HCl transferred. Return the pipette before adding indicator.'); }
      } else bulbUntil.current = 0;
    }
    if (bulbUntil.current <= Date.now() && bulbActive) setBulbActive(false);
    if (a.opening > 0) {
      if (!ready(a)) { stop(); return; }
      const increment = singleDropRef.current ? 0.05 : a.opening / 100 * 0.4;
      const next = Math.min(50, +(volumeRef.current + increment).toFixed(2));
      volumeRef.current = next; setVolumeML(next);
      setPHCurve(curve => [...curve, { volume: next, pH: calculatePH(next) }]);
      if (singleDropRef.current) stop();
      if (next > ENDPOINT + 0.5) { lockedRef.current = true; setIsOvershot(true); stop(); setFeedback('Endpoint overshot. Reset and use single drops near 25 mL.'); }
    }
  });
  useEffect(() => {
    const timer = setInterval(tick, 100);
    const pause = () => {
      bulbUntil.current = 0; fillingRef.current = false;
      setBulbActive(false); setFilling(false);
      singleDropRef.current = false;
      const next = { ...apparatusRef.current, opening: 0 };
      apparatusRef.current = next; setApparatus(next);
    };
    const visibility = () => { if (document.hidden) pause(); };
    window.addEventListener('blur', pause);
    document.addEventListener('visibilitychange', visibility);
    return () => { clearInterval(timer); window.removeEventListener('blur', pause); document.removeEventListener('visibilitychange', visibility); };
  }, []);

  const singleDrop = () => {
    if (lockedRef.current || !ready(apparatusRef.current) || apparatusRef.current.opening > 0) return;
    singleDropRef.current = true;
    update({ ...apparatusRef.current, opening: 10 });
  };
  const markEndpoint = () => {
    const v = volumeRef.current;
    if (lockedRef.current || !ready(apparatusRef.current) || apparatusRef.current.opening > 0 || calculatePH(v) < 8.2 || v > ENDPOINT + 0.5) return;
    stop(); lockedRef.current = true; setIsDone(true);
    setShowVolumeReading(true);
    setFeedback(locale === 'ne' ? (isDemo ? 'डेमो मात्र। प्रगति सुरक्षित भएन।' : 'अन्त बिन्दु सुरक्षित भयो। ब्यूरेट पढ्नुहोस् र मान प्रविष्ट गर्नुहोस्।') : (isDemo ? 'Demo only. No completion earned.' : 'Endpoint recorded. Read the burette and enter your measurement.'));
  };
  const reset = (demo = false) => {
    fillingRef.current = false; bulbUntil.current = 0; singleDropRef.current = false; lockedRef.current = false;
    setFilling(false); setBulbActive(false); update(initialApparatus(demo));
    volumeRef.current = demo ? 25 : 0; setVolumeML(volumeRef.current);
    setIsDone(false); setIsOvershot(false); setIsDemo(demo); setShowReport(false);
    setShowVolumeReading(false);
    setStudentVolume('');
    setBuretteZoom({ isZoomed: false, zoomLevel: 1, panOffset: { x: 0, y: 0 } });
    setPHCurve(demo ? Array.from({ length: 51 }, (_, i) => ({ volume: i * .5, pH: calculatePH(i * .5) })) : []);
    setFeedback(demo ? 'Demo: colourless at pH 7. Add one drop. No completion is saved; reset for an earned attempt.' : 'Place the burette in the clamp, then tighten the clamp wheel.');
  };
  const calculatedConc = NAOH_CONC * volumeML / HCL_VOL;

  // Scripted walkthrough: mutates the same refs/state the pointer handlers use, so the bench animates for real.
  const place = (id: Instrument, p: Point, extra: Partial<ApparatusState> = {}) => {
    const a = apparatusRef.current;
    update({ ...a, ...extra, positions: { ...a.positions, [id]: p } });
  };
  const demoSteps: DemoStep[] = [
    { caption: 'Lift the burette from the shelf and seat it in the clamp.', run: () => { setIsDemo(true); place('burette', mountedPosition(apparatusRef.current), { mounted: true, tension: 0 }); } },
    { caption: 'Turn the clamp wheel to 80 %: the burette is now secure and vertical.', run: () => update({ ...apparatusRef.current, tension: 80 }) },
    { caption: 'Seat the funnel in the top of the burette.', run: () => place('funnel', apparatusRef.current.positions.burette) },
    { caption: 'Bring the NaOH bottle over the funnel.', run: () => place('bottle', bottlePosition(apparatusRef.current)) },
    { caption: 'Pour 0.1 mol/L NaOH until the meniscus sits on the 0.00 mL mark.', run: () => { fillingRef.current = true; setFilling(true); }, until: () => apparatusRef.current.fill >= 50, wait: 600 },
    { caption: 'Return the bottle and funnel so nothing drips into the flask later.', run: () => { place('bottle', SHELF.bottle); place('funnel', SHELF.funnel); } },
    { caption: 'Lower the pipette tip into the HCl reservoir.', run: () => place('pipette', reservoirTip) },
    { caption: 'Squeeze the bulb: draw up exactly 25.0 mL of acid.', run: () => { bulbUntil.current = Infinity; setBulbActive(true); }, until: () => apparatusRef.current.pipette >= 25, wait: 500 },
    { caption: 'Carry the full pipette to the conical flask.', run: () => { bulbUntil.current = 0; setBulbActive(false); place('pipette', flaskTip(apparatusRef.current)); } },
    { caption: 'Release the bulb and let all 25 mL drain into the flask.', run: () => { bulbUntil.current = Infinity; setBulbActive(true); }, until: () => apparatusRef.current.acid >= 25, wait: 500 },
    { caption: 'Return the pipette to its holder.', run: () => { bulbUntil.current = 0; setBulbActive(false); place('pipette', SHELF.pipette); } },
    { caption: 'Position the phenolphthalein dropper over the flask and add two drops. The acid stays colourless.', run: () => { place('dropper', flaskTip(apparatusRef.current)); update({ ...apparatusRef.current, indicator: 2 }); setPHCurve([{ volume: 0, pH: calculatePH(0) }]); }, wait: 1800 },
    { caption: 'Return the dropper and slide the flask under the burette tip.', run: () => { place('dropper', SHELF.dropper); place('flask', { x: 410, y: 350 }); } },
    { caption: 'Open the stopcock. NaOH runs in and pH creeps upward while the solution stays colourless.', run: () => update({ ...apparatusRef.current, opening: 70 }), until: () => volumeRef.current >= 22, wait: 200 },
    { caption: 'Near 25 mL: close the stopcock and switch to single drops.', run: () => update({ ...apparatusRef.current, opening: 15 }), until: () => volumeRef.current >= 24.6, wait: 300 },
    { caption: 'Drop by drop. Watch for the first pink that persists on swirling.', run: () => update({ ...apparatusRef.current, opening: 0 }), wait: 800 },
    { caption: 'Single drops, swirling between each. Still colourless: pH just below 7.', run: () => {
      const drip = () => {
        if (lockedRef.current || calculatePH(volumeRef.current) >= 8.2) return;
        if (apparatusRef.current.opening === 0) singleDrop();
        setTimeout(drip, 700);
      };
      drip();
    }, until: () => calculatePH(volumeRef.current) >= 8.2, wait: 1600 },
    { caption: 'Pale pink holds: the indicator has crossed pH 8.2. This is the endpoint.', wait: 1600 },
    { caption: 'Read the burette: about 25.05 mL. M1V1 = M2V2 gives [HCl] = 0.100 mol/L.', run: markEndpoint, wait: 2400 },
  ];
  const blocker = !secured(apparatus) ? 'Burette must be clamped at 70% tension or more.'
    : apparatus.fill < 50 ? 'Fill the burette through the funnel to 50 mL.'
    : apparatus.acid < 25 ? 'Transfer the full 25 mL aliquot using the pipette bulb.'
    : apparatus.indicator < 2 ? 'Add two indicator drops with the positioned dropper.'
    : !aligned(apparatus) ? 'Snap the flask under the burette tip.'
    : !toolsClear(apparatus) ? 'Return the funnel, bottle, pipette and dropper before opening the stopcock.' : '';

  return <div className="flex min-h-[calc(100dvh-64px)] flex-col bg-slate-950 text-slate-100 lg:flex-row">
    <div className="min-w-0 flex-1">
      <header className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <Link href="/lab" className="flex items-center gap-1 text-xs text-slate-300"><ChevronLeft size={14} />Back to Lab</Link>
        <div className="text-center"><h1 className="text-sm font-bold">{locale === 'ne' ? 'अम्ल-क्षार अनुमापन' : 'Acid-Base Titration'}</h1><p className="text-xs text-slate-400">HCl + NaOH → NaCl + H₂O | 25 C</p></div>
        <div className="flex items-center gap-2">
          <DemoAnswer experimentId="titration-acid-base" steps={demoSteps} onStart={() => reset(false)} />
          <button onClick={() => reset()} className={buttonClass}><RotateCcw size={13} className="mr-1 inline" />Reset</button>
        </div>
      </header>
      <PhysicalApparatus state={apparatus} volume={volumeML} color={getFlaskColor(pH, apparatus.indicator > 0)} flowing={isFlowing} filling={filling} bulbActive={bulbActive}
        locked={isDone || isOvershot} canFill={canFill} canBulb={!!bulbMode(apparatus)} canIndicator={canIndicator} canFlow={canFlow}
        onMove={move} onWheel={turnWheel} onFill={startFill} onBulb={bulb} onIndicator={addIndicator}
        buretteZoom={buretteZoom} onBuretteZoomChange={(zoom) => setBuretteZoom(prev => ({ ...prev, ...zoom }))} showVolumeReading={showVolumeReading} />
      <div className="space-y-3 border-t border-white/10 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <button className={buttonClass} disabled={!canFlow || apparatus.opening > 0} onClick={singleDrop}>{locale === 'ne' ? 'एक थोपा (+0.05 mL)' : 'Single drop (+0.05 mL)'}</button>
          <button className={`${buttonClass} bg-pink-800`} disabled={!canFlow || apparatus.opening > 0 || pH < 8.2} onClick={markEndpoint}>Mark Endpoint</button>
          {isDone && !isDemo && <button className={`${buttonClass} bg-emerald-800`} onClick={() => setShowReport(true)}><FileText size={14} className="mr-1 inline" />Generate Lab Report</button>}
          <button onClick={() => reset(true)} className={`${buttonClass} ml-auto`}>Skip to endpoint</button>
        </div>
        <p role="status" data-testid="titration-feedback" className="text-sm text-blue-200">{feedback}</p>
        {blocker && !isDone && !isOvershot && <p data-testid="flow-blocker" className="text-xs text-amber-200">Flow locked: {blocker}</p>}
        {locale === 'ne' && <p className="text-xs text-slate-400">नयाँ उपकरण नियन्त्रण र विस्तृत निर्देशन अंग्रेजीमा छन्।</p>}
      </div>
    </div>

    <aside className="w-full shrink-0 space-y-4 border-l border-white/10 bg-slate-900 p-4 lg:w-80" aria-label="Readings and guide">
      <h2 className="text-xs font-bold uppercase tracking-widest text-slate-300">Live readings</h2>
      <dl className="grid grid-cols-2 gap-3 font-mono">
        <div className="rounded-xl bg-slate-950 p-3"><dt className="text-xs text-slate-400">NaOH delivered</dt><dd data-testid="volume-reading" className="text-xl text-blue-300">{showVolumeReading ? volumeML.toFixed(2) : '??.??'} mL</dd></div>
        <div className="rounded-xl bg-slate-950 p-3"><dt className="text-xs text-slate-400">pH (model)</dt><dd data-testid="ph-reading" className="text-xl text-pink-300">{apparatus.acid === 25 ? pH.toFixed(2) : '--'}</dd></div>
        <div><dt className="text-xs text-slate-400">Burette remaining</dt><dd data-testid="burette-remaining">{showVolumeReading ? (apparatus.fill - volumeML).toFixed(2) : '??.??'} mL</dd></div>
        <div><dt className="text-xs text-slate-400">Room temperature</dt><dd>25 C</dd></div>
      </dl>
      <section className="space-y-2 rounded-xl border border-accent/40 bg-accent-soft p-3">
        <h2 className="text-sm font-semibold text-fg">{currentStep + 1}. {locale === 'ne' ? guide.ne : guide.en}</h2>
        <p className="text-xs leading-relaxed text-slate-300">{guide.text}</p>
        <button className="flex w-full items-center justify-between py-2 text-xs text-accent" aria-expanded={showWhy} onClick={() => setShowWhy(v => !v)}>Why do we do this? {showWhy ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>
        {showWhy && <p className="text-xs leading-relaxed text-slate-400">{guide.why}</p>}
      </section>
      <section aria-label="pH versus volume chart">
        <h2 className="mb-2 text-xs font-semibold">pH vs Volume Curve</h2>
        {pHCurve.length ? <div className="h-48 min-w-0 rounded-xl bg-slate-950 p-2"><ResponsiveContainer width="100%" height="100%">
          <LineChart data={pHCurve} margin={{ top: 8, right: 12, bottom: 14, left: -22 }}>
            <CartesianGrid strokeDasharray="2 2" stroke="#334155" />
            <XAxis dataKey="volume" type="number" domain={[0, Math.max(26, volumeML)]} tick={{ fontSize: 10, fill: '#94a3b8' }} label={{ value: 'NaOH / mL', position: 'insideBottom', offset: -10, fontSize: 10, fill: '#94a3b8' }} />
            <YAxis domain={[0, 14]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <Tooltip formatter={v => [v != null ? Number(v).toFixed(2) : '--', 'pH']} contentStyle={{ background: '#0f172a', borderColor: '#334155', fontSize: 11 }} />
            <ReferenceLine y={7} stroke="#f59e0b" strokeDasharray="3 3" /><ReferenceLine x={25} stroke="#ec4899" strokeDasharray="3 3" />
            <Line type="monotone" dataKey="pH" stroke="#a78bfa" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer></div> : <p className="text-xs text-slate-400">The curve starts after preparing the flask.</p>}
      </section>
      <section className="space-y-2 text-xs leading-relaxed" aria-label="Observations and expected result">
        <h2 className="font-semibold text-slate-200">Observations</h2>
        <p data-testid="color-observation" className="text-slate-300">{apparatus.acid < 25 ? 'Preparing a fixed 25 mL HCl aliquot.' : apparatus.indicator < 2 ? 'Acid is colourless; add two indicator drops.' : pH <= 8.2 ? 'Colourless solution. The pink endpoint has not been reached.' : 'Persistent pink in the mixed solution. Close the stopcock and record the endpoint.'}</p>
        <h2 className="font-semibold text-slate-200">Expected result</h2>
        <p className="text-slate-400">Equivalence: 25.00 mL NaOH, pH 7. First 0.05 mL drop beyond equivalence: pH {calculatePH(25.05).toFixed(2)}. Expected [HCl]: 0.1000 mol/L.</p>
        <p className="text-slate-400">Phenolphthalein changes over pH 8.2-10. The accepted practice endpoint is above pH 8.2 and no more than 25.50 mL; aim for 25.05 mL, not the tolerance limit.</p>
        <p className="text-slate-400">Ideal strong acid/base at 25 C; instantaneous mixing, negligible indicator volume, pre-rinsed glassware and air-free tip. These preparation steps are assumed, not simulated.</p>
      </section>
      {isOvershot && <p className="rounded-xl bg-rose-950 p-3 text-sm text-rose-200">Endpoint overshot. Reset and use single drops near 25 mL.</p>}
      {isDone && showVolumeReading && !isDemo && (
        <section className="space-y-3 rounded-xl border border-blue-700 bg-blue-950/50 p-3 text-xs">
          <h2 className="font-bold text-blue-200">Enter Your Burette Reading</h2>
          <p className="text-slate-300">Zoom into the burette above, read the meniscus bottom against the scale, then enter the volume below.</p>
          <div className="space-y-2">
            <label className="block">
              <span className="text-xs text-slate-400">Initial reading (mL):</span>
              <input type="number" step="0.01" min="0" max="50" value={0} readOnly className="w-full mt-1 rounded bg-slate-900 border border-slate-600 px-2 py-1 text-sm text-slate-100" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-400">Final reading (mL):</span>
              <input
                type="number"
                step="0.01"
                min="0"
                max="50"
                value={studentVolume}
                onChange={e => setStudentVolume(e.target.value)}
                className="w-full mt-1 rounded bg-slate-900 border border-slate-600 px-2 py-1 text-sm text-slate-100 focus:border-blue-400 focus:outline-none"
                placeholder="e.g., 25.05"
                autoFocus
              />
            </label>
            <label className="block">
              <span className="text-xs text-slate-400">Volume delivered (mL):</span>
              <input type="number" step="0.01" value={studentVolume ? parseFloat(studentVolume).toFixed(2) : ''} readOnly className="w-full mt-1 rounded bg-slate-900 border border-slate-600 px-2 py-1 text-sm text-blue-300 font-mono" />
            </label>
            <button
              className={`${buttonClass} bg-blue-800 w-full`}
              onClick={() => {
                if (studentVolume && parseFloat(studentVolume) > 0) {
                  setShowReport(true);
                }
              }}
              disabled={!studentVolume || parseFloat(studentVolume) <= 0}
            >
              Submit Reading & Generate Report
            </button>
          </div>
        </section>
      )}
      {isDone && (() => {
        const finalVolume = studentVolume && !isDemo ? parseFloat(studentVolume) : volumeML;
        const finalConc = finalVolume * NAOH_CONC / HCL_VOL;
        return (
          <section data-testid="titration-result" className="space-y-2 rounded-xl border border-emerald-700 bg-emerald-950/50 p-3 text-xs">
            <h2 className="font-bold text-emerald-200">{isDemo ? 'Demo result (not saved)' : 'Result and conclusion'}</h2>
            <p className="font-mono">M₁V₁ = M₂V₂<br />0.1 × {finalVolume.toFixed(2)} = [HCl] × 25</p>
            <p className="font-bold text-emerald-300">[HCl] = {finalConc.toFixed(4)} mol/L</p>
            <p>HCl and NaOH neutralize in a 1:1 mole ratio. The indicator endpoint gives {((finalConc / .1 - 1) * 100).toFixed(2)}% error relative to the simulated 0.1000 mol/L sample.</p>
          </section>
        );
      })()}
    </aside>
    {showReport && !isDemo && isDone && <LabReport experimentId="titration-acid-base" data={{ volumeDispensed: studentVolume ? parseFloat(studentVolume) : volumeML, calculatedConcentration: (studentVolume ? parseFloat(studentVolume) : volumeML) * NAOH_CONC / HCL_VOL, endpointPH: pH, pHData: pHCurve }} onClose={() => setShowReport(false)} />}
  </div>;
}
