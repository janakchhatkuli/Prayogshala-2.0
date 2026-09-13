'use client';

import { useEffect, useRef, type PointerEvent, type ReactNode } from 'react';

export type Point = { x: number; y: number };
export type Instrument = 'burette' | 'clamp' | 'flask' | 'pipette' | 'funnel' | 'bottle' | 'dropper';
export interface ApparatusState {
  positions: Record<Instrument, Point>;
  mounted: boolean;
  tension: number;
  opening: number;
  fill: number;
  pipette: number;
  aliquotLoaded: boolean;
  acid: number;
  indicator: number;
}

// All positions, hit tests and drag bounds use the same 800 x 500 SVG coordinates.
export const SHELF: Record<Instrument, Point> = {
  burette: { x: 640, y: 90 }, clamp: { x: 450, y: 150 },
  flask: { x: 590, y: 350 }, pipette: { x: 220, y: 310 },
  funnel: { x: 720, y: 300 }, bottle: { x: 95, y: 180 }, dropper: { x: 300, y: 285 },
};
export const near = (a: Point, b: Point, radius = 25) => Math.hypot(a.x - b.x, a.y - b.y) <= radius;
export const mountedPosition = (a: ApparatusState): Point => ({ x: 410, y: a.positions.clamp.y - 80 });
export const reservoirTip = { x: 110, y: 385 };
export const flaskTip = (a: ApparatusState): Point => ({ x: a.positions.flask.x, y: 365 });
export const secured = (a: ApparatusState) => a.mounted && a.tension >= 70;
export const aligned = (a: ApparatusState) => Math.abs(a.positions.flask.x - 410) <= 12;
export const funnelSeated = (a: ApparatusState) => a.mounted && near(a.positions.funnel, a.positions.burette, 30);
export const bottlePosition = (a: ApparatusState): Point => ({ x: a.positions.burette.x, y: a.positions.burette.y - 30 });
export const toolsClear = (a: ApparatusState) => !near(a.positions.funnel, a.positions.burette, 45) && !near(a.positions.bottle, bottlePosition(a), 45) && !near(a.positions.pipette, flaskTip(a), 35) && !near(a.positions.dropper, flaskTip(a), 35);
export function initialApparatus(demo = false): ApparatusState {
  return {
    positions: { ...SHELF, ...(demo ? { burette: { x: 410, y: 70 }, flask: { x: 410, y: 350 } } : {}) },
    mounted: demo, tension: demo ? 80 : 0, opening: 0, fill: demo ? 50 : 0,
    pipette: 0, aliquotLoaded: demo, acid: demo ? 25 : 0, indicator: demo ? 2 : 0,
  };
}

interface Props {
  state: ApparatusState;
  volume: number;
  color: string;
  flowing: boolean;
  filling: boolean;
  bulbActive: boolean;
  locked: boolean;
  canFill: boolean;
  canBulb: boolean;
  canIndicator: boolean;
  canFlow: boolean;
  onMove: (id: Instrument, point: Point, snap: boolean) => void;
  onWheel: (id: 'tension' | 'opening', delta: number) => void;
  onFill: () => void;
  onBulb: (action: 'hold' | 'release' | 'pulse') => void;
  onIndicator: () => void;
}

const buttonClass = 'rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-slate-100 hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-white disabled:opacity-40 disabled:cursor-not-allowed';

// Invisible grab zones so the whole instrument (not just filled strokes) can be dragged.
const HIT: Record<Instrument, { x: number; y: number; w: number; h: number }> = {
  clamp: { x: -60, y: -30, w: 115, h: 60 },
  burette: { x: -18, y: -16, w: 36, h: 266 },
  flask: { x: -56, y: -4, w: 112, h: 104 },
  funnel: { x: -30, y: -34, w: 60, h: 40 },
  bottle: { x: -80, y: -10, w: 100, h: 110 },
  dropper: { x: -18, y: -78, w: 36, h: 82 },
  pipette: { x: -22, y: -152, w: 44, h: 156 },
};
const HANDOFF_PX = 8;

export default function PhysicalApparatus({ state: a, volume, color, flowing, filling, bulbActive, locked, canFill, canBulb, canIndicator, canFlow, onMove, onWheel, onFill, onBulb, onIndicator }: Props) {
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: Instrument; pointer: number; offset: Point; point: Point } | null>(null);
  // Pointer that started on a wheel or bulb; becomes an instrument drag once it moves far enough.
  const pending = useRef<{ id: Instrument; pointer: number; clientX: number; clientY: number; onHandOff?: () => void } | null>(null);
  const wheelHandler = useRef(onWheel);
  wheelHandler.current = onWheel;

  useEffect(() => {
    const element = svg.current;
    if (!element) return;
    // Native non-passive listener prevents page scrolling only over instrument wheels.
    const wheel = (event: WheelEvent) => {
      const control = (event.target as Element).closest('[data-wheel]')?.getAttribute('data-wheel');
      if (control !== 'tension' && control !== 'opening' && control !== 'bulb') return;
      event.preventDefault();
      if (control === 'bulb') element.dispatchEvent(new CustomEvent('bulbpulse'));
      else if (event.deltaY !== 0) wheelHandler.current(control, event.deltaY < 0 ? 10 : -10);
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, []);
  useEffect(() => {
    const element = svg.current;
    const pulse = () => onBulb('pulse');
    element?.addEventListener('bulbpulse', pulse);
    return () => element?.removeEventListener('bulbpulse', pulse);
  }, [onBulb]);

  const coordinates = (event: PointerEvent<SVGElement>): Point | null => {
    const matrix = svg.current?.getScreenCTM();
    if (!matrix) return null;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: point.x, y: point.y };
  };
  const beginPending = (id: Instrument, event: PointerEvent<SVGElement>, onHandOff?: () => void) => {
    if (locked) return;
    pending.current = { id, pointer: event.pointerId, clientX: event.clientX, clientY: event.clientY, onHandOff };
  };
  // Child controls call this on pointermove; once the pointer travels, the parent instrument starts dragging.
  const maybeHandOff = (event: PointerEvent<SVGElement>) => {
    const p = pending.current;
    if (!p || p.pointer !== event.pointerId) return;
    if (Math.hypot(event.clientX - p.clientX, event.clientY - p.clientY) < HANDOFF_PX) return;
    pending.current = null;
    p.onHandOff?.();
    const point = coordinates(event);
    if (!point) return;
    const pos = a.positions[p.id];
    drag.current = { id: p.id, pointer: event.pointerId, offset: { x: point.x - pos.x, y: point.y - pos.y }, point: pos };
  };
  const movable = (id: Instrument, label: string, children: ReactNode) => {
    const p = a.positions[id];
    const hit = HIT[id];
    return <g key={id} data-testid={`instrument-${id}`} role="group" aria-label={label} tabIndex={0}
      transform={`translate(${p.x} ${p.y})`} style={{ touchAction: 'none', cursor: locked ? 'default' : 'grab' }}
      onPointerDown={event => {
        if (event.button !== 0 || locked || filling || bulbActive) return;
        const point = coordinates(event);
        if (!point) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { id, pointer: event.pointerId, offset: { x: point.x - p.x, y: point.y - p.y }, point: p };
      }}
      onPointerMove={event => {
        const active = drag.current;
        if (!active || active.id !== id || active.pointer !== event.pointerId) return;
        const point = coordinates(event);
        if (!point) return;
        active.point = { x: point.x - active.offset.x, y: point.y - active.offset.y };
        onMove(id, active.point, false);
      }}
      onPointerUp={event => {
        pending.current = null;
        if (drag.current?.id !== id || drag.current.pointer !== event.pointerId) return;
        onMove(id, drag.current.point, true);
        drag.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => { drag.current = null; pending.current = null; }}
      onLostPointerCapture={event => { if (event.target === event.currentTarget) drag.current = null; }}
      onKeyDown={event => {
        const delta: Record<string, Point> = { ArrowLeft: { x: -10, y: 0 }, ArrowRight: { x: 10, y: 0 }, ArrowUp: { x: 0, y: -10 }, ArrowDown: { x: 0, y: 10 } };
        if (!delta[event.key]) return;
        event.preventDefault();
        // Arrow nudges must be able to leave a snap zone; placement buttons snap explicitly.
        onMove(id, { x: p.x + delta[event.key].x, y: p.y + delta[event.key].y }, false);
      }}>
      <title>{label}: drag or use arrow keys and placement buttons below</title>
      <rect x={hit.x} y={hit.y} width={hit.w} height={hit.h} fill="transparent" />
      {children}
    </g>;
  };
  const wheel = (id: 'tension' | 'opening', x: number, y: number, label: string, value: number) => <g
    data-testid={`${id}-wheel`} data-wheel={id} role="slider" tabIndex={0}
    aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} aria-valuetext={`${value} percent, ${value * 2.7} degrees`}
    onPointerDown={e => { e.stopPropagation(); beginPending(id === 'tension' ? 'clamp' : 'burette', e); }}
    onPointerMove={maybeHandOff}
    onKeyDown={e => { if (['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'].includes(e.key)) { e.preventDefault(); e.stopPropagation(); onWheel(id, ['ArrowUp', 'ArrowRight'].includes(e.key) ? 10 : -10); } }}
    style={{ cursor: 'ns-resize' }}>
    <circle cx={x} cy={y} r={23} fill="transparent" />
    <g transform={`rotate(${value * 2.7} ${x} ${y})`}>
      <circle cx={x} cy={y} r={16} fill={value >= 70 ? '#059669' : '#334155'} stroke="#cbd5e1" strokeWidth={3} />
      <path d={`M${x} ${y - 13}V${y + 13} M${x - 13} ${y}H${x + 13}`} stroke="#e2e8f0" strokeWidth={3} />
      <circle cx={x} cy={y - 12} r={3} fill="#fbbf24" />
    </g>
    <text x={x + 25} y={y + 4} fill="#f8fafc" fontSize={11}>{value}% / {Math.round(value * 2.7)} deg</text>
  </g>;
  const { burette, flask, pipette, bottle } = a.positions;
  const meniscus = 6 + (1 - (a.fill - volume) / 50) * 200;
  const liquidHeight = Math.sqrt((a.acid + volume) / 75) * 56;
  const busy = locked || filling || bulbActive;

  return <section aria-label="Physical titration apparatus" className="min-w-0">
    <svg ref={svg} viewBox="0 0 800 500" className="theme-svg block h-auto w-full" aria-label="Titration bench at 25 C" data-testid="titration-bench">
      <defs>
        <linearGradient id="titration-glass"><stop stopColor="#dbeafe" stopOpacity=".4" /><stop offset=".5" stopColor="#93c5fd" stopOpacity=".06" /><stop offset="1" stopColor="#60a5fa" stopOpacity=".3" /></linearGradient>
        <clipPath id="physical-flask-liquid"><path d="M-10 25 L-52 86 Q0 96 52 86 L10 25Z" /></clipPath>
      </defs>
      <rect width="800" height="500" fill="#0d1117" />
      <path d="M0 440H800V500H0Z" fill="#252536" />
      <path d="M0 440H800" stroke="#64748b" strokeWidth="3" />
      <text x="20" y="28" fill="#cbd5e1" fontSize="13">ROOM 25 C | Drag glassware; scroll over wheels</text>
      <text x="20" y="49" fill="#94a3b8" fontSize="11">Blue liquid is a visibility aid. HCl and NaOH are colourless.</text>
      <rect x="375" y="440" width="130" height="10" rx="4" fill="#475569" />
      <rect x="465" y="70" width="8" height="370" rx="4" fill="#94a3b8" />
      <text x="475" y="425" fill="#cbd5e1" fontSize="11">Stand</text>
      <rect x="351" y="437" width="116" height="4" fill="#f8fafc" />
      <path d={`M410 ${a.positions.clamp.y - 80}V345`} stroke="#60a5fa" strokeDasharray="5 6" opacity=".4" />
      <text x="360" y="477" fill={aligned(a) ? '#6ee7b7' : '#fbbf24'} fontSize="12">{aligned(a) ? 'Flask aligned' : 'Snap flask under tip'}</text>

      <g data-testid="hcl-reservoir" aria-label="HCl reservoir beaker">
        <rect x="74" y="340" width="72" height="96" rx="5" fill="url(#titration-glass)" stroke="#93c5fd" />
        <rect x="77" y={365 + (a.acid + a.pipette) * .7} width="66" height={68 - (a.acid + a.pipette) * .7} fill="#93c5fd" opacity=".4" />
        <text x="110" y="418" textAnchor="middle" fill="#e2e8f0" fontSize="12">HCl</text>
        <text x="110" y="457" textAnchor="middle" fill="#cbd5e1" fontSize="11">Reservoir {(75 - a.acid - a.pipette).toFixed(1)} mL</text>
      </g>

      {movable('clamp', 'Clamp height', <>
        <rect x="-55" y="-9" width="82" height="18" rx="5" fill="#64748b" />
        <path d="M-30 -18H-48V18H-30" fill="none" stroke="#cbd5e1" strokeWidth="5" />
        {wheel('tension', 25, 0, 'Clamp tension', a.tension)}
        <text x="30" y="-25" fill={secured(a) ? '#6ee7b7' : '#fbbf24'} fontSize="11">{secured(a) ? 'SECURED' : 'Loose: tighten to 70%'}</text>
      </>)}
      {movable('burette', 'Burette', <>
        <rect x="-14" width="28" height="212" rx="4" fill="url(#titration-glass)" stroke="#93c5fd" strokeWidth="2" />
        {a.fill > volume && <rect data-testid="burette-liquid" x="-11" y={meniscus} width="22" height={Math.max(0, 209 - meniscus)} fill="#60a5fa" opacity=".65" />}
        {a.fill > 0 && <path data-testid="meniscus" d={`M-11 ${meniscus}Q0 ${meniscus + 3} 11 ${meniscus}`} stroke="#fef08a" fill="none" strokeWidth="2" />}
        {Array.from({ length: 11 }, (_, i) => <g key={i}><path d={`M14 ${6 + i * 20}h9`} stroke="#cbd5e1" /><text x="26" y={10 + i * 20} fill="#94a3b8" fontSize="9">{i * 5}</text></g>)}
        <path d="M-11 212L0 245L11 212" fill="url(#titration-glass)" stroke="#93c5fd" />
        {wheel('opening', 0, 221, 'Stopcock opening', a.opening)}
        <text x="-28" y="-10" fill="#cbd5e1" fontSize="11">50 mL burette</text>
      </>)}
      {flowing && <circle cx={burette.x} cy={burette.y + 250} r="3" fill="#93c5fd"><animate attributeName="cy" from={burette.y + 247} to="365" dur="0.35s" repeatCount="indefinite" /></circle>}
      {movable('flask', 'Conical flask', <>
        <path d="M-12 0V24L-52 86Q0 96 52 86L12 24V0Z" fill="url(#titration-glass)" stroke="#93c5fd" strokeWidth="2" />
        <rect x="-55" y={92 - liquidHeight} width="110" height={liquidHeight} fill={color} clipPath="url(#physical-flask-liquid)" />
        <path d="M-17 0H17" stroke="#dbeafe" strokeWidth="4" />
        <text data-testid="flask-volume" x="0" y="72" textAnchor="middle" fontSize="12" fill="#f8fafc">{(a.acid + volume).toFixed(2)} mL</text>
        <text x="0" y="110" textAnchor="middle" fontSize="11" fill="#cbd5e1">Conical flask</text>
      </>)}
      {movable('funnel', 'Funnel', <>
        <path d="M-26 -30H26L4 -10V0H-4V-10Z" fill="url(#titration-glass)" stroke="#93c5fd" strokeWidth="2" />
        <text x="-23" y="20" fill="#cbd5e1" fontSize="11">Funnel</text>
      </>)}
      {movable('bottle', 'NaOH bottle', <>
        <g transform={filling ? 'rotate(-25)' : undefined}>
          <path d="M0 0H-22V16H-62V87H-7V16H0Z" fill="#1e40af" stroke="#93c5fd" strokeWidth="2" />
          <rect x="-57" y="40" width="45" height="32" rx="3" fill="#dbeafe" />
          <text x="-35" y="53" textAnchor="middle" fill="#1e3a8a" fontSize="10">NaOH</text>
          <text x="-35" y="65" textAnchor="middle" fill="#1e3a8a" fontSize="9">0.1 mol/L</text>
        </g>
      </>)}
      {filling && <path d={`M${bottle.x} ${bottle.y}L${burette.x} ${burette.y}`} stroke="#60a5fa" strokeWidth="4" strokeDasharray="5 3" />}
      {movable('dropper', 'Indicator dropper', <>
        <path d="M-5 -44H5L3 -5L0 0L-3 -5Z" fill="#e9d5ff" stroke="#c084fc" />
        <g role="button" tabIndex={0} aria-label="Squeeze positioned indicator bulb" aria-disabled={!canIndicator}
          onPointerDown={e => e.stopPropagation()} onClick={onIndicator}
          onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); onIndicator(); } }}>
          <ellipse cy="-54" rx="14" ry="19" fill="#a21caf" stroke="#e9d5ff" />
        </g>
        <text x="14" y="-42" fill="#e9d5ff" fontSize="11">Indicator</text>
      </>)}
      {movable('pipette', '25 mL pipette', <>
        <path d="M-4 -110H4V-83Q16 -65 4 -47V-5L0 0L-4 -5V-47Q-16 -65 -4 -83Z" fill="url(#titration-glass)" stroke="#93c5fd" strokeWidth="2" />
        <path d={`M0 -5V${-5 - a.pipette * 3.9}`} stroke="#60a5fa" strokeWidth="5" />
        <path d="M-9 -102H9" stroke="#fef08a" />
        <text data-testid="pipette-volume" x="18" y="-60" fill="#e2e8f0" fontSize="12">{a.pipette.toFixed(1)} / 25 mL</text>
        <g data-testid="pipette-bulb" data-wheel="bulb" role="button" tabIndex={0} aria-label="Pipette bulb: hold to aspirate or dispense" aria-disabled={!canBulb}
          onPointerDown={e => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); beginPending('pipette', e, () => onBulb('release')); onBulb('hold'); }}
          onPointerMove={maybeHandOff}
          onPointerUp={() => { pending.current = null; onBulb('release'); }} onPointerCancel={() => onBulb('release')} onLostPointerCapture={() => onBulb('release')}
          onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); if (!e.repeat) onBulb('hold'); } }}
          onKeyUp={e => { if (e.key === ' ' || e.key === 'Enter') onBulb('release'); }} onBlur={() => onBulb('release')}>
          <ellipse cy="-127" rx={bulbActive ? 12 : 17} ry="22" fill={bulbActive ? '#f97316' : '#ea580c'} stroke="#fdba74" strokeWidth="2" />
          <text x="23" y="-124" fill="#fed7aa" fontSize="11">Bulb: hold / wheel</text>
        </g>
      </>)}
      {bulbActive && near(pipette, flaskTip(a)) && <circle cx={flask.x} cy="377" r="3" fill="#93c5fd" />}
    </svg>

    <div className="grid gap-3 border-t border-white/10 bg-slate-900 p-3 text-xs sm:grid-cols-2 xl:grid-cols-3" aria-label="Equipment panel">
      <fieldset className="space-y-2"><legend className="mb-2 font-semibold text-blue-200">1. Stand, clamp and burette</legend>
        <div className="flex flex-wrap gap-2">
          <button className={buttonClass} disabled={busy || a.mounted} onClick={() => onMove('burette', mountedPosition(a), true)}>Place burette in clamp</button>
          <button className={buttonClass} disabled={busy || a.tension >= 70} onClick={() => onMove('clamp', { x: 450, y: a.positions.clamp.y - 10 }, true)}>Raise clamp</button>
          <button className={buttonClass} disabled={busy || a.tension >= 70} onClick={() => onMove('clamp', { x: 450, y: a.positions.clamp.y + 10 }, true)}>Lower clamp</button>
          <button className={buttonClass} disabled={busy || !a.mounted || a.tension === 100} onClick={() => onWheel('tension', 10)}>Tighten clamp (+10%)</button>
          <button className={buttonClass} disabled={busy || a.tension === 0} onClick={() => onWheel('tension', -10)}>Loosen clamp (-10%)</button>
        </div><p className="text-slate-400">Tension {a.tension}%; secure at 70%. Loosen before adjusting height.</p>
      </fieldset>
      <fieldset className="space-y-2"><legend className="mb-2 font-semibold text-blue-200">2. Funnel and NaOH bottle</legend>
        <div className="flex flex-wrap gap-2">
          <button className={buttonClass} disabled={busy || !secured(a) || a.fill === 50} onClick={() => onMove('funnel', a.positions.burette, true)}>Seat funnel in burette</button>
          <button className={buttonClass} disabled={busy || !funnelSeated(a) || a.fill === 50} onClick={() => onMove('bottle', bottlePosition(a), true)}>Position NaOH bottle over funnel</button>
          <button className={buttonClass} disabled={!canFill} onClick={onFill}>{filling ? 'Filling burette...' : 'Pour NaOH to 0.00 mL mark'}</button>
          <button className={buttonClass} disabled={busy} onClick={() => { onMove('funnel', SHELF.funnel, true); onMove('bottle', SHELF.bottle, true); }}>Return funnel and bottle</button>
        </div><p className="text-slate-400">Filled {a.fill.toFixed(1)} / 50 mL. Remove funnel before titration.</p>
      </fieldset>
      <fieldset className="space-y-2"><legend className="mb-2 font-semibold text-blue-200">3. Flask, beaker and pipette</legend>
        <div className="flex flex-wrap gap-2">
          <button className={buttonClass} disabled={busy} onClick={() => onMove('flask', { x: 410, y: 350 }, true)}>Snap flask under tip</button>
          <button className={buttonClass} disabled={busy || a.fill < 50 || a.aliquotLoaded} onClick={() => onMove('pipette', reservoirTip, true)}>Pipette into HCl reservoir</button>
          <button className={buttonClass} disabled={busy || !a.aliquotLoaded || a.acid === 25} onClick={() => onMove('pipette', flaskTip(a), true)}>Pipette into flask</button>
          <button className={buttonClass} disabled={!canBulb} onClick={() => onBulb('pulse')}>Run bulb for 1 second</button>
          <button className={buttonClass} disabled={busy} onClick={() => onMove('pipette', SHELF.pipette, true)}>Return pipette to holder</button>
        </div><p className="text-slate-400">Hold the orange bulb to aspirate 25 mL, then move into flask and hold to dispense. Acid transferred: {a.acid.toFixed(1)} / 25 mL.</p>
      </fieldset>
      <fieldset className="space-y-2"><legend className="mb-2 font-semibold text-blue-200">4. Indicator dropper</legend>
        <div className="flex flex-wrap gap-2">
          <button className={buttonClass} disabled={busy || a.acid !== 25} onClick={() => onMove('dropper', flaskTip(a), true)}>Position indicator over flask</button>
          <button className={buttonClass} disabled={!canIndicator} onClick={onIndicator}>Squeeze indicator dropper</button>
          <button className={buttonClass} disabled={busy} onClick={() => onMove('dropper', SHELF.dropper, true)}>Return indicator dropper</button>
        </div><p className="text-slate-400">{a.indicator} / 2 drops. Indicator volume is negligible in this model.</p>
      </fieldset>
      <fieldset className="space-y-2"><legend className="mb-2 font-semibold text-blue-200">5. Stopcock wheel</legend>
        <div className="flex flex-wrap gap-2">
          <button className={buttonClass} disabled={!canFlow || a.opening === 100} onClick={() => onWheel('opening', 10)}>Open stopcock (+10%)</button>
          <button className={buttonClass} disabled={a.opening === 0} onClick={() => onWheel('opening', -10)}>Close stopcock (-10%)</button>
          <button className={buttonClass} disabled={a.opening === 0} onClick={() => onWheel('opening', -100)}>Close stopcock fully</button>
        </div><p className="text-slate-400">Opening {a.opening}% / {Math.round(a.opening * 2.7)} deg. Flow {(a.opening / 100 * 4).toFixed(1)} mL/s. Use single drops near 25 mL.</p>
      </fieldset>
      <p className="self-center leading-relaxed text-slate-400">All drags have placement buttons and arrow-key movement. Wheel up tightens / opens; wheel down loosens / closes. Moving apparatus closes the stopcock for safety. Setup controls are in English.</p>
    </div>
  </section>;
}
