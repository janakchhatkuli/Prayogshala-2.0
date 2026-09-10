'use client';
import { useState, useEffect, useEffectEvent, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { Play, Pause, RotateCcw, FileText, ChevronLeft, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { calculatePH, getFlaskColor } from '@/lib/utils';
import LabReport from '@/components/lab/LabReport';

/* ─────────────── constants ─────────────── */
const NAOH_CONC = 0.1, HCL_VOL = 25, ENDPOINT = 25;

type DropRate = 'slow' | 'medium' | 'fast';
const DROP_CFG: Record<DropRate, { ms: number; inc: number }> = {
  slow:   { ms: 380, inc: 0.05 },
  medium: { ms: 160, inc: 0.28 },
  fast:   { ms: 70,  inc: 0.55 },
};

/* ─────────────── AI guide steps ─────────────── */
interface GuideStep {
  step: number;
  targetId: string | null;
  dropZone: 'burette' | 'flask' | null;
  titleEn: string; titleNe: string;
  textEn: string;  textNe: string;
  whyEn: string;   whyNe: string;
}
const GUIDE_STEPS: GuideStep[] = [
  {
    step: 0, targetId: 'naoh-bottle', dropZone: 'burette',
    titleEn: 'Step 1 — Fill the Burette',               titleNe: 'चरण १ — ब्यूरेट भर्नुहोस्',
    textEn:  'Drag the NaOH bottle to the burette.',    textNe:  'NaOH बोतल ब्यूरेटमा तान्नुहोस्।',
    whyEn:   'The burette holds the titrant (NaOH) and lets you dispense precise volumes via the stopcock.',
    whyNe:   'ब्यूरेटले टाइट्रेन्ट (NaOH) राख्छ र स्टपककद्वारा सटीक मात्रा निकाल्न दिन्छ।',
  },
  {
    step: 1, targetId: 'hcl-beaker', dropZone: 'flask',
    titleEn: 'Step 2 — Add HCl to the Flask',           titleNe: 'चरण २ — फ्लास्कमा HCl थप्नुहोस्',
    textEn:  'Drag the HCl beaker to the conical flask.', textNe: 'HCl बिकर शंक्वाकार फ्लास्कमा तान्नुहोस्।',
    whyEn:   'We pipette exactly 25 mL of the unknown HCl into the flask. This is the analyte whose concentration we\'re finding.',
    whyNe:   'हामी अज्ञात HCl को ठ्याक्कै 25 mL फ्लास्कमा पाइपेट गर्छौं। यो विश्लेषण (analyte) हो।',
  },
  {
    step: 2, targetId: 'phph-bottle', dropZone: 'flask',
    titleEn: 'Step 3 — Add the Indicator',              titleNe: 'चरण ३ — सूचक थप्नुहोस्',
    textEn:  'Drag the phenolphthalein bottle to the flask.', textNe: 'फेनोल्फ्थालिन बोतल फ्लास्कमा तान्नुहोस्।',
    whyEn:   'Phenolphthalein changes from colourless to pink over pH 8.2-10. Its endpoint is slightly beyond equivalence (pH 7).',
    whyNe:   'फेनोल्फ्थालिन pH 8.2-10 मा रङहीनबाट गुलाबी हुन्छ। यसको अन्त बिन्दु समतुल्य बिन्दु (pH 7) भन्दा अलि पछि आउँछ।',
  },
  {
    step: 3, targetId: null, dropZone: null,
    titleEn: 'Step 4 — Titrate!',                       titleNe: 'चरण ४ — अनुमापन गर्नुहोस्!',
    textEn:  'Open the stopcock. Watch the pH rise. Close it the moment the flask turns permanently pink.',
    textNe:  'स्टपकक खोल्नुहोस्। pH बढ्दै जाँदा हेर्नुहोस्। फ्लास्क स्थायी गुलाबी हुने बित्तिकै बन्द गर्नुहोस्।',
    whyEn:   'Near the endpoint add NaOH drop by drop: the pH jump is very sharp. Stop at the first persistent pink; excess base makes the colour stronger.',
    whyNe:   'अन्त बिन्दु नजिक एक-एक थोपा थप्नुहोस्: pH छलाङ्ग तीखो हुन्छ। पहिलो स्थायी गुलाबी रङमा रोक्नुहोस्; बढी क्षारले रङ गाढा बनाउँछ।',
  },
];

/* ─────────────── equipment definitions ─────────────── */
interface Equipment { id: string; nameEn: string; nameNe: string; descEn: string; dropZone: 'burette' | 'flask' }
const EQUIPMENT: Equipment[] = [
  { id: 'naoh-bottle', nameEn: 'NaOH Solution',    nameNe: 'NaOH घोल',          descEn: '0.1 mol/L Sodium Hydroxide — the standard titrant', dropZone: 'burette' },
  { id: 'hcl-beaker',  nameEn: 'HCl Solution',     nameNe: 'HCl घोल',           descEn: '0.1 mol/L Hydrochloric Acid — unknown analyte',      dropZone: 'flask'   },
  { id: 'phph-bottle', nameEn: 'Phenolphthalein',  nameNe: 'फेनोल्फ्थालिन',    descEn: 'pH indicator: colourless (acid) → pink (base)',       dropZone: 'flask'   },
];

/* ══════════════ MAIN COMPONENT ══════════════ */
export default function TitrationLab() {
  const locale = useStore(s => s.locale);
  const { completeExperiment } = useStore();

  /* lab state */
  const [buretteFilled,    setBuretteFilled]    = useState(false);
  const [flaskHasHCl,      setFlaskHasHCl]      = useState(false);
  const [flaskHasInd,      setFlaskHasInd]      = useState(false);
  const [volumeML,         setVolumeML]          = useState(0);
  const [dropRate,         setDropRate]          = useState<DropRate>('slow');
  const [isFlowing,        setIsFlowing]         = useState(false);
  const [isDone,           setIsDone]            = useState(false);
  const [isOvershot,       setIsOvershot]        = useState(false);
  const [showReport,       setShowReport]        = useState(false);
  const [pHCurve,          setPHCurve]           = useState<{ volume: number; pH: number }[]>([]);
  const [drops,            setDrops]             = useState<number[]>([]);
  const [usedItems,        setUsedItems]         = useState<Set<string>>(new Set());
  const [activeDropZone,   setActiveDropZone]    = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [feedback, setFeedback] = useState('');
  const currentStep = !buretteFilled ? 0 : !flaskHasHCl ? 1 : !flaskHasInd ? 2 : 3;
  const ready = buretteFilled && flaskHasHCl && flaskHasInd;
  const canDispense = ready && !isDone && !isOvershot;

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const volumeRef = useRef(0);

  const pH        = calculatePH(volumeML);
  const flaskColor = getFlaskColor(pH, flaskHasInd);

  const placeEquipment = (itemId: string) => {
    if (usedItems.has(itemId) || GUIDE_STEPS[currentStep].targetId !== itemId) {
      setFeedback(locale === 'ne' ? 'पहिले हालको तयारी चरण पूरा गर्नुहोस्।' : 'Complete the current setup step first.');
      return;
    }
    setUsedItems(s => new Set(s).add(itemId));
    if (itemId === 'naoh-bottle') setBuretteFilled(true);
    if (itemId === 'hcl-beaker') setFlaskHasHCl(true);
    if (itemId === 'phph-bottle') {
      setFlaskHasInd(true);
      setPHCurve([{ volume: 0, pH: calculatePH(0) }]);
    }
    setFeedback(locale === 'ne' ? 'उपकरण थपियो। अर्को चरण जारी राख्नुहोस्।' : 'Equipment added. Continue with the next step.');
  };

  const handleDrop = (itemId: string, point: { x: number; y: number }) => {
    const matrix = svgRef.current?.getScreenCTM();
    if (!matrix) return;
    // Framer gives page coordinates; the SVG matrix uses viewport coordinates.
    const p = new DOMPoint(point.x - window.scrollX, point.y - window.scrollY).matrixTransform(matrix.inverse());
    const zone = EQUIPMENT.find(e => e.id === itemId)?.dropZone;
    const inside = zone === 'burette'
      ? p.x >= 285 && p.x <= 375 && p.y >= 15 && p.y <= 245
      : p.x >= 260 && p.x <= 385 && p.y >= 245 && p.y <= 365;
    if (inside) placeEquipment(itemId);
    else setFeedback(locale === 'ne' ? 'चिन्हित क्षेत्रमा राख्नुहोस् वा राख्ने बटन प्रयोग गर्नुहोस्।' : 'Drop inside the highlighted area, or use the placement button.');
  };

  const stopFlow = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsFlowing(false);
  };
  const toggleFlow = () => {
    if (isFlowing) stopFlow();
    else if (canDispense) setIsFlowing(true);
  };
  const dispense = (increment: number) => {
    if (!canDispense) return;
    const next = Math.min(50, +(volumeRef.current + increment).toFixed(2));
    volumeRef.current = next;
    setVolumeML(next);
    setPHCurve(c => [...c, { volume: next, pH: calculatePH(next) }]);
    setDrops(d => [...d.slice(-5), Date.now() + Math.random()]);
    if (next > ENDPOINT + 0.5) { setIsOvershot(true); stopFlow(); }
  };
  const tick = useEffectEvent(() => dispense(DROP_CFG[dropRate].inc));

  useEffect(() => {
    if (!drops.length) return;
    const timer = setTimeout(() => setDrops([]), 900);
    return () => clearTimeout(timer);
  }, [drops]);

  /* flow ticker */
  useEffect(() => {
    if (!isFlowing || !canDispense) return;
    intervalRef.current = setInterval(tick, DROP_CFG[dropRate].ms);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isFlowing, dropRate, canDispense]);

  const markEndpoint = () => {
    if (!ready || isFlowing || isDone || isOvershot || pH < 8.2 || volumeML > ENDPOINT + 0.5) return;
    stopFlow();
    const acc = Math.max(0, 1 - Math.abs(volumeML - ENDPOINT) / 5);
    setIsDone(true);
    if (!isDemo) completeExperiment('titration-acid-base', Math.round(acc * 60 + 40), acc);
    setFeedback(locale === 'ne' ? (isDemo ? 'डेमो मात्र। प्रगति सुरक्षित भएन।' : 'अन्त बिन्दु सुरक्षित भयो। प्रतिवेदन तयार छ।') : (isDemo ? 'Demo only. No completion earned.' : 'Endpoint recorded. Your report is ready.'));
  };

  const handleReset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setBuretteFilled(false); setFlaskHasHCl(false); setFlaskHasInd(false);
    setVolumeML(0); setIsFlowing(false); setIsDone(false); setIsOvershot(false);
    volumeRef.current = 0;
    setPHCurve([]); setDrops([]); setUsedItems(new Set()); setIsDemo(false); setShowReport(false); setFeedback(''); setActiveDropZone(null);
  };

  const skipToEndpoint = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setBuretteFilled(true); setFlaskHasHCl(true); setFlaskHasInd(true);
    volumeRef.current = 25;
    setVolumeML(25); setIsFlowing(false); setIsDone(false); setIsOvershot(false);
    setIsDemo(true); setShowReport(false); setDrops([]);
    setFeedback(locale === 'ne' ? 'डेमो: pH 7 मा रङहीन। एक थोपा थप्नुहोस्। प्रगति सुरक्षित हुँदैन; नयाँ प्रयासका लागि रिसेट गर्नुहोस्।' : 'Demo: colourless at pH 7. Add one drop. No completion is saved; reset for an earned attempt.');
    setUsedItems(new Set(EQUIPMENT.map(e => e.id)));
    setPHCurve(Array.from({ length: 51 }, (_, i) => ({ volume: i * 0.5, pH: calculatePH(i * 0.5) })));
  };

  const guide = GUIDE_STEPS[Math.min(currentStep, GUIDE_STEPS.length - 1)];
  const calculatedConc = (NAOH_CONC * volumeML) / HCL_VOL;

  /* burette fill geometry */
  const BURETTE_H = 180;
  const filledH   = buretteFilled ? Math.min(BURETTE_H, (volumeML / 50) * BURETTE_H) : 0;
  const liquidH   = BURETTE_H - filledH;

  return (
    <div className="flex min-h-[calc(100dvh-64px)] flex-col lg:flex-row select-none" style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 100%)' }}>

      {/* ══════ LEFT — LAB BENCH ══════ */}
      <div className="min-w-0 flex-1 flex flex-col relative">

        {/* Back + title bar */}
        <div className="flex flex-wrap gap-2 items-center justify-between px-4 py-2 z-10">
          <Link href="/lab" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-white/5 rounded-full px-3 py-1.5 transition-colors">
            <ChevronLeft className="h-3 w-3" /> Back to Lab
          </Link>
          <div className="text-center">
            <div className="text-xs font-bold text-white/80 tracking-widest uppercase">Acid-Base Titration</div>
            <div className="text-[10px] text-slate-500">HCl + NaOH → NaCl + H₂O</div>
          </div>
          <button onClick={handleReset} className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-400 bg-white/5 rounded-full px-3 py-1.5 transition-colors">
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </div>

        {/* Lab bench SVG */}
        <div className="relative flex-1 min-h-0">
          <svg ref={svgRef} viewBox="0 0 680 460" aria-label={locale === 'ne' ? 'अनुमापन प्रयोगशाला' : 'Titration bench'} className="w-full h-auto">
            <defs>
              {/* Glass gradient (cylindrical look) */}
              <linearGradient id="glassH" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor="rgba(255,255,255,0.55)" />
                <stop offset="12%"  stopColor="rgba(200,230,255,0.25)" />
                <stop offset="50%"  stopColor="rgba(180,210,255,0.08)" />
                <stop offset="88%"  stopColor="rgba(100,150,220,0.12)" />
                <stop offset="100%" stopColor="rgba(60,100,180,0.4)"  />
              </linearGradient>
              <linearGradient id="flaskGlass" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor="rgba(255,255,255,0.45)" />
                <stop offset="20%"  stopColor="rgba(200,230,255,0.18)" />
                <stop offset="60%"  stopColor="rgba(180,210,255,0.06)" />
                <stop offset="100%" stopColor="rgba(80,120,200,0.32)"  />
              </linearGradient>
              <linearGradient id="naohLiq" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="rgba(96,165,250,0.85)" />
                <stop offset="100%" stopColor="rgba(37,99,235,0.65)"  />
              </linearGradient>
              <linearGradient id="benchGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#2a2a3a" />
                <stop offset="100%" stopColor="#1a1a28" />
              </linearGradient>
              <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="4" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <filter id="dropShadow">
                <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="rgba(0,0,0,0.5)"/>
              </filter>
              {/* Liquid gradient (changes with pH) */}
              <linearGradient id="flaskLiq" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={flaskColor} stopOpacity="0.7" />
                <stop offset="100%" stopColor={flaskColor} />
              </linearGradient>
            </defs>

            {/* ── Bench surface ── */}
            <rect x="0" y="370" width="680" height="90" fill="url(#benchGrad)" />
            <rect x="0" y="368" width="680" height="6" rx="0" fill="#3a3a5a" />
            <rect x="0" y="368" width="680" height="2" fill="rgba(255,255,255,0.08)" />
            {/* Bench reflection */}
            {Array.from({ length: 7 }, (_, i) => (
              <line key={i} x1={i * 100} y1="370" x2={i * 100} y2="460" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
            ))}

            {/* ── Wall background ── */}
            <rect x="0" y="0" width="680" height="370" fill="#0d1117" />
            {/* Subtle grid on wall */}
            {Array.from({ length: 14 }, (_, i) => (
              <line key={`wv${i}`} x1={i * 50} y1="0" x2={i * 50} y2="370" stroke="rgba(255,255,255,0.025)" strokeWidth="1" />
            ))}
            {Array.from({ length: 8 }, (_, i) => (
              <line key={`wh${i}`} x1="0" y1={i * 50} x2="680" y2={i * 50} stroke="rgba(255,255,255,0.025)" strokeWidth="1" />
            ))}

            {/* ── Ambient lighting ── */}
            <radialGradient id="ambientLight" cx="50%" cy="0%" r="60%">
              <stop offset="0%"   stopColor="rgba(99,102,241,0.15)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            <rect x="0" y="0" width="680" height="370" fill="url(#ambientLight)" />

            {/* ── Burette stand ── */}
            {/* Base plate */}
            <rect x="298" y="365" width="84" height="10" rx="4" fill="#374151" filter="url(#dropShadow)" />
            {/* Vertical rod */}
            <rect x="336" y="30" width="8" height="340" rx="4" fill="url(#rodGrad)" />
            <defs>
              <linearGradient id="rodGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor="#6b7280" />
                <stop offset="40%"  stopColor="#9ca3af" />
                <stop offset="100%" stopColor="#4b5563" />
              </linearGradient>
            </defs>
            {/* Clamp */}
            <rect x="312" y="90" width="56" height="12" rx="5" fill="#4b5563" />
            <rect x="315" y="80" width="10" height="28" rx="3" fill="#6b7280" />

            {/* ── BURETTE (3D glass) ── */}
            <g transform="scale(1 .75)">
            {/* Shadow under burette */}
            <rect x="300" y="30" width="36" height="260" rx="7" fill="rgba(0,0,0,0.3)" transform="translate(4,4)" />
            {/* Burette outer glass */}
            <rect x="300" y="30" width="36" height="260" rx="7" fill="url(#glassH)" stroke="rgba(147,197,253,0.35)" strokeWidth="1.5" />
            {/* NaOH liquid */}
            {buretteFilled && liquidH > 0 && (
              <rect x="302" y={36 + filledH} width="32" height={288 - 36 - filledH} rx="5" fill="url(#naohLiq)" />
            )}
            {/* Left specular highlight */}
            <rect x="303" y="33" width="4" height="256" rx="2" fill="rgba(255,255,255,0.28)" />
            {/* Right edge shadow */}
            <rect x="330" y="33" width="4" height="256" rx="2" fill="rgba(0,0,50,0.25)" />
            {/* Scale marks */}
            {Array.from({ length: 11 }, (_, i) => (
              <g key={i}>
                <line x1="336" y1={36 + i * 18} x2="345" y2={36 + i * 18} stroke="rgba(147,197,253,0.7)" strokeWidth="1" />
                <text x="348" y={39 + i * 18} fontSize="7.5" fill="rgba(147,197,253,0.7)" fontFamily="monospace">{i * 5}</text>
              </g>
            ))}
            {/* Volume reading line */}
            {buretteFilled && (
              <line x1="295" y1={36 + filledH} x2="344" y2={36 + filledH} stroke="rgba(251,191,36,0.8)" strokeWidth="1" strokeDasharray="2 2" />
            )}
            {/* Burette tip */}
            <path d={`M302 288 L318 316 L334 288 Z`} fill="rgba(200,230,255,0.2)" stroke="rgba(147,197,253,0.4)" strokeWidth="1.5" />
            {/* Stopcock handle */}
            <g role="button" tabIndex={canDispense ? 0 : -1} aria-disabled={!canDispense} aria-pressed={isFlowing}
              aria-label={locale === 'ne' ? (isFlowing ? 'स्टपकक बन्द गर्नुहोस्' : 'स्टपकक खोल्नुहोस्') : (isFlowing ? 'Close stopcock' : 'Open stopcock')}
              onClick={toggleFlow} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleFlow(); } }}
              className={canDispense ? 'cursor-pointer focus:outline focus:outline-2 focus:outline-white' : ''}>
            <rect x="288" y="285" width="62" height="60" rx="8" fill="transparent" />
            <rect x="295" y="308" width="46" height="14" rx="6" fill={isFlowing ? '#10b981' : '#374151'} />
            <circle cx="318" cy="315" r="7" fill={isFlowing ? '#34d399' : '#6b7280'} />
            {isFlowing && <circle cx="318" cy="315" r="7" fill="rgba(52,211,153,0.4)" filter="url(#glow)" />}
            </g>
            </g>

            {/* ── ANIMATED DROPS ── */}
            <AnimatePresence>
              {drops.map(id => (
                <motion.g key={id}>
                  <motion.ellipse
                    cx={318} cy={245}
                    rx={4} ry={6}
                    fill="rgba(96,165,250,0.9)"
                    initial={{ cy: 245, opacity: 0.9, scaleX: 1 }}
                    animate={{ cy: 335, opacity: 0, scaleX: 0.6 }}
                    transition={{ duration: 0.7, ease: 'easeIn' }}
                    filter="url(#glow)"
                  />
                </motion.g>
              ))}
            </AnimatePresence>

            {/* ── WHITE TILE ── */}
            <rect x="275" y="358" width="86" height="14" rx="3" fill="#f1f5f9" />
            <rect x="275" y="358" width="86" height="3"  rx="2" fill="rgba(255,255,255,0.8)" />

            {/* ── CONICAL FLASK (3D glass) ── */}
            <g transform="translate(0 158) scale(1 .56)">
            <defs><clipPath id="titration-flask-clip"><path d="M314 222 L272 358 L368 358 L326 222 Z" /></clipPath></defs>
            {/* Flask shadow */}
            <path d="M318 218 L264 360 L376 360 L322 218 Z" fill="rgba(0,0,0,0.35)" transform="translate(6,6)" />
            {/* Flask neck */}
            <rect x="309" y="175" width="22" height="48" rx="5"
              fill="url(#glassH)" stroke="rgba(147,197,253,0.3)" strokeWidth="1.5" />
            {/* Neck rim */}
            <rect x="305" y="172" width="30" height="8" rx="4" fill="rgba(200,230,255,0.25)" stroke="rgba(147,197,253,0.4)" strokeWidth="1" />
            {/* Neck left highlight */}
            <rect x="311" y="176" width="3" height="44" rx="1.5" fill="rgba(255,255,255,0.28)" />
            {/* Flask liquid fill */}
            {flaskHasHCl && (
              <rect x="270" y={320 - volumeML * 1.1} width="100" height={38 + volumeML * 1.1} fill={flaskColor} clipPath="url(#titration-flask-clip)" />
            )}
            {/* Flask body glass overlay */}
            <path d="M314 222 L272 358 L368 358 L326 222 Z" fill="url(#flaskGlass)" stroke="rgba(147,197,253,0.35)" strokeWidth="1.8" />
            {/* Flask left specular */}
            <path d="M314 225 L279 352" stroke="rgba(255,255,255,0.22)" strokeWidth="5" strokeLinecap="round" />
            {/* Flask right shadow */}
            <path d="M323 225 L363 355" stroke="rgba(0,30,100,0.2)" strokeWidth="4" strokeLinecap="round" />
            {/* Endpoint glow aura */}
            {pH > 8.2 && flaskHasInd && (
              <ellipse cx="318" cy="300" rx="70" ry="60" fill="rgba(236,72,153,0.1)" filter="url(#softGlow)" />
            )}
            </g>

            {/* ── DIGITAL DISPLAY ── */}
            <rect x="420" y="155" width="210" height="200" rx="14" fill="#0f172a" />
            <rect x="424" y="159" width="202" height="192" rx="11" fill="#020617" />
            {/* Volume */}
            <text x="525" y="190" textAnchor="middle" fontSize="9"  fill="#475569" letterSpacing="3" fontFamily="monospace">VOLUME</text>
            <text x="525" y="228" textAnchor="middle" fontSize="34" fill="#60a5fa" fontWeight="700" fontFamily="monospace">{volumeML.toFixed(2)}</text>
            <text x="525" y="244" textAnchor="middle" fontSize="11" fill="#3b82f6" fontFamily="monospace">mL NaOH</text>
            <line x1="434" y1="255" x2="616" y2="255" stroke="#1e3a5f" strokeWidth="1" />
            {/* pH */}
            <text x="525" y="275" textAnchor="middle" fontSize="9"  fill="#475569" letterSpacing="3" fontFamily="monospace">pH VALUE</text>
            <text x="525" y="316" textAnchor="middle" fontSize="38"
              fill={!flaskHasInd ? '#334155' : pH < 7 ? '#34d399' : pH < 8.2 ? '#facc15' : '#f472b6'}
              fontWeight="700" fontFamily="monospace">
              {flaskHasInd ? pH.toFixed(2) : '--.-'}
            </text>
            {isDone && !isOvershot && (
              <text x="525" y="342" textAnchor="middle" fontSize="10" fill="#10b981" fontWeight="700">
                ✓ ENDPOINT REACHED
              </text>
            )}
            {isOvershot && (
              <text x="525" y="342" textAnchor="middle" fontSize="10" fill="#f87171" fontWeight="700">
                ⚠ OVERSHOT
              </text>
            )}

            {/* ── RESULT BOX (when done) ── */}
            {isDone && (
              <>
                <rect x="420" y="368" width="210" height="52" rx="10" fill="#022c22" />
                <text x="525" y="388" textAnchor="middle" fontSize="8.5" fill="#6ee7b7" letterSpacing="2">CALCULATED [HCl]</text>
                <text x="525" y="410" textAnchor="middle" fontSize="20" fill="#34d399" fontWeight="700" fontFamily="monospace">
                  {calculatedConc.toFixed(4)} mol/L
                </text>
              </>
            )}
            {activeDropZone === 'burette' && <rect x="285" y="15" width="90" height="230" rx="10" fill="#60a5fa22" stroke="#60a5fa" strokeDasharray="5 5" pointerEvents="none" />}
            {activeDropZone === 'flask' && <rect x="260" y="245" width="125" height="120" rx="10" fill="#f472b622" stroke="#f472b6" strokeDasharray="5 5" pointerEvents="none" />}
          </svg>
        </div>

        {/* ── TITRATION CONTROLS (bottom bar) ── */}
        <div className="px-4 py-3 bg-slate-900/80 backdrop-blur border-t border-white/5 flex items-center gap-3 flex-wrap">
          {canDispense && (
            <>
              {/* Drop rate */}
              <div className="flex items-center gap-1.5">
                {(['slow', 'medium', 'fast'] as DropRate[]).map(r => (
                  <button key={r} onClick={() => setDropRate(r)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${dropRate === r ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
                    {r === 'slow' ? '🐢 Slow' : r === 'medium' ? '⚡ Medium' : '🚀 Fast'}
                  </button>
                ))}
              </div>
              <div className="h-4 w-px bg-white/10" />
              {/* Stopcock toggle */}
              <button onClick={toggleFlow} aria-pressed={isFlowing}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${isFlowing ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                {isFlowing ? <><Pause className="h-3.5 w-3.5" /> Stop Flow</> : <><Play className="h-3.5 w-3.5" /> Open Stopcock</>}
              </button>
              <button onClick={() => dispense(0.05)} disabled={isFlowing} className="rounded-xl border border-blue-500 px-4 py-2 text-sm text-blue-200 disabled:opacity-40">
                {locale === 'ne' ? 'एक थोपा (+0.05 mL)' : 'Single drop (+0.05 mL)'}
              </button>
              {!isFlowing && (
                <button onClick={markEndpoint}
                  disabled={pH < 8.2}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-600 text-white font-semibold text-sm hover:bg-pink-700 transition-colors disabled:opacity-40">
                  🎯 Mark Endpoint
                </button>
              )}
            </>
          )}
          {isDone && !isDemo && (
            <button onClick={() => setShowReport(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-colors">
              <FileText className="h-4 w-4" /> Generate Lab Report
            </button>
          )}
          {/* Readings */}
          <div className="ml-auto flex flex-wrap items-center gap-4 text-xs font-mono">
            <div className="text-center">
              <div className="text-slate-500">Volume</div>
              <div className="text-blue-400 font-bold text-base">{volumeML.toFixed(2)} mL</div>
            </div>
            <div className="text-center">
              <div className="text-slate-500">pH</div>
              <div className={`font-bold text-base ${!flaskHasInd ? 'text-slate-600' : pH < 7 ? 'text-emerald-400' : pH < 8.2 ? 'text-amber-400' : 'text-pink-400'}`}>
                {flaskHasInd ? pH.toFixed(2) : '--'}
              </div>
            </div>
            {pHCurve.length > 2 && (
              <div className="w-40 h-10">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={pHCurve} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                    <Line type="monotone" dataKey="pH" stroke="#8b5cf6" strokeWidth={1.5} dot={false} />
                    <ReferenceLine y={7} stroke="#f59e0b" strokeDasharray="2 2" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          {/* Skip */}
          <button onClick={skipToEndpoint} className="text-[10px] text-slate-600 hover:text-slate-400 px-2 py-1 border border-dashed border-slate-700 rounded-lg transition-colors ml-1">
            ⚡ Demo
          </button>
          <p role="status" className="w-full text-xs text-slate-300">
            {isOvershot ? (locale === 'ne' ? 'अन्त बिन्दु नाघ्यो। रिसेट गरी अन्त्यमा एक-एक थोपा थप्नुहोस्।' : 'Endpoint overshot. Reset and use single drops near 25 mL.') : feedback}
          </p>
          {ready && !isDone && <p className="w-full text-xs text-slate-400">{locale === 'ne' ? 'समतुल्य बिन्दु: 25.00 mL, pH 7। गुलाबी अन्त बिन्दु त्यसपछि आउँछ (pH 8.2-10)।' : 'Equivalence: 25.00 mL, pH 7. The pink indicator endpoint follows slightly later (transition pH 8.2-10).'}</p>}
        </div>
      </div>

      {/* ══════ RIGHT — EQUIPMENT SHELF ══════ */}
      <div className="w-full lg:w-72 shrink-0 flex flex-col"
        style={{ background: 'linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(17,24,39,0.98) 100%)', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>

        {/* Shelf header */}
        <div className="px-4 pt-4 pb-3 border-b border-white/5">
          <div className="flex items-center gap-2 mb-0.5">
            <Sparkles className="h-3.5 w-3.5 text-violet-400" />
            <span className="text-xs font-bold text-white tracking-widest uppercase">Equipment</span>
          </div>
          <p className="text-[10px] text-slate-500">Drag items onto the apparatus</p>
        </div>

        {/* Equipment items */}
        <div className="flex-1 p-3 space-y-3">
          {EQUIPMENT.map((item) => {
            const used     = usedItems.has(item.id);
            const isTarget = guide.targetId === item.id && !used;
            return (
              <DraggableItem
                key={item.id}
                item={item}
                used={used}
                isTarget={isTarget}
                locale={locale}
                onPlace={() => placeEquipment(item.id)}
                onDragStart={() => setActiveDropZone(item.dropZone)}
                onDragEnd={(point) => {
                  setActiveDropZone(null);
                  handleDrop(item.id, point);
                }}
              />
            );
          })}
        </div>

        {/* AI Guide */}
        <AIGuide guide={guide} locale={locale} />

        {/* pH mini chart */}
        {pHCurve.length > 4 && (
          <div className="px-3 pb-3">
            <div className="text-[10px] text-slate-500 mb-1 font-medium">pH vs Volume Curve</div>
            <div className="bg-slate-900 rounded-xl p-2">
              <ResponsiveContainer width="100%" height={90}>
                <LineChart data={pHCurve} margin={{ top: 4, right: 6, bottom: 10, left: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" />
                  <XAxis dataKey="volume" type="number" domain={[0, 'dataMax']} tick={{ fontSize: 7, fill: '#475569' }} label={{ value: 'V mL', position: 'insideBottom', offset: -6, fontSize: 7, fill: '#475569' }} />
                  <YAxis domain={[0, 14]} tick={{ fontSize: 7, fill: '#475569' }} />
                  <Tooltip formatter={(v) => [v != null ? Number(v).toFixed(2) : '--', 'pH']} contentStyle={{ background: '#0f172a', border: '1px solid #1e3a5f', fontSize: 10, borderRadius: 8 }} />
                  <ReferenceLine y={7}  stroke="#f59e0b" strokeDasharray="2 2" />
                  <ReferenceLine x={25} stroke="#ec4899" strokeDasharray="2 2" />
                  <Line type="monotone" dataKey="pH" stroke="#8b5cf6" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Calculation (when done) */}
        {isDone && (
          <div className="px-3 pb-3">
            <div className="bg-emerald-950/50 border border-emerald-800/50 rounded-xl p-3 font-mono text-xs space-y-1">
              <div className="text-emerald-500/70">M₁V₁ = M₂V₂</div>
              <div className="text-emerald-400">{NAOH_CONC} × {volumeML.toFixed(2)} = [HCl] × {HCL_VOL}</div>
              <div className="text-emerald-300 font-bold">[HCl] = {calculatedConc.toFixed(4)} mol/L</div>
            </div>
          </div>
        )}
      </div>

      {showReport && (
        <LabReport
          experimentId="titration-acid-base"
          data={{ volumeDispensed: volumeML, calculatedConcentration: calculatedConc, endpointPH: pH, pHData: pHCurve }}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}

/* ══════ DRAGGABLE EQUIPMENT ITEM ══════ */
function DraggableItem({
  item, used, isTarget, locale, onDragStart, onDragEnd, onPlace,
}: {
  item: Equipment; used: boolean; isTarget: boolean; locale: string;
  onDragStart: () => void;
  onDragEnd: (point: { x: number; y: number }) => void;
  onPlace: () => void;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [expanded, setExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div className="relative">
      {/* Pulsing ring for target item */}
      {isTarget && !used && (
        <motion.div
          className="absolute inset-0 rounded-2xl ring-2 ring-violet-400/70 pointer-events-none"
          animate={{ opacity: [0.5, 1, 0.5], scale: [0.98, 1.01, 0.98] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      <motion.div
        drag={!used && isTarget}
        dragSnapToOrigin={true}
        dragElastic={0.15}
        whileDrag={{ scale: 1.08, zIndex: 999 }}
        whileHover={!used ? { scale: 1.02 } : {}}
        onDragStart={() => { setIsDragging(true); onDragStart(); }}
        onDragEnd={(_, info) => { setIsDragging(false); onDragEnd(info.point); }}
        className={`relative rounded-2xl overflow-hidden transition-opacity ${used ? 'opacity-35 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}`}
        style={{
          x, y, zIndex: isDragging ? 999 : 1, touchAction: 'none',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
          border: `1px solid ${isTarget && !used ? 'rgba(167,139,250,0.5)' : 'rgba(255,255,255,0.07)'}`,
          boxShadow: isTarget && !used ? '0 0 20px rgba(167,139,250,0.15), inset 0 1px 0 rgba(255,255,255,0.08)' : 'inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-3 p-3">
          {/* 3D equipment icon */}
          <div className="flex-shrink-0">
            <EquipmentSVG id={item.id} used={used} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-white truncate">
              {locale === 'ne' ? item.nameNe : item.nameEn}
            </div>
            <div className="text-[10px] text-slate-500 truncate">
              {locale === 'ne' ? item.nameEn : item.nameEn}
            </div>
            {used && <div className="text-[10px] text-emerald-500 mt-0.5 font-semibold">✓ Added</div>}
          </div>

          {/* Info toggle */}
          {!used && (
            <button aria-label={`Information: ${locale === 'ne' ? item.nameNe : item.nameEn}`} aria-expanded={expanded} onClick={(e) => { e.stopPropagation(); setExpanded(p => !p); }}
              className="flex-shrink-0 p-1 rounded-lg hover:bg-white/10 transition-colors text-slate-500 hover:text-slate-300">
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          )}
        </div>

        {/* Drop target badge */}
        {!used && (
          <div className="px-3 pb-2.5 flex items-center gap-1.5">
            <span className="text-[9px] text-slate-600">Drop on:</span>
            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${item.dropZone === 'burette' ? 'bg-blue-900/50 text-blue-400' : 'bg-pink-900/50 text-pink-400'}`}>
              {item.dropZone === 'burette' ? '⬡ Burette' : '◇ Flask'}
            </span>
          </div>
        )}

        {/* Info panel */}
        <AnimatePresence>
          {expanded && !used && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3 text-[10px] text-slate-400 leading-relaxed border-t border-white/5 pt-2 mt-1">
                {item.descEn}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <button onClick={onPlace} disabled={used || !isTarget}
        className="mt-2 w-full rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-200 focus-visible:outline-2 focus-visible:outline-white disabled:opacity-40">
        {locale === 'ne' ? `${item.nameNe} ${item.dropZone === 'burette' ? 'ब्यूरेटमा' : 'फ्लास्कमा'} राख्नुहोस्` : `Place ${item.nameEn} in ${item.dropZone}`}
      </button>
    </div>
  );
}

/* ══════ EQUIPMENT SVGs (3D glass look) ══════ */
function EquipmentSVG({ id, used }: { id: string; used: boolean }) {
  const opacity = used ? 0.4 : 1;
  if (id === 'naoh-bottle') return (
    <svg viewBox="0 0 54 90" width="40" height="67" style={{ opacity }}>
      <defs>
        <linearGradient id="nb-body" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#1e3a8a" stopOpacity="0.95"/>
          <stop offset="25%"  stopColor="#2563eb" stopOpacity="0.8"/>
          <stop offset="60%"  stopColor="#3b82f6" stopOpacity="0.7"/>
          <stop offset="100%" stopColor="#1e40af" stopOpacity="0.9"/>
        </linearGradient>
        <linearGradient id="nb-liquid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#60a5fa" stopOpacity="0.85"/>
          <stop offset="100%" stopColor="#2563eb" stopOpacity="0.7"/>
        </linearGradient>
      </defs>
      {/* Cap */}
      <rect x="14" y="4" width="26" height="10" rx="4" fill="#1e3a8a" />
      {/* Neck */}
      <rect x="17" y="13" width="20" height="14" rx="3" fill="url(#nb-body)" />
      {/* Body */}
      <rect x="8"  y="26" width="38" height="58" rx="7" fill="url(#nb-body)" />
      {/* Liquid */}
      <rect x="10" y="40" width="34" height="42" rx="5" fill="url(#nb-liquid)" />
      {/* Highlight */}
      <rect x="11" y="28" width="5"  height="54" rx="2.5" fill="rgba(255,255,255,0.25)" />
      {/* Label */}
      <rect x="12" y="46" width="30" height="24" rx="3" fill="white" opacity="0.9"/>
      <text x="27" y="58" textAnchor="middle" fontSize="7"   fill="#1e40af" fontWeight="800">NaOH</text>
      <text x="27" y="66" textAnchor="middle" fontSize="5.5" fill="#3b82f6">0.1 mol/L</text>
    </svg>
  );
  if (id === 'hcl-beaker') return (
    <svg viewBox="0 0 60 75" width="44" height="56" style={{ opacity }}>
      <defs>
        <linearGradient id="bk-glass" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.45)"/>
          <stop offset="20%"  stopColor="rgba(200,240,255,0.18)"/>
          <stop offset="80%"  stopColor="rgba(180,220,255,0.08)"/>
          <stop offset="100%" stopColor="rgba(100,160,220,0.35)"/>
        </linearGradient>
        <linearGradient id="bk-liq" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgba(186,230,253,0.5)"/>
          <stop offset="100%" stopColor="rgba(147,197,253,0.35)"/>
        </linearGradient>
      </defs>
      {/* Beaker body */}
      <rect x="8" y="10" width="44" height="58" rx="4" fill="url(#bk-glass)" stroke="rgba(147,197,253,0.4)" strokeWidth="1.5" />
      {/* Liquid */}
      <rect x="10" y="28" width="40" height="38" rx="3" fill="url(#bk-liq)" />
      {/* Highlight */}
      <rect x="10" y="12" width="4" height="54" rx="2" fill="rgba(255,255,255,0.28)" />
      {/* Spout */}
      <path d="M46 10 L56 6 L56 14 L46 14 Z" fill="rgba(200,230,255,0.3)" stroke="rgba(147,197,253,0.4)" strokeWidth="1" />
      {/* Measurement lines */}
      {[0,1,2].map(i => <line key={i} x1="42" y1={32 + i * 12} x2="50" y2={32 + i * 12} stroke="rgba(147,197,253,0.5)" strokeWidth="1"/>)}
      {/* Label */}
      <text x="30" y="24" textAnchor="middle" fontSize="8"   fill="rgba(30,64,175,0.8)" fontWeight="700">HCl</text>
      <text x="30" y="22" textAnchor="middle" fontSize="5.5" fill="rgba(59,130,246,0.7)">0.1M</text>
    </svg>
  );
  if (id === 'phph-bottle') return (
    <svg viewBox="0 0 44 82" width="32" height="60" style={{ opacity }}>
      <defs>
        <linearGradient id="pp-body" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#86198f" stopOpacity="0.9"/>
          <stop offset="40%"  stopColor="#a21caf" stopOpacity="0.75"/>
          <stop offset="100%" stopColor="#701a75" stopOpacity="0.9"/>
        </linearGradient>
      </defs>
      {/* Dropper tip */}
      <ellipse cx="22" cy="6" rx="5" ry="6" fill="#be185d" />
      {/* Neck */}
      <rect x="15" y="11" width="14" height="12" rx="3" fill="url(#pp-body)" />
      {/* Body */}
      <rect x="6"  y="22" width="32" height="54" rx="8" fill="url(#pp-body)" />
      {/* Liquid */}
      <rect x="8"  y="34" width="28" height="40" rx="6" fill="rgba(236,72,153,0.45)" />
      {/* Highlight */}
      <rect x="9"  y="24" width="4"  height="48" rx="2" fill="rgba(255,255,255,0.22)" />
      {/* Label */}
      <rect x="9"  y="42" width="26" height="22" rx="3" fill="white" opacity="0.88"/>
      <text x="22" y="52" textAnchor="middle" fontSize="5.5" fill="#86198f" fontWeight="800">PhPh</text>
      <text x="22" y="61" textAnchor="middle" fontSize="4.5" fill="#a21caf">Indicator</text>
    </svg>
  );
  return null;
}

/* ══════ AI GUIDE ══════ */
function AIGuide({ guide, locale }: { guide: GuideStep; locale: string }) {
  const [showWhy, setShowWhy] = useState(false);

  return (
    <div className="mx-3 mb-3 rounded-2xl overflow-hidden"
      style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(168,85,247,0.1) 100%)', border: '1px solid rgba(99,102,241,0.2)' }}>

      {/* Header */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <motion.div
          animate={{ scale: [1, 1.15, 1], rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          className="text-xl">🧪</motion.div>
        <div>
          <div className="text-[10px] text-violet-400 font-bold tracking-widest uppercase">AI Guide</div>
          <div className="text-xs font-semibold text-white leading-tight">
            {locale === 'ne' ? guide.titleNe : guide.titleEn}
          </div>
        </div>
      </div>

      {/* Instruction */}
      <div className="px-3 pb-2">
        <p className="text-[11px] text-slate-300 leading-relaxed">
          {locale === 'ne' ? guide.textNe : guide.textEn}
        </p>
      </div>

      {/* Why button */}
      <button onClick={() => setShowWhy(p => !p)}
        className="w-full flex items-center justify-between px-3 py-2 text-[10px] text-violet-400 hover:bg-white/5 transition-colors border-t border-white/5">
        <span>💡 Why do we do this?</span>
        {showWhy ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      <AnimatePresence>
        {showWhy && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden">
            <p className="px-3 pb-3 text-[10px] text-slate-400 leading-relaxed">
              {locale === 'ne' ? guide.whyNe : guide.whyEn}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
