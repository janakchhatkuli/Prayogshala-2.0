'use client';

import { useRef, useState, type ReactNode, type PointerEvent } from 'react';

export type Point = { x: number; y: number };

/** Coordinates stay in the parent SVG's viewBox, including on resized/touch screens. */
export default function DraggableSVG({ x, y, label, children, onDrop, onMove, onCancel, constrain, disabled = false }: {
  x: number; y: number; label: string; children: ReactNode;
  onDrop: (point: Point) => void; onMove?: (point: Point) => void; onCancel?: () => void;
  /** Maps a free pointer position onto the allowed path (e.g. an arc or a rail). */
  constrain?: (point: Point) => Point; disabled?: boolean;
}) {
  const [position, setPosition] = useState<Point | null>(null);
  const drag = useRef<{ offset: Point; position: Point } | null>(null);
  const keyboard = useRef<Point | null>(null);
  function svgPoint(event: PointerEvent<SVGGElement>) {
    const svg = event.currentTarget.ownerSVGElement;
    const matrix = svg?.getScreenCTM();
    if (!matrix) return { x, y };
    return new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
  }
  const shown = position ?? { x, y };
  return <g role="button" tabIndex={disabled ? -1 : 0} aria-label={label} aria-disabled={disabled} transform={`translate(${shown.x} ${shown.y})`} className={disabled ? '' : 'lab-draggable'} style={{ touchAction: 'none' }}
    onPointerDown={event => {
      if (disabled || event.button !== 0) return;
      const point = svgPoint(event);
      drag.current = { offset: { x: point.x - x, y: point.y - y }, position: { x, y } };
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
    }}
    onPointerMove={event => {
      if (!drag.current) return;
      const point = svgPoint(event);
      const raw = { x: point.x - drag.current.offset.x, y: point.y - drag.current.offset.y };
      const next = constrain ? constrain(raw) : raw;
      drag.current.position = next;
      setPosition(next);
      onMove?.(next);
    }}
    onPointerUp={event => {
      if (!drag.current) return;
      const next = drag.current.position;
      drag.current = null;
      setPosition(null);
      event.currentTarget.releasePointerCapture(event.pointerId);
      onDrop(next);
    }}
    onPointerCancel={() => { drag.current = null; setPosition(null); onCancel?.(); }}
    onKeyDown={event => {
      if (disabled) return;
      if (event.key === 'Escape') { keyboard.current = null; setPosition(null); onCancel?.(); return; }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault(); onDrop(keyboard.current ?? { x, y }); keyboard.current = null; setPosition(null); return;
      }
      const delta = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] }[event.key];
      if (!delta) return;
      event.preventDefault();
      const previous = keyboard.current ?? { x, y };
      const raw = { x: previous.x + delta[0], y: previous.y + delta[1] };
      const next = constrain ? constrain(raw) : raw;
      keyboard.current = next; setPosition(next); onMove?.(next);
    }}
    onBlur={() => { keyboard.current = null; if (!drag.current) { setPosition(null); onCancel?.(); } }}
  >{children}</g>;
}
