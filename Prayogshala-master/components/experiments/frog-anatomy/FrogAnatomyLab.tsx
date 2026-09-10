'use client';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, HelpCircle, X, Pin, Scissors, MousePointer2, Search, Check } from 'lucide-react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { useT } from '@/hooks/useTranslation';
import DraggableSVG, { type Point } from '@/components/lab/DraggableSVG';

type Stage = 'pin' | 'incision' | 'retract' | 'muscle' | 'inspect';
type Tool = 'pins' | 'scalpel' | 'forceps' | 'probe';

const STAGES: { id: Stage; label: string; tool: Tool; goal: string }[] = [
  { id: 'pin', label: 'Secure specimen', tool: 'pins', goal: 'Select Pins. Place one pin at each of the four numbered limb targets on the tray.' },
  { id: 'incision', label: 'Skin incision', tool: 'scalpel', goal: 'Select Scalpel. Press at START and drag down the dashed midline to END. Stay inside the guide; resume at the highlighted tip if interrupted.' },
  { id: 'retract', label: 'Retract skin', tool: 'forceps', goal: 'Select Forceps. Drag each skin flap handle outward into its matching side target, then release.' },
  { id: 'muscle', label: 'Open body wall', tool: 'scalpel', goal: 'Skin is retracted; the muscle wall still covers the cavity. Select Scalpel and trace the shorter midline guide to open this schematic wall.' },
  { id: 'inspect', label: 'Inspect organs', tool: 'probe', goal: 'Cavity revealed. Select Probe, then inspect each of the seven organs in the diagram or list. The identification quiz is now available.' },
];
const TOOLS = [
  { id: 'pins' as const, label: 'Pins', Icon: Pin },
  { id: 'scalpel' as const, label: 'Scalpel', Icon: Scissors },
  { id: 'forceps' as const, label: 'Forceps', Icon: MousePointer2 },
  { id: 'probe' as const, label: 'Probe', Icon: Search },
];
const PIN_TARGETS = [{ x: 208, y: 244 }, { x: 392, y: 244 }, { x: 201, y: 389 }, { x: 399, y: 389 }];

interface Organ {
  id: string;
  path: string;
  color: string;
  hoverColor: string;
  labelX: number;
  labelY: number;
  nameEn: string;
  nameNe: string;
  infoKey: 'heart' | 'liver' | 'lungs' | 'stomach' | 'intestine' | 'kidney' | 'bladder';
}

const ORGANS: Organ[] = [
  {
    id: 'heart', nameEn: 'Heart', nameNe: 'मुटु',
    path: 'M 300 185 C 290 170 270 168 270 185 C 270 198 300 215 300 215 C 300 215 330 198 330 185 C 330 168 310 170 300 185 Z',
    color: '#ef4444', hoverColor: '#dc2626', labelX: 300, labelY: 225,
    infoKey: 'heart',
  },
  {
    id: 'liver', nameEn: 'Liver', nameNe: 'कलेजो',
    path: 'M 270 230 Q 260 225 255 235 Q 250 250 260 262 Q 280 270 310 265 Q 330 260 325 245 Q 320 230 300 228 Z',
    color: '#b45309', hoverColor: '#92400e', labelX: 285, labelY: 280,
    infoKey: 'liver',
  },
  {
    id: 'lungs', nameEn: 'Lungs', nameNe: 'फोक्सो',
    path: 'M 265 188 Q 250 185 248 200 Q 246 215 258 220 Q 272 225 278 215 Q 282 205 275 195 Z M 335 188 Q 350 185 352 200 Q 354 215 342 220 Q 328 225 322 215 Q 318 205 325 195 Z',
    color: '#f97316', hoverColor: '#ea580c', labelX: 300, labelY: 175,
    infoKey: 'lungs',
  },
  {
    id: 'stomach', nameEn: 'Stomach', nameNe: 'पेट',
    path: 'M 275 268 Q 262 268 258 280 Q 254 295 265 305 Q 278 312 295 308 Q 308 304 310 290 Q 312 276 300 270 Z',
    color: '#8b5cf6', hoverColor: '#7c3aed', labelX: 258, labelY: 315,
    infoKey: 'stomach',
  },
  {
    id: 'intestine', nameEn: 'Small Intestine', nameNe: 'सानो आन्द्रा',
    path: 'M 295 305 Q 315 295 330 310 Q 345 325 335 342 Q 322 355 305 350 Q 288 345 285 330 Q 285 318 295 315 Z M 310 348 Q 330 348 340 360 Q 348 372 338 380 Q 325 385 308 380 Q 295 373 295 360 Z',
    color: '#6366f1', hoverColor: '#4f46e5', labelX: 345, labelY: 340,
    infoKey: 'intestine',
  },
  {
    id: 'kidney', nameEn: 'Kidneys', nameNe: 'मिर्गौला',
    path: 'M 248 295 Q 238 290 235 302 Q 232 315 240 322 Q 250 328 258 320 Q 265 313 260 300 Z M 352 295 Q 362 290 365 302 Q 368 315 360 322 Q 350 328 342 320 Q 335 313 340 300 Z',
    color: '#7c3aed', hoverColor: '#6d28d9', labelX: 240, labelY: 335,
    infoKey: 'kidney',
  },
  {
    id: 'bladder', nameEn: 'Urinary Bladder', nameNe: 'पिसाब थैली',
    path: 'M 288 372 Q 278 368 275 380 Q 272 392 282 400 Q 295 406 312 402 Q 324 396 322 383 Q 320 370 308 368 Z',
    color: '#0891b2', hoverColor: '#0e7490', labelX: 298, labelY: 414,
    infoKey: 'bladder',
  },
];

const QUIZ_ORGANS = ['heart', 'liver', 'lungs', 'stomach', 'intestine', 'kidney', 'bladder'];

export default function FrogAnatomyLab() {
  const t = useT();
  const { completeExperiment } = useStore();
  const locale = useStore((s) => s.locale);

  const [stage, setStage] = useState<Stage>('pin');
  const [tool, setTool] = useState<Tool>('pins');
  const [pins, setPins] = useState<number[]>([]);
  const [flaps, setFlaps] = useState<string[]>([]);
  const [traceY, setTraceY] = useState(220);
  const [feedback, setFeedback] = useState('Place the four pins to stabilize the specimen.');
  const [heldAt, setHeldAt] = useState<Point | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const trace = useRef<{ pointerId: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hovered, setHovered]       = useState<string | null>(null);
  const [selected, setSelected]     = useState<string | null>(null);
  const [quizMode, setQuizMode]     = useState(false);
  const [quizOrgan, setQuizOrgan]   = useState<string>(QUIZ_ORGANS[0]);
  const [quizResult, setQuizResult] = useState<'correct' | 'wrong' | null>(null);
  const [quizScore, setQuizScore]   = useState({ correct: 0, total: 0 });
  const [explored, setExplored]     = useState<string[]>([]);
  const [isDone, setIsDone]         = useState(false);
  const quizTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (quizTimer.current !== null) clearTimeout(quizTimer.current);
    trace.current = null;
  }, []);

  const selectedOrgan = ORGANS.find((o) => o.id === selected);

  const stageIndex = STAGES.findIndex((item) => item.id === stage);
  const currentStage = STAGES[stageIndex];
  const exposed = stage === 'inspect';
  const tracing = stage === 'incision' || stage === 'muscle';
  const traceStart = stage === 'muscle' ? 265 : 220;
  const traceEnd = stage === 'muscle' ? 335 : 380;

  const cancelTrace = () => {
    const active = trace.current;
    trace.current = null;
    if (active && svgRef.current?.hasPointerCapture(active.pointerId)) {
      svgRef.current.releasePointerCapture(active.pointerId);
    }
  };

  const chooseTool = (next: Tool) => {
    cancelTrace();
    setHeldAt(null);
    setTool(next);
    setFeedback(next === currentStage.tool
      ? `${TOOLS.find((item) => item.id === next)?.label} selected. ${currentStage.goal}`
      : `This step needs ${currentStage.tool}. Your selected tool cannot advance it.`);
  };

  const placePin = (index: number) => {
    if (stage !== 'pin' || tool !== 'pins') {
      setFeedback(stage === 'pin' ? 'Select Pins before securing a target.' : 'The specimen is already secured. Follow the current goal.');
      return;
    }
    if (pins.includes(index)) { setFeedback('This target already has a pin. Use an empty numbered target.'); return; }
    const next = [...pins, index];
    setPins(next);
    if (next.length === PIN_TARGETS.length) {
      setStage('incision');
      setFeedback('All four pins are placed. Select Scalpel to trace the skin incision.');
    } else setFeedback(`Pin ${index + 1} secured. ${PIN_TARGETS.length - next.length} targets remain.`);
  };

  const retractFlap = (side: string, point: Point) => {
    if (stage !== 'retract' || tool !== 'forceps') {
      setFeedback('Select Forceps after completing the skin incision.');
      return;
    }
    const targetX = side === 'left' ? 222 : 378;
    if (Math.abs(point.x - targetX) > 18 || Math.abs(point.y - 300) > 25) {
      setFeedback(`Release the ${side} flap inside its outlined side target. It has returned to the incision.`);
      return;
    }
    if (flaps.includes(side)) return;
    const next = [...flaps, side];
    setFlaps(next);
    if (next.length === 2) {
      setStage('muscle');
      setTraceY(265);
      setFeedback('Both skin flaps are held aside. The muscle layer is visible, not the organs. Select Scalpel for the short second opening.');
    } else setFeedback(`${side === 'left' ? 'Left' : 'Right'} skin flap secured aside. Retract the other flap.`);
  };

  // Both pointer and keyboard tracing advance the same geometric midline tip.
  const advanceTrace = (point: Point, previousY: number) => {
    if (!tracing || tool !== 'scalpel') return;
    if (Math.abs(point.x - 300) > 12 || point.y < previousY - 14 || point.y > traceEnd + 16) {
      cancelTrace();
      setFeedback('Keep the scalpel inside the guide and move downward. Resume at the highlighted tip; completed tracing is saved.');
      return;
    }
    const nextY = point.y >= traceEnd - 3 ? traceEnd : Math.max(previousY, point.y);
    setTraceY(nextY);
    if (trace.current) trace.current.y = nextY;
    if (nextY >= traceEnd) {
      cancelTrace();
      if (stage === 'incision') {
        setStage('retract');
        setFeedback('Skin incision complete. Select Forceps and pull each flap to its side target.');
      } else {
        setStage('inspect');
        setFeedback('Body wall opened. Select Probe to inspect the seven organs.');
      }
    }
  };

  const svgPoint = (event: PointerEvent<SVGSVGElement>): Point | null => {
    const matrix = event.currentTarget.getScreenCTM();
    return matrix ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()) : null;
  };

  const stopQuiz = () => {
    if (quizTimer.current !== null) clearTimeout(quizTimer.current);
    quizTimer.current = null;
    setQuizMode(false);
    setQuizResult(null);
    setSelected(null);
    setHovered(null);
  };

  const startQuiz = () => {
    if (!exposed) return;
    stopQuiz();
    const randomOrgan = QUIZ_ORGANS[Math.floor(Math.random() * QUIZ_ORGANS.length)];
    setQuizOrgan(randomOrgan);
    setQuizScore({ correct: 0, total: 0 });
    setQuizMode(true);
    chooseTool('probe');
  };

  const handleQuizAnswer = (organId: string) => {
    // Lock synchronously so rapid clicks cannot score or schedule twice.
    if (!quizMode || quizTimer.current !== null) return;
    const correct = organId === quizOrgan;
    setQuizResult(correct ? 'correct' : 'wrong');
    setQuizScore((s) => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
    quizTimer.current = setTimeout(() => {
      if (correct) {
        const next = QUIZ_ORGANS[Math.floor(Math.random() * QUIZ_ORGANS.length)];
        setQuizOrgan(next);
      }
      setQuizResult(null);
      quizTimer.current = null;
    }, 1200);
  };

  const handleOrganSelect = (organId: string) => {
    if (!exposed || tool !== 'probe') {
      setFeedback(exposed ? 'Select Probe to inspect or identify an organ.' : 'Finish the procedure before inspecting organs.');
      return;
    }
    if (quizMode) {
      handleQuizAnswer(organId);
      return;
    }
    setSelected(selected === organId ? null : organId);
    const organ = ORGANS.find((item) => item.id === organId);
    setFeedback(selected === organId
      ? 'Organ information closed. Select another organ with the probe.'
      : `Inspecting ${organ?.nameEn}. Read its function in the information card below the tray.`);
    if (explored.includes(organId)) return;
    const nextExplored = [...explored, organId];
    setExplored(nextExplored);
    if (exposed && nextExplored.length === ORGANS.length && !isDone) {
      completeExperiment('frog-anatomy', 100);
      setIsDone(true);
    }
  };

  const resetLab = () => {
    stopQuiz();
    cancelTrace();
    setStage('pin');
    setTool('pins');
    setPins([]);
    setFlaps([]);
    setTraceY(220);
    setHeldAt(null);
    setResetKey((key) => key + 1);
    setFeedback('Lab reset. Place the four pins to stabilize the specimen.');
    setQuizOrgan(QUIZ_ORGANS[0]);
    setQuizScore({ correct: 0, total: 0 });
    setExplored([]);
    setIsDone(false);
  };

  return (
    <div className="flex flex-col lg:flex-row lg:h-[calc(100dvh-64px)] lg:overflow-hidden">

      {/* ===================== FROG SVG ===================== */}
      <div className="relative flex flex-col min-w-0 shrink-0 lg:flex-1 lg:min-h-0 bg-gradient-to-b from-slate-900 to-slate-800 overflow-hidden">

        <Link href="/lab" className="absolute top-3 left-3 z-10 flex items-center gap-1 text-xs text-emerald-400 hover:text-white bg-emerald-900/80 rounded-full px-2.5 py-1.5 backdrop-blur">
          <ChevronLeft className="h-3 w-3" /> Back
        </Link>

        <div className="absolute top-14 inset-x-3 z-10 text-center pointer-events-none">
          <p className="text-xs uppercase tracking-widest text-slate-400">Virtual dissection tray</p>
          <p className="mt-1 text-sm text-teal-200">{stageIndex + 1} / 5: {currentStage.label}</p>
          <p className="mt-1 text-xs text-slate-300">Holding: {TOOLS.find((item) => item.id === tool)?.label}</p>
        </div>

        <svg ref={svgRef} viewBox="145 120 310 340" role="group" aria-label={t('frog.title')}
          className="block w-full h-[540px] sm:h-[620px] lg:flex-1 lg:min-h-0 lg:h-auto pt-32 pb-4"
          style={{ touchAction: tracing ? 'none' : 'pan-y', cursor: tool === 'forceps' ? 'grab' : 'crosshair' }}
          onPointerDown={(event) => {
            if (event.button !== 0 || trace.current || (event.target as Element).closest('[data-flap]')) return;
            const point = svgPoint(event);
            if (!point) return;
            setHeldAt(point);
            if (!tracing) {
              if (event.target === event.currentTarget || !(event.target as Element).closest('[role="button"]'))
                setFeedback(`No action here. ${currentStage.goal}`);
              return;
            }
            if (tool !== 'scalpel') { setFeedback('Select Scalpel to trace this guide.'); return; }
            if (Math.abs(point.x - 300) > 12 || Math.abs(point.y - traceY) > 14) {
              setFeedback('Begin at the highlighted incision tip, not elsewhere on the specimen.');
              return;
            }
            trace.current = { pointerId: event.pointerId, y: traceY };
            event.currentTarget.setPointerCapture(event.pointerId);
            event.preventDefault();
            setFeedback('Tracing: keep the blade on the dashed midline and move toward END.');
          }}
          onPointerMove={(event) => {
            const point = svgPoint(event);
            if (!point) return;
            setHeldAt(point);
            if (trace.current?.pointerId === event.pointerId) advanceTrace(point, trace.current.y);
          }}
          onPointerUp={(event) => {
            if (event.pointerType === 'touch') setHeldAt(null);
            if (trace.current?.pointerId !== event.pointerId) return;
            cancelTrace();
            setFeedback('Trace paused. Resume at the highlighted tip to finish the incision.');
          }}
          onPointerCancel={() => { if (trace.current) setFeedback('Trace cancelled. Resume at the highlighted tip.'); cancelTrace(); setHeldAt(null); }}
          onLostPointerCapture={() => { trace.current = null; }}
          onPointerLeave={() => setHeldAt(null)}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && trace.current) {
              cancelTrace();
              setFeedback('Trace paused. Resume at the highlighted tip.');
            }
          }}
        >
          <rect x="150" y="125" width="300" height="330" rx="18" fill="#334155" stroke="#64748b" strokeWidth="3" />
          <rect x="160" y="135" width="280" height="310" rx="12" fill="#253b40" stroke="#475569" />
          <text x="174" y="438" fontSize="7" fill="#94a3b8">VENTRAL VIEW / SCHEMATIC</text>
          <g fill="#819680" stroke="#a3b39c" strokeWidth="1">
            <path d="M 245 235 Q 219 221 201 239 L 197 254 Q 222 268 250 261 Z" />
            <path d="M 355 235 Q 381 221 399 239 L 403 254 Q 378 268 350 261 Z" />
            <path d="M 245 356 Q 210 351 190 386 L 182 408 Q 200 422 215 395 L 265 381 Z" />
            <path d="M 355 356 Q 390 351 410 386 L 418 408 Q 400 422 385 395 L 335 381 Z" />
            <ellipse cx="300" cy="300" rx="85" ry="120" />
            <ellipse cx="300" cy="180" rx="57" ry="38" />
          </g>
          <path d="M 262 184 Q 300 195 338 184" fill="none" stroke="#536957" />
          <g fill="#33433c"><ellipse cx="267" cy="163" rx="7" ry="5" /><ellipse cx="333" cy="163" rx="7" ry="5" /></g>

          {(stage === 'retract' || stage === 'muscle' || exposed) && (
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
              <ellipse cx="300" cy="295" rx="72" ry="117" fill={exposed ? '#182c32' : '#b3a694'} stroke="#c6bba9" />
              {!exposed && <g stroke="#867a6b" strokeWidth="1" opacity="0.6">
                {[225, 240, 255, 270, 285, 300, 315, 330, 345, 360, 375].map((y) => <path key={y} d={`M 245 ${y} Q 275 ${y + 10} 300 ${y} Q 325 ${y + 10} 355 ${y}`} fill="none" />)}
              </g>}
              {stage === 'muscle' && <text x="300" y="245" textAnchor="middle" fontSize="8" fill="#302d28">Abdominal muscle wall</text>}
            </motion.g>
          )}

          {exposed && ORGANS.map((organ) => {
            const isHovered   = !quizMode && hovered === organ.id;
            const isSelected  = !quizMode && selected === organ.id;
            const fill = isSelected || isHovered
              ? organ.hoverColor
              : organ.color;

            return (
              <g key={organ.id}
                role="button"
                tabIndex={0}
                aria-label={locale === 'ne' ? organ.nameNe : organ.nameEn}
                aria-pressed={quizMode ? undefined : isSelected}
                aria-disabled={quizMode && quizResult !== null}
                className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                onMouseEnter={() => !quizMode && setHovered(organ.id)}
                onMouseLeave={() => !quizMode && setHovered(null)}
                onClick={(event) => { event.stopPropagation(); handleOrganSelect(organ.id); }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    if (!event.repeat) handleOrganSelect(organ.id);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <motion.path
                  d={organ.path}
                  fill={fill}
                  stroke={isSelected ? 'white' : 'rgba(255,255,255,0.3)'}
                  strokeWidth={isSelected ? 2 : 1}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, scale: isHovered ? 1.05 : 1 }}
                  transition={{ duration: 0.25 }}
                  style={{ transformOrigin: `${organ.labelX}px ${organ.labelY}px` }}
                />
                {/* Organ label on hover */}
                {(isHovered || isSelected) && !quizMode && (
                  <g pointerEvents="none">
                    <rect x={organ.labelX - 44} y={organ.labelY - 12} width="88" height="22" rx="5" fill="rgba(0,0,0,0.85)" />
                    <text x={organ.labelX} y={organ.labelY + 4} textAnchor="middle" fontSize="9.5" fill="white" fontWeight="600">
                      {locale === 'ne' ? organ.nameNe : organ.nameEn}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {(stage === 'retract' || stage === 'muscle' || exposed) && ['left', 'right'].map((side) => {
            const left = side === 'left';
            const secured = flaps.includes(side);
            return <g key={`${resetKey}-${side}-${tool}`} data-flap="true"
              onPointerDown={() => {
                if (stage === 'retract' && tool !== 'forceps') setFeedback('Select Forceps before dragging a skin flap.');
                else if (secured) setFeedback('This flap is already secured aside. Follow the current goal.');
              }}>
              {stage === 'retract' && !secured && <rect x={left ? 204 : 360} y="275" width="36" height="50" rx="10" fill="#5eead4" fillOpacity="0.08" stroke="#5eead4" strokeDasharray="3 3" />}
              <DraggableSVG x={secured ? (left ? 222 : 378) : (left ? 286 : 314)} y={300}
                label={`${left ? 'Left' : 'Right'} skin flap: arrow keys move, Enter releases, Escape cancels`}
                disabled={stage !== 'retract' || tool !== 'forceps' || secured}
                onDrop={(point) => retractFlap(side, point)}>
                <path d={left ? 'M 0 -83 Q -52 -55 -49 0 Q -49 57 0 83 Z' : 'M 0 -83 Q 52 -55 49 0 Q 49 57 0 83 Z'}
                  fill="#819680" stroke="#b2c1a9" opacity={secured ? 0.65 : 1} style={{ transition: 'opacity 250ms' }} />
                <circle r="13" fill={secured ? '#3d716b' : '#e2e8d8'} stroke="#365b55" />
                <text y="3" textAnchor="middle" fontSize="9" fill="#163b36" pointerEvents="none">{secured ? 'SET' : left ? 'L' : 'R'}</text>
              </DraggableSVG>
            </g>;
          })}

          {tracing && <g pointerEvents="none">
            <path d={`M 300 ${traceStart} V ${traceEnd}`} stroke="#f1f5f9" strokeOpacity="0.13" strokeWidth="24" />
            <path d={`M 300 ${traceStart} V ${traceEnd}`} stroke="#e2e8f0" strokeWidth="2" strokeDasharray="4 4" />
            <path d={`M 300 ${traceStart} V ${traceY}`} stroke="#5eead4" strokeWidth="3" />
            <circle cx="300" cy={traceY} r="7" fill="#0f766e" stroke="#99f6e4" strokeWidth="2" />
            <text x="314" y={traceStart + 3} fontSize="8" fill="#f1f5f9">START</text>
            <text x="314" y={traceEnd + 3} fontSize="8" fill="#f1f5f9">END</text>
          </g>}
          {PIN_TARGETS.map((point, index) => <g key={index} role="button" tabIndex={stage === 'pin' ? 0 : -1}
            aria-label={`Place pin ${index + 1}`} aria-pressed={pins.includes(index)}
            onClick={(event) => { event.stopPropagation(); placePin(index); }}
            onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (!event.repeat) placePin(index); } }}
            className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
            <circle cx={point.x} cy={point.y} r="15" fill={pins.includes(index) ? '#326961' : '#243b40'} stroke="#b3cdc6" strokeDasharray={pins.includes(index) ? undefined : '3 3'} />
            {pins.includes(index) ? <g pointerEvents="none"><path d={`M ${point.x} ${point.y + 8} l 5 -18`} stroke="#e2e8f0" strokeWidth="2" /><circle cx={point.x + 5} cy={point.y - 10} r="5" fill="#99b7b0" /></g>
              : <text x={point.x} y={point.y + 4} textAnchor="middle" fontSize="11" fill="#e2e8f0" pointerEvents="none">{index + 1}</text>}
          </g>)}
          {heldAt && <g transform={`translate(${heldAt.x} ${heldAt.y})`} pointerEvents="none" aria-hidden="true" stroke="#f1f5f9" strokeWidth="2" fill="none">
            {tool === 'pins' && <><path d="M 0 0 L 9 -24" /><circle cx="9" cy="-24" r="4" fill="#99b7b0" /></>}
            {tool === 'scalpel' && <><path d="M 0 0 L 10 -15 L 19 -32" strokeWidth="4" /><path d="M 0 0 L 2 -12 L 10 -15 Z" fill="#cbd5e1" /></>}
            {tool === 'forceps' && <path d="M -4 0 L 7 -29 Q 10 -33 12 -28 L 4 0" />}
            {tool === 'probe' && <><path d="M 0 0 L 12 -27" /><circle r="2" fill="#99f6e4" /></>}
          </g>}
        </svg>

        {/* Organ info card */}
        <AnimatePresence>
          {selected && selectedOrgan && !quizMode && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              role="status"
              className="relative shrink-0 mx-auto mb-4 w-80 max-w-[calc(100%-2rem)] bg-gray-900/95 backdrop-blur-sm rounded-2xl p-4 border border-emerald-800/50"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-bold text-white">{selectedOrgan.nameEn}</div>
                  <div className="text-emerald-400 text-sm">{selectedOrgan.nameNe}</div>
                </div>
                <button onClick={() => setSelected(null)} aria-label={locale === 'ne' ? 'जानकारी बन्द गर्नुहोस्' : 'Close organ information'} className="text-gray-500 hover:text-gray-300">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-gray-300 text-xs leading-relaxed">
                {t(`frog.info.${selectedOrgan.infoKey}` as keyof ReturnType<typeof useT>)}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quiz result feedback */}
        <AnimatePresence>
          {quizResult && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              role="status"
              className={`pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center rounded-2xl p-5 shadow-2xl ${quizResult === 'correct' ? 'bg-teal-800' : 'bg-amber-900'}`}
            >
              <div className="text-white font-bold text-xl">
                {quizResult === 'correct' ? t('frog.quiz.correct') : t('frog.quiz.wrong')}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ===================== CONTROLS ===================== */}
      <div className="lg:w-80 min-h-0 shrink-0 bg-gray-900 text-white border-t lg:border-t-0 lg:border-l border-gray-700 lg:overflow-y-auto flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h2 className="font-bold text-base">{t('frog.title')}</h2>
          <p className="text-gray-400 text-xs mt-0.5">{t('frog.subtitle')}</p>
          <p role="status" className="text-emerald-400 text-xs mt-3">
            {locale === 'ne' ? 'अध्ययन गरिएका अङ्गहरू' : 'Organs explored'}: {explored.length}/{ORGANS.length}
          </p>
          <p className="text-gray-400 text-xs mt-1">
            Finish the procedure, then use the probe to study all seven organs in exploration mode to complete this lab.
          </p>
          <button onClick={resetLab} className="mt-3 rounded-xl bg-gray-800 px-3 py-2 text-xs hover:bg-gray-700">
            {locale === 'ne' ? 'फेरि सुरु गर्नुहोस्' : 'Reset lab'}
          </button>
        </div>

        <div className="p-4 space-y-4 flex-1">
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Instruments</h3>
            <div className="grid grid-cols-2 gap-2">
              {TOOLS.map(({ id, label, Icon }) => <button key={id} onClick={() => chooseTool(id)} aria-pressed={tool === id}
                className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-sm transition-colors ${tool === id ? 'border-teal-400 bg-teal-900/50 text-teal-100' : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500'}`}>
                <Icon className="h-4 w-4" />{label}
              </button>)}
            </div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-3">
            <h3 className="text-sm font-semibold text-teal-200">Current goal: {currentStage.label}</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-200">{currentStage.goal}</p>
            <p role="status" aria-live="polite" className="mt-3 border-t border-slate-700 pt-3 text-xs leading-relaxed text-teal-200">{feedback}</p>
            <div className="mt-3 text-xs text-slate-400">
              {stage === 'pin' && `${pins.length}/4 pins placed`}
              {tracing && `Guide traced: ${Math.round((traceY - traceStart) / (traceEnd - traceStart) * 100)}%`}
              {stage === 'retract' && `${flaps.length}/2 flaps retracted`}
              {exposed && 'Procedure complete. Exploration and quiz unlocked.'}
            </div>
          </div>

          {!exposed && <details className="rounded-xl border border-slate-700 p-3 text-xs text-slate-300">
            <summary className="cursor-pointer font-semibold">Keyboard / precision controls</summary>
            <p className="my-3 leading-relaxed">Select the required instrument first. Pins: focus a target or its button and press Enter. Trace: focus the trace control and press or hold Arrow Down; Escape pauses. Flaps: focus a flap, use arrow keys to move into its side target, then Enter to release; Escape cancels. The buttons below place or retract at the same validated targets.</p>
            {stage === 'pin' && <div className="grid grid-cols-2 gap-2">{PIN_TARGETS.map((_, index) => <button key={index} onClick={() => placePin(index)} disabled={pins.includes(index)} className="rounded-lg bg-slate-700 px-2 py-3 disabled:opacity-40">Place pin {index + 1}</button>)}</div>}
            {tracing && <button onClick={() => setFeedback('With Scalpel selected, keep this control focused and press or hold Arrow Down to move the tip along the guide.')}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  if (tool !== 'scalpel') { setFeedback('Select Scalpel before tracing.'); return; }
                  cancelTrace();
                  advanceTrace({ x: 300, y: Math.min(traceEnd, traceY + 8) }, traceY);
                } else if (event.key === 'Escape') { cancelTrace(); setFeedback('Keyboard trace paused. Arrow Down resumes at the saved tip.'); }
              }} className="w-full rounded-lg bg-slate-700 px-2 py-3 focus-visible:outline-2 focus-visible:outline-teal-300">Trace guide: Arrow Down</button>}
            {stage === 'retract' && <div className="grid grid-cols-2 gap-2">{['left', 'right'].map((side) => <button key={side} disabled={flaps.includes(side)} onClick={() => retractFlap(side, { x: side === 'left' ? 222 : 378, y: 300 })} className="rounded-lg bg-slate-700 px-2 py-3 disabled:opacity-40">Retract {side} flap</button>)}</div>}
          </details>}

          <ol aria-label="Procedure stages" className="space-y-2">
            {STAGES.map((item, index) => <li key={item.id} aria-current={stage === item.id ? 'step' : undefined} className={`flex items-center gap-2 text-xs ${index === stageIndex ? 'text-teal-200' : 'text-slate-400'}`}>
              {index < stageIndex ? <Check className="h-4 w-4" /> : <span className="flex h-4 w-4 items-center justify-center">{index + 1}</span>}{item.label}
            </li>)}
          </ol>

          {exposed && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                {quizMode
                  ? (locale === 'ne' ? 'उत्तर चयन गर्नुहोस्' : 'Select an answer')
                  : (locale === 'ne' ? 'अध्ययन गर्न अङ्ग चयन गर्नुहोस्' : 'Select an organ to explore')}
              </h3>
              <div className="grid grid-cols-2 gap-1.5">
                {ORGANS.map((organ) => (
                  <button
                    key={organ.id}
                    onClick={() => handleOrganSelect(organ.id)}
                    disabled={quizMode && quizResult !== null}
                    aria-pressed={quizMode ? undefined : selected === organ.id}
                    className={`text-left px-2.5 py-2 rounded-xl text-xs font-medium transition-all focus-visible:outline-2 focus-visible:outline-white disabled:opacity-50 disabled:cursor-not-allowed ${!quizMode && selected === organ.id ? 'ring-2 ring-white text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'}`}
                    style={{ backgroundColor: !quizMode && selected === organ.id ? organ.color : undefined }}>
                    <div>{locale === 'ne' ? organ.nameNe : organ.nameEn}</div>
                    <div className="text-[10px] opacity-60">{locale === 'ne' ? organ.nameEn : organ.nameNe}</div>
                    {!quizMode && explored.includes(organ.id) && (
                      <div className="text-[10px] text-emerald-400 mt-1">{locale === 'ne' ? 'अध्ययन गरियो' : 'Explored'}</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quiz mode */}
          {exposed && (
            <div>
              {!quizMode ? (
                <button onClick={startQuiz}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 transition-colors">
                  <HelpCircle className="h-4 w-4" /> {t('frog.quiz.mode')}
                </button>
              ) : (
                <div className="bg-amber-900/30 border border-amber-700 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-amber-400">Quiz Mode</h3>
                    <button onClick={stopQuiz} aria-label={locale === 'ne' ? 'प्रश्नोत्तर बन्द गर्नुहोस्' : 'Exit quiz'}
                      className="text-gray-500 hover:text-gray-300"><X className="h-4 w-4" /></button>
                  </div>
                  <p className="text-sm text-gray-300 mb-3">{locale === 'ne' ? 'चित्र वा सूचीबाट यो अङ्ग चयन गर्नुहोस्:' : 'Select this organ in the diagram or list:'}</p>
                  <div aria-live="polite" className="text-amber-400 font-bold text-lg mb-1">
                    {ORGANS.find((o) => o.id === quizOrgan)?.[locale === 'ne' ? 'nameNe' : 'nameEn']}
                  </div>
                  <div className="text-gray-500 text-xs mt-3">
                    Score: {quizScore.correct}/{quizScore.total}
                    {quizScore.total > 0 && ` (${Math.round((quizScore.correct / quizScore.total) * 100)}%)`}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Completion */}
          {isDone && (
            <div role="status" className="bg-emerald-900/40 border border-emerald-700 rounded-xl p-4 text-center">
              <div className="text-emerald-400 font-semibold text-sm">{t('completed.title')}</div>
              <div className="text-emerald-600 text-xs mt-1">{t('completed.subtitle')}</div>
              <p className="text-gray-300 text-xs mt-2 leading-relaxed">
                {locale === 'ne'
                  ? 'सातै अङ्गको अध्ययन पूरा भयो। मुटुले रगत पम्प गर्छ, फोक्सोले ग्यास आदानप्रदान गर्छ, कलेजो, पेट र आन्द्राले पाचनमा सहयोग गर्छन्, र मिर्गौला तथा पिसाब थैलीले फोहोर निष्कासनमा सहयोग गर्छन्।'
                  : 'All seven organs explored. The heart pumps blood; lungs exchange gases; the liver, stomach and intestine support digestion; kidneys and bladder support waste removal.'}
              </p>
            </div>
          )}

          {/* Ethical note */}
          <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/50">
            <p className="text-xs text-gray-500 leading-relaxed">
              <strong className="text-gray-400">Ethical alternative:</strong> A non-graphic virtual model for learning anatomy without animal use. Layers and organ positions are simplified; this is not a guide to physical dissection.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
