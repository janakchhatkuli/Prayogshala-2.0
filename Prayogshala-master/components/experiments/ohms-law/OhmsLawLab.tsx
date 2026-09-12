'use client';
import { useEffect, useId, useRef, useState, type PointerEvent } from 'react';
import { motion } from 'framer-motion';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter,
} from 'recharts';
import { Zap } from 'lucide-react';
import LabWorkspace from '@/components/lab/LabWorkspace';
import type { DemoStep } from '@/components/lab/useDemoRunner';
import { useStore } from '@/lib/store';
import { useT } from '@/hooks/useTranslation';

const VOLTAGES = [1.5, 3, 4.5, 6, 9];
const RESISTORS = [10, 47, 100, 220, 470];

type Mode = 'circuit' | 'plot';
type Point = { x: number; y: number };
const TERMINALS = {
  positive: { x: 186, y: 252, label: 'Supply +', short: '+' },
  switchIn: { x: 306, y: 115, label: 'Switch input', short: 'S1' },
  switchOut: { x: 392, y: 115, label: 'Switch output', short: 'S2' },
  resistorIn: { x: 475, y: 128, label: 'Resistor input', short: 'R1' },
  resistorOut: { x: 595, y: 128, label: 'Resistor output', short: 'R2' },
  ammeterIn: { x: 425, y: 365, label: 'Ammeter +', short: 'A+' },
  ammeterOut: { x: 355, y: 365, label: 'Ammeter -', short: 'A-' },
  negative: { x: 116, y: 252, label: 'Supply -', short: '-' },
} as const;
type Terminal = keyof typeof TERMINALS;
const TERMINAL_IDS = Object.keys(TERMINALS) as Terminal[];
const CONNECTIONS: { from: Terminal; to: Terminal; path: string }[] = [
  { from: 'positive', to: 'switchIn', path: 'M186 252 C186 324 265 302 265 204 S270 115 306 115' },
  { from: 'switchOut', to: 'resistorIn', path: 'M392 115 C408 51 462 58 475 128' },
  { from: 'resistorOut', to: 'ammeterIn', path: 'M595 128 C644 139 584 409 487 410 S425 391 425 365' },
  { from: 'ammeterOut', to: 'negative', path: 'M355 365 C355 435 116 407 116 252' },
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

  const readingAt = (v: number): Reading => ({ voltage: v, current: v / 100, resistance: 100 });
  const demo: DemoStep[] = [
    { caption: 'Lead 1: supply positive to the switch. The switch stays open while wiring.', run: () => { setRes(100); setSwitchOn(false); setWires([0]); } },
    { caption: 'Lead 2: switch to the 100 ohm resistor.', run: () => setWires([0, 1]) },
    { caption: 'Lead 3: resistor to the ammeter positive terminal.', run: () => setWires([0, 1, 2]) },
    { caption: 'Lead 4: ammeter back to supply negative. The series circuit is complete.', run: () => setWires([0, 1, 2, 3]) },
    { caption: 'Set 2 V and close the switch. The ammeter reads 20 mA.', run: () => { setVoltage(2); setSwitchOn(true); }, wait: 1800 },
    { caption: 'Record 2 V, 20 mA.', run: () => setReadings([readingAt(2)]) },
    { caption: 'Turn the supply to 4 V. Current doubles to 40 mA.', run: () => setVoltage(4), wait: 1600 },
    { caption: 'Record 4 V, 40 mA.', run: () => setReadings([readingAt(2), readingAt(4)]) },
    { caption: 'Turn to 6 V: 60 mA. Current rises in step with voltage.', run: () => setVoltage(6), wait: 1600 },
    { caption: 'Record 6 V, 60 mA, then open the switch.', run: () => { setReadings([readingAt(2), readingAt(4), readingAt(6)]); setSwitchOn(false); } },
    { caption: 'Plot I against V: a straight line through the origin. V / I = 100 ohm every time.', run: () => setMode('plot'), wait: 2600 },
  ];

  return (
    <LabWorkspace experimentId="ohms-law" demo={demo} title={t('ohmslaw.title')} subject="Physics"
      intro="Wire a series circuit, adjust the DC supply and compare current at three voltages. The resistor and meters are ideal: heating, lead resistance and meter loading are ignored."
      equipment={['DC bench supply', 'Knife switch', 'Resistor board', 'Two digital meters', 'Four patch leads']}
      steps={['Connect four leads', 'Close switch and adjust voltage', 'Record three voltages', 'Compare I against V']}
      currentStep={distinctVoltages >= 3 ? 3 : conducting ? 2 : connected ? 1 : 0}
      complete={completedResistance !== null} onReset={reset}
      children={<div onKeyDown={event => {
      if (event.key === 'Escape') { setSelected(null); setFeedback('Connection cancelled.'); }
    }}>

      {/* ===================== CIRCUIT DISPLAY ===================== */}
      <div className="min-w-0 p-3 sm:p-5">

        <div className="flex items-center justify-between gap-3">

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
      </div></div>}
      controls={<div className="grid min-w-0 grid-cols-1 gap-5 text-white [overflow-wrap:anywhere] md:grid-cols-2">
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
                  disabled={switchOn}
                  onClick={() => { if (switchOn) return; setRes(r); setFeedback(`Resistor set to ${r} Ω. Readings are grouped by resistance; collect three distinct voltages for one resistor.`); }} aria-pressed={resistance === r}
                  className={`min-h-11 w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50 ${resistance === r ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
                  <span className="font-mono">{r} Ω</span>
                  <span className="text-xs opacity-80">{readings.filter(reading => reading.resistance === r).length} recorded</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-400">Open the switch before replacing the resistor. Bands identify its nominal value; the model uses exact resistance.</p>
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

      </div>}
      observations={<>
          <section className="space-y-3" aria-label="Recorded electrical observations">
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
      </>}
      conclusion={distinctVoltages >= 3 ? `At ${resistance} Ω, recorded V/I = ${measuredResistance?.toFixed(2)} Ω. The I-versus-V slope is ${slope?.toFixed(3)} mA/V. Current is proportional to voltage at fixed resistance.` : 'Collect at least three nonzero voltages for one resistor. Compare the recorded I-versus-V plot, not theoretical points.'}
    />
  );
}

function CircuitDiagram({ voltage, resistance, current, switchOn, conducting, ledBrightness, wires, selected, onSelect, onConnect, onToggleSwitch, onVoltage, onFeedback }: {
  voltage: number; resistance: number; current: number; switchOn: boolean; conducting: boolean; ledBrightness: number;
  wires: number[]; selected: Terminal | null;
  onSelect: (terminal: Terminal) => void; onConnect: (from: Terminal, to: Terminal) => void;
  onToggleSwitch: () => void; onVoltage: (voltage: number) => void; onFeedback: (message: string) => void;
}) {
  const id = useId().replace(/:/g, '');
  const knob = useRef<number | null>(null);
  const knobElement = useRef<SVGGElement>(null);
  const bands = resistance === 10 ? ['#713f12', '#171717', '#171717']
    : resistance === 47 ? ['#eab308', '#7c3aed', '#171717']
    : resistance === 100 ? ['#713f12', '#171717', '#713f12']
    : resistance === 220 ? ['#dc2626', '#dc2626', '#713f12'] : ['#eab308', '#7c3aed', '#713f12'];
  const drag = useRef<{ from: Terminal; pointerId: number; clientX: number; clientY: number; moved: boolean } | null>(null);
  const [preview, setPreview] = useState<{ from: Terminal; point: Point; target: Terminal | null } | null>(null);

  useEffect(() => {
    const element = knobElement.current;
    if (!element) return;
    // A non-passive listener keeps wheel adjustment from scrolling the bench away.
    function wheel(event: WheelEvent) {
      event.preventDefault();
      if (event.deltaY) onVoltage(Math.max(0, Math.min(9, Number((voltage + (event.deltaY < 0 ? .1 : -.1)).toFixed(1)))));
    }
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [voltage, onVoltage]);

  function turnKnob(event: PointerEvent<SVGGElement>) {
    const matrix = event.currentTarget.ownerSVGElement?.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    const degrees = Math.atan2(point.x - 151, 185 - point.y) * 180 / Math.PI;
    onVoltage(Math.round(Math.max(0, Math.min(9, (degrees + 135) / 270 * 9)) * 10) / 10);
  }

  function pointerPosition(event: PointerEvent<SVGCircleElement>) {
    const matrix = event.currentTarget.ownerSVGElement?.getScreenCTM();
    if (!matrix) return null;
    // The inverse screen matrix accounts for viewBox scaling and letterboxing on any screen.
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    const target = TERMINAL_IDS.find(id => Math.hypot(TERMINALS[id].x - point.x, TERMINALS[id].y - point.y) <= 24) ?? null;
    return { point, target };
  }

  return (
    <svg viewBox="0 0 800 460" className="my-3 block h-auto w-full" aria-label="Interactive Ohm's law circuit" onKeyDown={event => {
      if (event.key === 'Escape') { drag.current = null; knob.current = null; setPreview(null); }
    }}>
      <title>Wire the supply, switch, resistor and ammeter in series</title>
      <desc>Drag between labeled terminals, or use the terminal buttons below the diagram. The switch and supply plus and minus controls also respond to Enter or Space.</desc>
      <defs>
        <linearGradient id={`${id}-metal`} x2="0" y2="1"><stop stopColor="#d0d6d8"/><stop offset="1" stopColor="#8b969e"/></linearGradient>
        <linearGradient id={`${id}-ceramic`} x2="0" y2="1"><stop stopColor="#baa16f"/><stop offset=".35" stopColor="#f1d7a2"/><stop offset="1" stopColor="#a88a54"/></linearGradient>
        <filter id={`${id}-shadow`} x="-20%" y="-20%" width="150%" height="160%"><feDropShadow dx="3" dy="6" stdDeviation="3" floodOpacity=".35"/></filter>
      </defs>
      <rect x="4" y="4" width="792" height="452" rx="10" fill="#253b3b"/>
      {Array.from({ length: 20 }, (_, i) => <path key={i} d={`M${i*40} 40 V425 M20 ${i*40} H780`} stroke="#a7c3ba" opacity=".06"/>)}
      <text x="28" y="30" fill="#b8cbc5" fontSize="12" letterSpacing="3">ELECTRICITY / BENCH 01</text>
      <g filter={`url(#${id}-shadow)`}>
        <path d="M48 79 L65 63 H237 V267 L220 284 H48Z" fill="#596770"/>
        <rect x="48" y="79" width="172" height="205" rx="6" fill={`url(#${id}-metal)`} stroke="#e2e8f0"/>
        <text x="64" y="100" fontSize="10" fill="#24333d" fontWeight="700">REGULATED DC / 0-9 V</text>
        <rect x="65" y="112" width="138" height="38" rx="3" fill="#1e2d29" stroke="#66736e" strokeWidth="3"/>
        <text x="190" y="139" textAnchor="end" fontFamily="monospace" fontSize="25" fill="#c9e5bd">{voltage.toFixed(1)} V</text>
        <circle cx="77" cy="184" r="5" fill={conducting ? '#75b97c' : '#394c40'}/>
        <text x="64" y="205" fontSize="8" fill="#24333d">OUTPUT</text>
        <text x="151" y="227" textAnchor="middle" fontSize="9" fill="#24333d">VOLTAGE</text>
        {[60,208].map(x => <g key={x}><circle cx={x} cy="271" r="3" fill="#58666e"/><path d={`M${x-2} 271 h4`} stroke="#ccd5da"/></g>)}
      </g>
      <g ref={knobElement} role="slider" tabIndex={0} aria-label="Supply voltage knob" aria-valuemin={0} aria-valuemax={9} aria-valuenow={voltage} aria-valuetext={`${voltage.toFixed(1)} volts`}
        className="cursor-grab focus-visible:outline-2 focus-visible:outline-amber-300" style={{ touchAction: 'none' }}
        onPointerDown={event => { if (event.button !== 0 || !event.isPrimary) return; event.preventDefault(); event.currentTarget.focus(); knob.current = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId); turnKnob(event); }}
        onPointerMove={event => { if (knob.current === event.pointerId) turnKnob(event); }}
        onPointerUp={event => { if (knob.current !== event.pointerId) return; turnKnob(event); knob.current = null; event.currentTarget.releasePointerCapture(event.pointerId); }}
        onPointerCancel={() => { knob.current = null; }} onLostPointerCapture={() => { knob.current = null; }}
        onKeyDown={event => { const delta = { ArrowUp: .1, ArrowRight: .1, ArrowDown: -.1, ArrowLeft: -.1, PageUp: 1, PageDown: -1 }[event.key]; if (delta !== undefined || event.key === 'Home' || event.key === 'End') { event.preventDefault(); onVoltage(event.key === 'Home' ? 0 : event.key === 'End' ? 9 : Math.max(0, Math.min(9, Number((voltage + (delta ?? 0)).toFixed(1))))); } }}>
        <title>Drag around the knob, scroll, or use arrow keys to adjust voltage</title>
        <circle cx="151" cy="185" r="31" fill="#65717a" stroke="#eff2f3"/>
        <circle cx="151" cy="185" r="25" fill="#263139" stroke="#101a21" strokeWidth="4"/>
        {Array.from({ length: 10 }, (_, i) => <path key={i} d="M151 150 v4" stroke="#263139" transform={`rotate(${-135+i*30} 151 185)`}/>)}
        <path d="M151 183 V164" stroke="#f4e4b5" strokeWidth="3" strokeLinecap="round" transform={`rotate(${-135+voltage*30} 151 185)`}/>
      </g>
      {([-1, 1] as const).map(direction => <g key={direction} role="button" tabIndex={0}
        aria-label={`${direction < 0 ? 'Decrease' : 'Increase'} supply voltage by 0.5 volts`}
        className="cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-300"
        onClick={() => onVoltage(Math.max(0, Math.min(9, Number((voltage + direction * 0.5).toFixed(1)))))}
        onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onVoltage(Math.max(0, Math.min(9, Number((voltage + direction * 0.5).toFixed(1))))); } }}>
        <rect x={direction < 0 ? 51 : 173} y="297" width="44" height="44" rx="6" fill="#1f2937" stroke="#9ca3af" />
        <text x={direction < 0 ? 73 : 195} y="325" textAnchor="middle" fontSize="22" fill="#fbbf24">{direction < 0 ? '-' : '+'}</text>
      </g>)}

      {/* ===== SWITCH ===== */}
      <g role="switch" tabIndex={0} aria-label="Switch on diagram" aria-checked={switchOn}
        className="cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-300"
        onClick={onToggleSwitch} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onToggleSwitch(); } }}>
        <rect x="281" y="83" width="135" height="79" rx="6" fill="#17232a" stroke="#687780" filter={`url(#${id}-shadow)`}/>
        {/* Switch arm */}
        <line
          x1="306" y1="115"
          x2={switchOn ? "392" : "370"}
          y2={switchOn ? "115" : "86"}
          stroke="#c7a66b"
          strokeWidth="7" strokeLinecap="round"
        />
        <rect x="334" y={switchOn ? 105 : 89} width="28" height="16" rx="4" fill="#923f31"/>
        <text x="350" y="148" textAnchor="middle" fontSize="10" fill={switchOn ? '#a7d8a0' : '#cbd5e1'}>
          {switchOn ? 'CLOSED' : 'OPEN'}
        </text>
      </g>

      {/* ===== RESISTOR ===== */}
      <g>
        <rect x="448" y="87" width="175" height="87" rx="6" fill="#78533a" stroke="#ad8b68" filter={`url(#${id}-shadow)`}/>
        <path d="M475 128 H595" stroke="#c4cbd0" strokeWidth="4"/>
        <rect x="497" y="114" width="77" height="28" rx="11" fill={`url(#${id}-ceramic)`} stroke="#957748"/>
        {[...bands, '#b89443'].map((color, i) => <rect key={i} x={507 + i*15 + (i===3 ? 5 : 0)} y="115" width="6" height="26" fill={color}/>)}
        <text x="535" y="161" textAnchor="middle" fontSize="11" fill="#fff0ce">{resistance} Ω / NOMINAL</text>
      </g>

      {[{ x: 315, label: 'DC AMMETER', unit: 'mA', value: (current*1000).toFixed(2) }, { x: 620, label: 'DC VOLTMETER', unit: 'V', value: conducting ? voltage.toFixed(1) : '0.0' }].map(meter => <g key={meter.unit} transform={`translate(${meter.x} 209)`}>
        <rect width="150" height="178" rx="17" fill="#bd933c" stroke="#e1b859" strokeWidth="3" filter={`url(#${id}-shadow)`}/>
        <rect x="8" y="8" width="134" height="155" rx="11" fill="#293238"/>
        <text x="75" y="27" textAnchor="middle" fontSize="10" fill="#e5e7eb">{meter.label}</text>
        <rect x="19" y="37" width="112" height="43" rx="3" fill="#c1ccb3" stroke="#111d23" strokeWidth="4"/>
        <text x="123" y="64" textAnchor="end" fontSize="23" fontFamily="monospace" fill="#263b30">{meter.value}</text>
        <circle cx="75" cy="112" r="24" fill="#172127" stroke="#667278" strokeWidth="2"/>
        <path d="M75 110 L87 95" stroke="#e4e8ea" strokeWidth="3"/>
        <text x="112" y="99" fontSize="10" fill="#d1d5db">{meter.unit}</text>
        {meter.unit === 'V' && <><text x="40" y="140" textAnchor="middle" fontSize="8" fill="#e5e7eb">COM</text><text x="110" y="140" textAnchor="middle" fontSize="8" fill="#e5e7eb">V</text></>}
        {meter.unit === 'V' && [40,110].map((x,i) => <circle key={x} cx={x} cy="156" r="9" fill="#101820" stroke={i ? '#bf5145' : '#75818a'} strokeWidth="4"/>)}
      </g>)}
      <circle cx="288" cy="218" r="6" fill={`rgb(${75+Math.round(ledBrightness*160)}, ${65+Math.round(ledBrightness*100)}, 40)`} stroke="#a09c83"/>
      <text x="288" y="238" textAnchor="middle" fontSize="8" fill="#bdcbc7">I indicator</text>
      {/* Insulated cables retain their physical color, whether or not current flows. */}
      <g fill="none" strokeLinecap="round" pointerEvents="none">
        <path d="M475 128 C450 203 780 168 784 216 S798 414 756 404 Q730 398 730 365" stroke="#ad4940" strokeWidth="4"/>
        <path d="M595 128 C629 175 598 305 603 359 S657 422 660 365" stroke="#151e26" strokeWidth="4"/>
        {CONNECTIONS.map((wire, index) => <g key={index}>
          {wires.includes(index) && <path d={wire.path} stroke="#071419" strokeWidth="9" transform="translate(2 3)" opacity=".45"/>}
          <path d={wire.path} stroke={wires.includes(index) ? index === 3 ? '#141d25' : '#ba4d40' : '#92a7a0'} strokeWidth={wires.includes(index) ? 6 : 1.5} strokeDasharray={wires.includes(index) ? undefined : '4 7'} opacity={wires.includes(index) ? 1 : .4}/>
          {wires.includes(index) && <path d={wire.path} stroke={index === 3 ? '#6b7883' : '#e98b74'} strokeWidth="1" opacity=".55"/>}
        </g>)}
        {preview && <path d={`M${TERMINALS[preview.from].x} ${TERMINALS[preview.from].y} Q${TERMINALS[preview.from].x} ${(preview.target ? TERMINALS[preview.target].y : preview.point.y)+50} ${preview.target ? TERMINALS[preview.target].x : preview.point.x} ${preview.target ? TERMINALS[preview.target].y : preview.point.y}`} stroke="#fbbf24" strokeWidth="4" strokeDasharray="6 4"/>}
      </g>

      {TERMINAL_IDS.map(id => {
        const terminal = TERMINALS[id];
        const highlighted = selected === id || preview?.target === id;
        return <g key={id}>
          <circle cx={terminal.x} cy={terminal.y} r="11" fill="#202a31" stroke={highlighted ? '#fcd34d' : id === 'negative' || id === 'ammeterOut' ? '#7a8792' : '#c55848'} strokeWidth="4" pointerEvents="none" />
          <circle cx={terminal.x} cy={terminal.y} r="5" fill="#10181c" stroke="#b7a785" strokeWidth="2" pointerEvents="none"/>
          <text x={terminal.x} y={terminal.y - 18} textAnchor="middle" fontSize="10" fill={id === 'negative' || id === 'positive' ? '#24333d' : '#e5e7eb'} pointerEvents="none">{terminal.short}</text>
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
        <rect x="20" y="423" width="760" height="26" rx="4" fill="#172c2c" />
        <text x="400" y="441" textAnchor="middle" fontSize="12" fill="#e4d2a2" fontWeight="700">
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
    <div className="flex flex-wrap items-center justify-between gap-x-3 text-sm">
      <span className="text-gray-400">{label}</span>
      <span className={`font-mono font-semibold ${color}`}>{value}</span>
    </div>
  );
}
