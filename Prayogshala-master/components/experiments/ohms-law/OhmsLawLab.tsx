'use client';
import { useRef, useState, type PointerEvent } from 'react';
import { motion } from 'framer-motion';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter,
} from 'recharts';
import { RotateCcw, ChevronLeft, Zap } from 'lucide-react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { useT } from '@/hooks/useTranslation';

const VOLTAGES = [1.5, 3, 4.5, 6, 9];
const RESISTORS = [10, 47, 100, 220, 470];

type Mode = 'circuit' | 'plot';
type Point = { x: number; y: number };
const TERMINALS = {
  positive: { x: 150, y: 100, label: 'Supply +', short: '+' },
  switchIn: { x: 300, y: 100, label: 'Switch input', short: 'S1' },
  switchOut: { x: 380, y: 100, label: 'Switch output', short: 'S2' },
  resistorIn: { x: 450, y: 150, label: 'Resistor input', short: 'R1' },
  resistorOut: { x: 450, y: 245, label: 'Resistor output', short: 'R2' },
  ammeterIn: { x: 330, y: 330, label: 'Ammeter +', short: 'A+' },
  ammeterOut: { x: 270, y: 330, label: 'Ammeter -', short: 'A-' },
  negative: { x: 150, y: 250, label: 'Supply -', short: '-' },
} as const;
type Terminal = keyof typeof TERMINALS;
const TERMINAL_IDS = Object.keys(TERMINALS) as Terminal[];
const CONNECTIONS: { from: Terminal; to: Terminal; path: string }[] = [
  { from: 'positive', to: 'switchIn', path: 'M150 100 H300' },
  { from: 'switchOut', to: 'resistorIn', path: 'M380 100 H450 V150' },
  { from: 'resistorOut', to: 'ammeterIn', path: 'M450 245 V330 H330' },
  { from: 'ammeterOut', to: 'negative', path: 'M270 330 H150 V250' },
];
type Reading = { voltage: number; current: number; resistance: number };
const INITIAL_FEEDBACK = 'Connect all four leads with the switch open. Drag between terminals, or select two terminal buttons.';

export default function OhmsLawLab() {
  const t = useT();
  const { completeExperiment } = useStore();

  const [voltage, setVoltage]     = useState(3);
  const [resistance, setRes]      = useState(100);
  const [switchOn, setSwitchOn]   = useState(false);
  const [mode, setMode]           = useState<Mode>('circuit');
  const [wires, setWires] = useState<number[]>([]);
  const [selected, setSelected] = useState<Terminal | null>(null);
  const [feedback, setFeedback] = useState(INITIAL_FEEDBACK);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [completedResistance, setCompletedResistance] = useState<number | null>(null);
  const [resetKey, setResetKey] = useState(0);

  const connected = CONNECTIONS.every((_, index) => wires.includes(index));
  const conducting = connected && switchOn;
  const measuredVoltage = conducting ? voltage : 0;
  const current      = conducting ? voltage / resistance : 0; // Amperes throughout the model
  const currentMa    = current * 1000;                         // mA
  const ledBrightness = Math.min(1, current * 50);
  const series = readings.filter(reading => reading.resistance === resistance).sort((a, b) => a.voltage - b.voltage);
  const plotData = series.map(reading => ({ voltage: reading.voltage, current: reading.current * 1000 }));
  const distinctVoltages = new Set(series.map(reading => reading.voltage)).size;
  const duplicate = series.some(reading => reading.voltage === voltage);
  const measuredResistance = series.length ? series.reduce((sum, reading) => sum + reading.voltage / reading.current, 0) / series.length : null;
  // Fit I (mA) against V through the origin using only recorded observations.
  const slope = series.length ? series.reduce((sum, reading) => sum + reading.voltage * reading.current * 1000, 0)
    / series.reduce((sum, reading) => sum + reading.voltage ** 2, 0) : null;

  function connect(from: Terminal, to: Terminal) {
    setSelected(null);
    if (switchOn) { setFeedback('Open the switch before changing wires. No connection was added.'); return; }
    if (from === to) { setFeedback('Choose two different terminals. No connection was added.'); return; }
    const index = CONNECTIONS.findIndex(wire => (wire.from === from && wire.to === to) || (wire.from === to && wire.to === from));
    if (index < 0) {
      const short = (from === 'positive' && to === 'negative') || (from === 'negative' && to === 'positive')
        || (from === 'resistorIn' && to === 'resistorOut') || (from === 'resistorOut' && to === 'resistorIn');
      setFeedback(short ? 'Short circuit rejected: never bridge the supply poles or bypass the resistor. No wire was added.'
        : 'Incorrect connection rejected. Follow Supply + → S1; S2 → R1; R2 → A+; A- → Supply -. No wire was added.');
      return;
    }
    if (wires.includes(index)) { setFeedback('These terminals are already connected.'); return; }
    setWires(previous => previous.includes(index) ? previous : [...previous, index]);
    setFeedback(`${TERMINALS[from].label} connected to ${TERMINALS[to].label}.${wires.length === 3 ? ' Circuit ready: close the switch.' : ' Add the remaining leads.'}`);
  }

  function selectTerminal(terminal: Terminal) {
    if (switchOn) { setSelected(null); setFeedback('Open the switch before selecting terminals.'); return; }
    if (selected === terminal) { setSelected(null); setFeedback('Terminal selection cleared.'); }
    else if (selected) connect(selected, terminal);
    else { setSelected(terminal); setFeedback(`${TERMINALS[terminal].label} selected. Choose the other terminal, or Escape to cancel.`); }
  }

  function toggleSwitch() {
    setSwitchOn(!switchOn);
    setSelected(null);
    setFeedback(switchOn ? 'Switch open: current is zero. Wiring can now be changed.'
      : connected ? 'Switch closed: read the meters and record this observation.' : 'Switch closed, but the circuit is incomplete: current is zero. Open the switch and finish wiring.');
  }

  function recordReading() {
    if (!conducting || voltage <= 0) { setFeedback('Complete the wiring, close the switch and select a nonzero voltage before recording.'); return; }
    if (duplicate) { setFeedback('This voltage is already recorded for this resistor. Choose a different voltage.'); return; }
    setReadings(previous => previous.some(reading => reading.resistance === resistance && reading.voltage === voltage)
      ? previous : [...previous, { voltage: measuredVoltage, current, resistance }]);
    setFeedback(`Recorded ${measuredVoltage.toFixed(1)} V and ${currentMa.toFixed(2)} mA at ${resistance} Ω.${distinctVoltages >= 2 ? ' Three distinct voltages collected: review the result and complete the experiment.' : ' Change the supply voltage and record again.'}`);
  }

  function handleComplete() {
    if (distinctVoltages < 3 || completedResistance !== null) return;
    setCompletedResistance(resistance);
    completeExperiment('ohms-law', 95);
    setFeedback(`Experiment complete: three or more distinct voltages verified Ohm's law at ${resistance} Ω.`);
  }

  function reset() {
    setSwitchOn(false); setVoltage(3); setRes(100); setMode('circuit');
    setWires([]); setSelected(null); setReadings([]); setCompletedResistance(null);
    setFeedback(INITIAL_FEEDBACK); setResetKey(previous => previous + 1);
  }

  return (
    <div className="flex min-h-[calc(100dvh-64px)] flex-col bg-gray-900 lg:flex-row" onKeyDown={event => {
      if (event.key === 'Escape') { setSelected(null); setFeedback('Connection cancelled.'); }
    }}>

      {/* ===================== CIRCUIT DISPLAY ===================== */}
      <div className="min-w-0 flex-1 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-3 sm:p-5">

        <div className="flex items-center justify-between gap-3">
        <Link href="/lab" className="flex min-h-11 items-center gap-1 text-xs text-gray-300 hover:text-white bg-gray-800/80 rounded-full px-3 py-2">
          <ChevronLeft className="h-3 w-3" /> Back
        </Link>

        {/* Mode toggle */}
        <div className="flex rounded-xl overflow-hidden border border-gray-700" aria-label="Lab view">
          {(['circuit', 'plot'] as Mode[]).map((m) => (
            <button key={m}
              onClick={() => { setMode(m); setSelected(null); }} aria-pressed={mode === m}
              className={`min-h-11 px-3 py-2 text-xs font-medium transition-colors ${mode === m ? 'bg-amber-500 text-gray-950' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
              {m === 'circuit' ? 'Circuit' : 'Plot I vs V'}
            </button>
          ))}
        </div>
        </div>
        <div className="mt-4 rounded-xl border border-gray-700 bg-gray-800/70 p-3 text-center">
          <p className="font-mono text-sm text-white sm:text-base">
            {conducting ? <>I = V / R = {voltage.toFixed(1)} / {resistance} = <span className="text-amber-400">{current.toFixed(5)} A = {currentMa.toFixed(2)} mA</span></>
              : `I = 0 A: ${!connected ? 'circuit incomplete' : 'switch open'}`}
          </p>
          <p className="mt-1 text-xs text-gray-400">Ideal resistor and meters; indicator brightness is illustrative, not an extra circuit load.</p>
        </div>

        {mode === 'circuit' ? (
          <CircuitDiagram
            key={resetKey}
            voltage={voltage}
            resistance={resistance}
            current={current}
            switchOn={switchOn}
            conducting={conducting}
            ledBrightness={ledBrightness}
            wires={wires} selected={selected} onSelect={selectTerminal} onConnect={connect}
            onToggleSwitch={toggleSwitch} onVoltage={setVoltage} onFeedback={setFeedback}
          />
        ) : (
          <div className="flex min-h-[360px] items-center justify-center py-6">
            <div className="w-full max-w-2xl">
              <h3 className="text-white font-bold mb-2 text-center">I vs V: Recorded Observations</h3>
              <p className="text-gray-300 text-xs text-center mb-4">R = {resistance} Ω | {series.length} recorded points{distinctVoltages >= 3 && slope !== null ? ` | Fitted slope = ${slope.toFixed(3)} mA/V = ${(slope / 1000).toFixed(5)} A/V` : ''}</p>
              <div className="bg-gray-800 rounded-2xl p-2 sm:p-4">
                {series.length === 0 ? <p className="flex h-[280px] items-center justify-center px-4 text-center text-sm text-gray-300">No readings yet for {resistance} Ω. Build the circuit and record readings; no theoretical points are added.</p> :
                <ResponsiveContainer width="100%" height={280}>
                  <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis type="number" domain={[0, 9]} dataKey="voltage" name="Voltage" unit=" V" tick={{ fill: '#9ca3af', fontSize: 10 }} label={{ value: 'Voltage (V)', position: 'insideBottom', offset: -15, fill: '#9ca3af', fontSize: 10 }} />
                    <YAxis type="number" domain={[0, 'auto']} dataKey="current" name="Current" unit=" mA" tick={{ fill: '#9ca3af', fontSize: 10 }} label={{ value: 'Current (mA)', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 10 }} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#1f2937', color: '#f3f4f6', border: '1px solid #374151', borderRadius: 8, fontSize: 11 }} formatter={(value, name) => [Number(value).toFixed(name === 'Voltage' ? 1 : 2), name]} />
                    <Scatter name="Recorded readings" data={plotData} fill="#f59e0b" line={series.length > 1} isAnimationActive={false} />
                  </ScatterChart>
                </ResponsiveContainer>}
              </div>
              <p className="text-center text-gray-500 text-xs mt-3">
                Only readings for the selected resistor are shown. Slope = 1000/R in mA/V; R = 1000/slope in Ω. See the notebook for tabulated values.
              </p>
            </div>
          </div>
        )}

        {/* Meter displays at bottom */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <Meter label="ACROSS R" value={measuredVoltage.toFixed(1)} unit="V" color="#f59e0b" />
          <Meter label="CURRENT" value={currentMa.toFixed(2)} unit="mA" color={conducting ? '#10b981' : '#9ca3af'} />
          <Meter label="RESISTANCE" value={resistance.toString()} unit="Ω" color="#818cf8" />
        </div>

        <section aria-label="Circuit wiring" className="mt-4 space-y-3 rounded-xl border border-gray-700 bg-gray-900/70 p-4 text-sm text-gray-300">
          <h3 className="font-semibold text-white">Wire the circuit: {wires.length}/4 leads</h3>
          <p id="wiring-help">Drag from one terminal to another and release to snap. Alternatively, click or focus two terminal buttons and press Enter. Escape cancels selection.</p>
          <p className="text-xs">Supply + → S1; S2 → R1; R2 → A+; A- → Supply -. The voltmeter is already connected across the resistor.</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-describedby="wiring-help">
            {TERMINAL_IDS.map(id => <button key={id} onClick={() => selectTerminal(id)} aria-pressed={selected === id}
              className={`min-h-11 rounded-lg border px-2 py-2 text-xs focus-visible:outline-2 focus-visible:outline-amber-300 ${selected === id ? 'border-amber-400 bg-amber-500/20 text-amber-200' : 'border-gray-600 bg-gray-800 hover:bg-gray-700'}`}>
              {TERMINALS[id].label}
            </button>)}
          </div>
          {selected && <button onClick={() => { setSelected(null); setFeedback('Terminal selection cleared.'); }} className="min-h-11 rounded-lg border border-gray-600 px-3">Cancel selection</button>}
          <ul className="space-y-2">
            {CONNECTIONS.map((wire, index) => <li key={index} className="flex flex-wrap items-center justify-between gap-2">
              <span className={wires.includes(index) ? 'text-emerald-300' : 'text-gray-400'}>{wires.includes(index) ? 'Connected' : 'Missing'}: {TERMINALS[wire.from].label} → {TERMINALS[wire.to].label}</span>
              {wires.includes(index) && <button className="min-h-11 rounded-lg border border-gray-600 px-3 text-xs disabled:opacity-40" disabled={switchOn}
                aria-label={`Remove wire from ${TERMINALS[wire.from].label} to ${TERMINALS[wire.to].label}`}
                onClick={() => { setWires(previous => previous.filter(value => value !== index)); setSelected(null); setFeedback('Wire removed. Current remains zero until the circuit is complete and the switch is closed.'); }}>Remove</button>}
            </li>)}
          </ul>
          <p role="status" aria-live="polite" aria-atomic="true" className="rounded-lg border border-amber-700/60 bg-amber-950/30 p-3 text-amber-200">{feedback}</p>
        </section>
      </div>

      {/* ===================== CONTROLS ===================== */}
      <div className="flex w-full flex-col border-t border-gray-700 bg-gray-900 text-white lg:w-[360px] lg:shrink-0 lg:border-l lg:border-t-0">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-base">{t('ohmslaw.title')}</h2>
              <p className="text-gray-400 text-xs mt-0.5">{t('ohmslaw.subtitle')}</p>
            </div>
            <button onClick={reset} aria-label="Reset circuit and all observations" title="Reset circuit and all observations"
              className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-5 flex-1">
          {/* Battery voltage */}
          <div>
            <label htmlFor="ohms-voltage" className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-2">
              {t('ohmslaw.battery')} Voltage
            </label>
            <div className="mb-3 flex items-center gap-3">
              <input id="ohms-voltage" type="range" min="0" max="9" step="0.1" value={voltage} onChange={event => setVoltage(Number(event.target.value))} aria-valuetext={`${voltage.toFixed(1)} volts`} className="h-11 min-w-0 flex-1 accent-amber-500" />
              <output htmlFor="ohms-voltage" className="font-mono text-amber-300">{voltage.toFixed(1)} V</output>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {VOLTAGES.map((v) => (
                <button key={v}
                  onClick={() => setVoltage(v)} aria-pressed={voltage === v}
                  className={`min-h-11 py-2 text-xs rounded-lg font-bold transition-all ${voltage === v ? 'bg-amber-500 text-gray-950 shadow-lg' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
                  {v}V
                </button>
              ))}
            </div>
          </div>

          {/* Resistor value */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-2">
              {t('ohmslaw.resistor')} Value
            </label>
            <div className="space-y-1.5">
              {RESISTORS.map((r) => (
                <button key={r}
                  onClick={() => { setRes(r); setFeedback(`Resistor set to ${r} Ω. Readings are grouped by resistance; collect three distinct voltages for one resistor.`); }} aria-pressed={resistance === r}
                  className={`min-h-11 w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all ${resistance === r ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
                  <span className="font-mono">{r} Ω</span>
                  <span className="text-xs opacity-80">{readings.filter(reading => reading.resistance === r).length} recorded</span>
                </button>
              ))}
            </div>
          </div>

          {/* Switch */}
          <div className="flex items-center justify-between bg-gray-800 rounded-xl p-3">
            <span className="text-sm font-medium">{t('ohmslaw.switch')}</span>
            <button
              onClick={toggleSwitch} role="switch" aria-checked={switchOn} aria-label="Circuit switch"
              className={`min-h-11 rounded-lg px-4 text-sm font-semibold transition-all ${switchOn ? 'bg-green-700' : 'bg-gray-600'}`}>
              {switchOn ? 'Closed' : 'Open'}
            </button>
          </div>

          {/* Readings */}
          <div className="bg-gray-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('ohmslaw.readings')}</h3>
            <ReadingRow label="Supply setting" value={`${voltage.toFixed(1)} V`} color="text-amber-400" />
            <ReadingRow label="Voltage across R" value={`${measuredVoltage.toFixed(1)} V`} color="text-amber-400" />
            <ReadingRow label="Resistance (R)" value={`${resistance} Ω`} color="text-indigo-400" />
            <ReadingRow label="Current (I)" value={`${currentMa.toFixed(2)} mA`} color="text-green-400" />
            <ReadingRow label="Measured R = V/I" value={current > 0 ? `${(measuredVoltage / current).toFixed(2)} Ω` : 'Not measurable'} color="text-indigo-300" />
            <div className="border-t border-gray-700 pt-3">
              <div className="text-xs text-gray-500 mb-1">Verification: I = V/R</div>
              <div className="font-mono text-sm">
                {conducting
                  ? <span className="text-green-400">{voltage.toFixed(1)} V / {resistance} Ω = {current.toFixed(5)} A</span>
                  : <span className="text-gray-400">{!connected ? 'Incomplete circuit' : 'Switch open'}: no current</span>}
              </div>
            </div>
          </div>

          {/* LED brightness indicator */}
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Current indicator</span>
              <Zap className={`h-4 w-4 ${conducting && ledBrightness > 0.1 ? 'text-yellow-400' : 'text-gray-600'}`} />
            </div>
            <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                animate={{ width: `${ledBrightness * 100}%` }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="h-full rounded-full"
                style={{ background: `rgba(251, 191, 36, ${0.4 + ledBrightness * 0.6})` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1.5 text-right">
              {current > 0 ? `${Math.round(ledBrightness * 100)}% (illustrative)` : 'OFF'}
            </div>
          </div>

          <section className="space-y-3 rounded-xl bg-gray-800 p-4" aria-label="Observation notebook">
            <h3 className="text-sm font-semibold">Observation Notebook</h3>
            <p className="text-xs text-gray-300">{distinctVoltages}/3 distinct voltages at {resistance} Ω. Changing resistance keeps separate sets; it does not combine them.</p>
            <button onClick={recordReading} disabled={!conducting || voltage <= 0 || duplicate}
              className="min-h-11 w-full rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-gray-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40">Record reading</button>
            <p className="text-xs text-gray-300">{!connected ? 'Connect all four leads to record.' : !switchOn ? 'Close the switch to record.' : voltage <= 0 ? 'Use a nonzero supply voltage to measure resistance.' : duplicate ? 'Already recorded. Select a different voltage.' : 'Capture the current meter readings in your notebook.'}</p>
            {series.length > 0 && <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <caption className="mb-2 text-left text-gray-300">Recorded at expected R = {resistance} Ω</caption>
                <thead className="text-gray-300"><tr><th scope="col" className="py-2">V (V)</th><th scope="col">I (mA)</th><th scope="col">V/I (Ω)</th></tr></thead>
                <tbody>{series.map(reading => <tr key={reading.voltage} className="border-t border-gray-700 font-mono">
                  <td className="py-2">{reading.voltage.toFixed(1)}</td><td>{(reading.current * 1000).toFixed(2)}</td><td>{(reading.voltage / reading.current).toFixed(2)}</td>
                </tr>)}</tbody>
              </table>
              <p className="mt-2 text-xs text-gray-400">R uses I in amperes (mA ÷ 1000), before display rounding.</p>
            </div>}
            {measuredResistance !== null && <p className="text-sm text-indigo-300">Mean measured R: {measuredResistance.toFixed(2)} Ω<br />Expected R: {resistance} Ω</p>}
            {distinctVoltages >= 3 && <p className="text-sm text-emerald-300">Conclusion: at fixed resistance, current increases in proportion to voltage and V/I stays at {measuredResistance?.toFixed(2)} Ω. These ideal-model observations support Ohm's law.</p>}
          </section>
          {completedResistance === null ? <button onClick={handleComplete} disabled={distinctVoltages < 3}
            className="min-h-11 w-full py-3 rounded-xl bg-green-700 text-white font-semibold text-sm hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-40">
            {distinctVoltages < 3 ? 'Record 3 distinct voltages to complete' : 'Complete experiment'}
          </button> : <div className="bg-green-900/40 border border-green-700 rounded-xl p-4 text-center text-sm text-green-300">
            Experiment complete: verified at {completedResistance} Ω using recorded observations.
          </div>}
        </div>
      </div>
    </div>
  );
}

function CircuitDiagram({ voltage, resistance, current, switchOn, conducting, ledBrightness, wires, selected, onSelect, onConnect, onToggleSwitch, onVoltage, onFeedback }: {
  voltage: number; resistance: number; current: number; switchOn: boolean; conducting: boolean; ledBrightness: number;
  wires: number[]; selected: Terminal | null;
  onSelect: (terminal: Terminal) => void; onConnect: (from: Terminal, to: Terminal) => void;
  onToggleSwitch: () => void; onVoltage: (voltage: number) => void; onFeedback: (message: string) => void;
}) {
  const wireColor = current > 0 ? '#f59e0b' : '#9ca3af';
  const glow = current > 0 ? `drop-shadow(0 0 ${ledBrightness * 10}px rgba(251,191,36,0.8))` : 'none';
  const drag = useRef<{ from: Terminal; pointerId: number; clientX: number; clientY: number; moved: boolean } | null>(null);
  const [preview, setPreview] = useState<{ from: Terminal; point: Point; target: Terminal | null } | null>(null);

  function pointerPosition(event: PointerEvent<SVGCircleElement>) {
    const matrix = event.currentTarget.ownerSVGElement?.getScreenCTM();
    if (!matrix) return null;
    // The inverse screen matrix accounts for viewBox scaling and letterboxing on any screen.
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    const target = TERMINAL_IDS.find(id => Math.hypot(TERMINALS[id].x - point.x, TERMINALS[id].y - point.y) <= 24) ?? null;
    return { point, target };
  }

  return (
    <svg viewBox="0 0 600 430" className="my-3 block h-auto w-full" aria-label="Interactive Ohm's law circuit" onKeyDown={event => {
      if (event.key === 'Escape') { drag.current = null; setPreview(null); }
    }}>
      <title>Wire the supply, switch, resistor and ammeter in series</title>
      <desc>Drag between labeled terminals, or use the terminal buttons below the diagram. The switch and supply plus and minus controls also respond to Enter or Space.</desc>
      {/* Background grid */}
      {Array.from({ length: 13 }, (_, i) => (
        <line key={`gv${i}`} x1={i * 50} y1="0" x2={i * 50} y2="430" stroke="#1f2937" strokeWidth="1" />
      ))}
      {Array.from({ length: 9 }, (_, i) => (
        <line key={`gh${i}`} x1="0" y1={i * 50} x2="600" y2={i * 50} stroke="#1f2937" strokeWidth="1" />
      ))}

      {/* Dashed guides do not conduct; only accepted student wires close the circuit. */}
      {CONNECTIONS.map((wire, index) => <path key={index} d={wire.path} fill="none"
        stroke={wires.includes(index) ? wireColor : '#374151'} strokeWidth={wires.includes(index) ? 4 : 2}
        strokeDasharray={wires.includes(index) ? undefined : '5 7'} strokeLinecap="round" pointerEvents="none" />)}
      {preview && <line x1={TERMINALS[preview.from].x} y1={TERMINALS[preview.from].y}
        x2={preview.target ? TERMINALS[preview.target].x : preview.point.x}
        y2={preview.target ? TERMINALS[preview.target].y : preview.point.y}
        stroke="#fbbf24" strokeWidth="3" strokeDasharray="6 4" pointerEvents="none" />}

      {/* ===== BATTERY ===== */}
      <rect x="115" y="100" width="70" height="150" rx="8" fill="#1f2937" stroke="#374151" strokeWidth="2" />
      <text x="150" y="128" textAnchor="middle" fontSize="10" fill="#9ca3af">DC SUPPLY</text>
      {/* + pole */}
      <line x1="150" y1="140" x2="150" y2="155" stroke="#ef4444" strokeWidth="3" />
      <line x1="143" y1="147" x2="157" y2="147" stroke="#ef4444" strokeWidth="3" />
      {/* Voltage bars */}
      {Array.from({ length: Math.round(voltage / 1.5) }, (_, i) => (
        <rect key={i} x="128" y={160 + i * 10} width="44" height="7" rx="2" fill="#f59e0b" opacity={0.4 + i * 0.1} />
      ))}
      <text x="150" y="236" textAnchor="middle" fontSize="16" fill="#f59e0b" fontWeight="700">{voltage}V</text>
      {/* - pole */}
      <line x1="143" y1="246" x2="157" y2="246" stroke="#3b82f6" strokeWidth="3" />
      {([-1, 1] as const).map(direction => <g key={direction} role="button" tabIndex={0}
        aria-label={`${direction < 0 ? 'Decrease' : 'Increase'} supply voltage by 0.5 volts`}
        className="cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-300"
        onClick={() => onVoltage(Math.max(0, Math.min(9, Number((voltage + direction * 0.5).toFixed(1)))))}
        onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onVoltage(Math.max(0, Math.min(9, Number((voltage + direction * 0.5).toFixed(1))))); } }}>
        <rect x={direction < 0 ? 95 : 155} y="30" width="50" height="44" rx="8" fill="#1f2937" stroke="#9ca3af" />
        <text x={direction < 0 ? 120 : 180} y="58" textAnchor="middle" fontSize="22" fill="#fbbf24">{direction < 0 ? '-' : '+'}</text>
      </g>)}

      {/* ===== SWITCH ===== */}
      <g role="switch" tabIndex={0} aria-label="Switch on diagram" aria-checked={switchOn}
        className="cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-300"
        onClick={onToggleSwitch} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onToggleSwitch(); } }}>
        <rect x="317" y="65" width="46" height="68" rx="8" fill="#111827" />
        <circle cx="300" cy="100" r="12" fill="#1f2937" stroke="#374151" strokeWidth="2" />
        <circle cx="380" cy="100" r="12" fill="#1f2937" stroke="#374151" strokeWidth="2" />
        {/* Switch arm */}
        <line
          x1="312" y1="100"
          x2={switchOn ? "368" : "355"}
          y2={switchOn ? "100" : "80"}
          stroke={switchOn ? '#10b981' : '#6b7280'}
          strokeWidth="3" strokeLinecap="round"
        />
        <text x="340" y="75" textAnchor="middle" fontSize="9" fill="#9ca3af">SWITCH</text>
        <text x="340" y="120" textAnchor="middle" fontSize="8" fill={switchOn ? '#10b981' : '#9ca3af'}>
          {switchOn ? 'CLOSED' : 'OPEN'}
        </text>
      </g>

      {/* ===== RESISTOR ===== */}
      <g>
        <rect x="405" y="180" width="90" height="45" rx="6" fill="#1f2937" stroke="#6b7280" strokeWidth="2" />
        {/* Resistor bands */}
        {[0,1,2,3].map((i) => (
          <rect key={i} x={415 + i * 18} y="183" width="10" height="39" rx="2"
            fill={['#f59e0b','#6366f1','#374151','#9ca3af'][i]} opacity="0.8" />
        ))}
        <text x="395" y="200" textAnchor="end" fontSize="11" fill="#a5b4fc" fontWeight="600">{resistance} Ω</text>
        <text x="395" y="214" textAnchor="end" fontSize="9" fill="#9ca3af">RESISTOR</text>
        {/* Connection wires */}
        <line x1="450" y1="150" x2="450" y2="180" stroke={wireColor} strokeWidth="3" />
        <line x1="450" y1="225" x2="450" y2="245" stroke={wireColor} strokeWidth="3" />
      </g>

      {/* ===== AMMETER (on bottom wire) ===== */}
      <g>
        <line x1="270" y1="330" x2="330" y2="330" stroke={wireColor} strokeWidth="3" />
        <circle cx="300" cy="330" r="22" fill="#1f2937" stroke="#374151" strokeWidth="2" />
        <text x="300" y="325" textAnchor="middle" fontSize="11" fill="#9ca3af" fontWeight="700">A</text>
        <text x="300" y="338" textAnchor="middle" fontSize="8" fill={conducting ? '#10b981' : '#9ca3af'}>
          {(current * 1000).toFixed(2)}
        </text>
        <text x="300" y="365" textAnchor="middle" fontSize="10" fill="#9ca3af">mA</text>
      </g>

      {/* The original LED visual is a non-loading current indicator, not a diode in series. */}
      <g transform="translate(-110 -30)" style={{ filter: glow }} pointerEvents="none">
        {/* LED body */}
        <polygon points="430,270 470,270 450,310" fill={`rgba(251,191,36,${0.2 + ledBrightness * 0.8})`} stroke="#f59e0b" strokeWidth="2" />
        <line x1="430" y1="270" x2="470" y2="270" stroke="#f59e0b" strokeWidth="2" />
        <line x1="430" y1="310" x2="470" y2="310" stroke="#f59e0b" strokeWidth="2" />
        {/* LED glow */}
        {conducting && ledBrightness > 0.1 && (
          <>
            <circle cx="450" cy="290" r={20 + ledBrightness * 25} fill={`rgba(251,191,36,${ledBrightness * 0.15})`} />
            <circle cx="450" cy="290" r={10 + ledBrightness * 12} fill={`rgba(251,191,36,${ledBrightness * 0.25})`} />
          </>
        )}
        <text x="450" y="325" textAnchor="middle" fontSize="9" fill="#9ca3af">INDICATOR ONLY</text>
      </g>

      {/* Ideal voltmeter probes are fixed across the resistor, not the indicator. */}
      <g>
        <path d="M450 150 H540 V174 M450 245 H540 V229" fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeDasharray="3 3" />
        <rect x="510" y="174" width="60" height="55" rx="8" fill="#1f2937" stroke="#60a5fa" strokeWidth="1.5" />
        <text x="540" y="193" textAnchor="middle" fontSize="9" fill="#9ca3af">V-METER</text>
        <text x="540" y="211" textAnchor="middle" fontSize="12" fill="#60a5fa" fontWeight="700">
          {conducting ? `${voltage.toFixed(1)}V` : '0.0V'}
        </text>
      </g>

      {TERMINAL_IDS.map(id => {
        const terminal = TERMINALS[id];
        const highlighted = selected === id || preview?.target === id;
        return <g key={id}>
          <circle cx={terminal.x} cy={terminal.y} r="10" fill={highlighted ? '#f59e0b' : '#111827'} stroke={highlighted ? '#fcd34d' : '#d1d5db'} strokeWidth="2" pointerEvents="none" />
          <text x={terminal.x} y={terminal.y - 28} textAnchor="middle" fontSize="11" fill="#e5e7eb" pointerEvents="none">{terminal.short}</text>
          <circle cx={terminal.x} cy={terminal.y} r="23" fill="transparent" role="button" tabIndex={0}
            aria-label={`${terminal.label} terminal`} aria-pressed={selected === id}
            className="cursor-crosshair focus-visible:outline-2 focus-visible:outline-amber-300" style={{ touchAction: 'none' }}
            onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(id); } }}
            onPointerDown={event => {
              if (event.button !== 0 || !event.isPrimary || drag.current) return;
              if (switchOn) { onFeedback('Open the switch before changing wires.'); return; }
              event.preventDefault();
              event.currentTarget.focus();
              drag.current = { from: id, pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, moved: false };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={event => {
              const active = drag.current;
              if (!active || active.pointerId !== event.pointerId) return;
              active.moved ||= Math.hypot(event.clientX - active.clientX, event.clientY - active.clientY) > 6;
              const position = pointerPosition(event);
              if (active.moved && position) setPreview({ from: active.from, ...position });
            }}
            onPointerUp={event => {
              const active = drag.current;
              if (!active || active.pointerId !== event.pointerId) return;
              const position = pointerPosition(event);
              const moved = active.moved || Math.hypot(event.clientX - active.clientX, event.clientY - active.clientY) > 6;
              drag.current = null; setPreview(null);
              if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
              if (!moved) onSelect(active.from);
              else if (position?.target) onConnect(active.from, position.target);
              else onFeedback('No terminal close enough: drop on a labeled terminal to snap the wire. Nothing was connected.');
            }}
            onPointerCancel={() => { drag.current = null; setPreview(null); onFeedback('Wire drag cancelled. Nothing was connected.'); }}
            onLostPointerCapture={() => { drag.current = null; setPreview(null); }}
          />
        </g>;
      })}

      {/* Ohm's law callout */}
      <g>
        <rect x="30" y="370" width="540" height="32" rx="8" fill="rgba(245,158,11,0.1)" stroke="rgba(245,158,11,0.3)" strokeWidth="1" />
        <text x="300" y="390" textAnchor="middle" fontSize="12" fill="#f59e0b" fontWeight="700">
          {conducting
            ? `V = I × R: ${voltage.toFixed(1)} V ≈ ${current.toFixed(5)} A × ${resistance} Ω`
            : `V = I × R | ${wires.length < CONNECTIONS.length ? 'Connect the four leads first' : 'Close the switch to measure'}`}
        </text>
      </g>
    </svg>
  );
}

function Meter({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className="min-w-0 bg-gray-800/80 backdrop-blur-sm rounded-xl px-2 py-2.5 text-center sm:px-4">
      <div className="text-[10px] text-gray-400 font-medium">{label}</div>
      <div className="text-lg font-bold font-mono sm:text-xl" style={{ color }}>{value}</div>
      <div className="text-[10px] text-gray-400">{unit}</div>
    </div>
  );
}

function ReadingRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-400">{label}</span>
      <span className={`font-mono font-semibold ${color}`}>{value}</span>
    </div>
  );
}
