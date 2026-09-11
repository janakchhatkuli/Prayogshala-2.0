'use client';

import { useEffect, useRef, useState } from 'react';
import LabWorkspace from '@/components/lab/LabWorkspace';
import type { DemoStep } from '@/components/lab/useDemoRunner';
import { useStore } from '@/lib/store';

const TUBE_ML = 30;
// mL of hydrogen per second at 6 V with dilute acid; scales with voltage and acid presence.
const RATE_H2 = 0.9;

export default function ElectrolysisLab() {
  const save = useStore(s => s.completeExperiment);
  const [filled, setFilled] = useState(false);
  const [acid, setAcid] = useState(false);
  const [voltage, setVoltage] = useState(6);
  const [power, setPower] = useState(false);
  const [h2, setH2] = useState(0);
  const [o2, setO2] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [tested, setTested] = useState<{ h2?: boolean; o2?: boolean }>({});
  const [complete, setComplete] = useState(false);
  const [feedback, setFeedback] = useState('Fill both tubes with water, add a few drops of dilute sulfuric acid, then connect the supply.');
  const last = useRef<number | null>(null);

  const conducting = filled && acid && power && voltage > 0;
  const full = h2 >= TUBE_ML;

  useEffect(() => {
    if (!conducting || full || complete) { last.current = null; return; }
    let frame: number;
    const tick = (now: number) => {
      if (last.current !== null) {
        const dt = (now - last.current) / 1000;
        const rate = RATE_H2 * (voltage / 6);
        setH2(v => Math.min(TUBE_ML, v + rate * dt));
        setO2(v => Math.min(TUBE_ML / 2, v + (rate / 2) * dt));
        setSeconds(s => s + dt);
      }
      last.current = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [conducting, full, complete, voltage]);

  useEffect(() => { if (full) setFeedback('Hydrogen tube full. Switch off, compare the volumes and test each gas.'); }, [full]);

  const ratio = o2 > 0 ? h2 / o2 : 0;
  const currentStep = !filled ? 0 : !acid ? 1 : h2 < 5 ? 2 : !(tested.h2 && tested.o2) ? 3 : 4;
  const reset = () => { setFilled(false); setAcid(false); setVoltage(6); setPower(false); setH2(0); setO2(0); setSeconds(0); setTested({}); setComplete(false); setFeedback('Bench reset. Fill the tubes to begin.'); };
  const h2Ref = useRef(h2); h2Ref.current = h2;

  const demo: DemoStep[] = [
    { caption: 'Fill both graduated tubes with water through the top reservoir.', run: () => setFilled(true) },
    { caption: 'Connect the supply. Almost nothing happens: pure water barely conducts.', run: () => { setVoltage(6); setPower(true); }, wait: 2200 },
    { caption: 'Add a few drops of dilute sulfuric acid. Ions now carry the current and bubbles appear at both electrodes.', run: () => setAcid(true), wait: 1800 },
    { caption: 'Raise the voltage to 12 V. Gas collects faster; the cathode tube fills about twice as fast as the anode tube.', run: () => setVoltage(12), until: () => h2Ref.current >= 12, wait: 800 },
    { caption: 'Switch off the supply and compare: roughly 2 volumes of gas at the cathode for every 1 at the anode.', run: () => setPower(false), wait: 1800 },
    { caption: 'Lit splint at the cathode gas: a squeaky pop. Hydrogen.', run: () => setTested(t => ({ ...t, h2: true })), wait: 1600 },
    { caption: 'Glowing splint at the anode gas relights. Oxygen. Water is H2O: two hydrogens for every oxygen.', run: () => setTested(t => ({ ...t, o2: true })), wait: 2000 },
  ];

  const tubeFill = (ml: number) => (ml / TUBE_ML) * 150;

  return (
    <div lang="en">
      <LabWorkspace experimentId="electrolysis" demo={demo} title="Electrolysis of water" subject="Chemistry"
        intro="What is water made of, and in what proportion? Pass a direct current through acidified water using a Hofmann-style apparatus, collect the gases above each electrode and compare their volumes. Then identify each gas with a simple test."
        equipment={['Hofmann voltameter (two graduated tubes)', 'Platinum electrodes', '6 V DC supply with control', 'Dilute sulfuric acid', 'Lit splint and glowing splint']}
        steps={['Fill tubes with water', 'Add dilute acid', 'Pass current and collect gas', 'Test both gases', 'Compare volumes']}
        currentStep={currentStep} complete={complete} onReset={reset}
        controls={<div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-fg-2">Supply voltage <strong className="num float-right text-chemistry">{voltage} V</strong>
              <input aria-label="Supply voltage" type="range" min="0" max="12" step="1" value={voltage} disabled={complete} onChange={e => setVoltage(Number(e.target.value))} className="mt-2 w-full" /></label>
            <div className="flex flex-wrap items-end gap-2">
              <button className="lab-button" disabled={filled || complete} onClick={() => { setFilled(true); setFeedback('Tubes filled. Pure water barely conducts; add a little dilute acid.'); }}>Fill tubes</button>
              <button className="lab-button" disabled={!filled || acid || complete} onClick={() => { setAcid(true); setFeedback('Acid added: ions now carry the current. Connect the supply.'); }}>Add dilute H2SO4</button>
              <button className="lab-button" aria-pressed={power} disabled={!filled || complete} onClick={() => { setPower(v => !v); setFeedback(!power ? (acid ? 'Current flowing. Watch the bubbles at each electrode.' : 'Almost no current: pure water is a poor conductor.') : 'Supply off.'); }}>{power ? 'Supply on' : 'Connect supply'}</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="lab-button" disabled={h2 < 5 || power || complete || tested.h2} onClick={() => { setTested(t => ({ ...t, h2: true })); setFeedback('Lit splint at the cathode tube: the gas burns with a squeaky pop. Hydrogen.'); }}>Lit splint: cathode gas</button>
            <button className="lab-button" disabled={o2 < 2.5 || power || complete || tested.o2} onClick={() => { setTested(t => ({ ...t, o2: true })); setFeedback('Glowing splint at the anode tube relights. Oxygen.'); }}>Glowing splint: anode gas</button>
            <button className="lab-button lab-button-primary" disabled={!(tested.h2 && tested.o2) || complete} onClick={() => { save('electrolysis', Math.abs(ratio - 2) < 0.15 ? 100 : 90); setComplete(true); setFeedback('Experiment saved.'); }}>Complete experiment</button>
          </div>
          <p className="text-xs text-muted">Switch the supply off before testing gases. The model ignores gas dissolving in water, so the ratio is exactly 2 : 1.</p>
          <p role="status" className="text-sm text-accent-2">{feedback}</p>
        </div>}
        observations={<div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div className="lab-readout"><p className="label text-muted">Cathode (-)</p><p className="num mt-1 text-xl text-fg">{h2.toFixed(1)} mL</p></div>
            <div className="lab-readout"><p className="label text-muted">Anode (+)</p><p className="num mt-1 text-xl text-fg">{o2.toFixed(1)} mL</p></div>
          </div>
          <p className="text-fg-2">Volume ratio: <strong className="num text-chemistry">{o2 > 0.2 ? ratio.toFixed(2) : '--'} : 1</strong></p>
          <p className="text-fg-2">Time: <span className="num">{seconds.toFixed(0)} s</span> at <span className="num">{voltage} V</span></p>
          <ul className="space-y-1 text-xs text-muted">
            <li>Cathode gas: {tested.h2 ? <span className="text-ok">squeaky pop, hydrogen</span> : 'not tested'}</li>
            <li>Anode gas: {tested.o2 ? <span className="text-ok">relights glowing splint, oxygen</span> : 'not tested'}</li>
          </ul>
          <p className="num rounded border border-line p-3 text-xs">2 H2O(l) -&gt; 2 H2(g) + O2(g)</p>
        </div>}
        conclusion={complete
          ? <><p><strong>Result:</strong> {h2.toFixed(1)} mL hydrogen at the cathode and {o2.toFixed(1)} mL oxygen at the anode, a ratio of {ratio.toFixed(2)} : 1.</p><p className="mt-3">Water decomposes into hydrogen and oxygen in a 2 : 1 ratio by volume, matching the formula H2O. Hydrogen forms at the negative electrode (cathode) and oxygen at the positive electrode (anode). The acid supplies ions so current can flow; it is not used up.</p></>
          : 'Twice as much gas should collect above the cathode as above the anode. The cathode gas pops with a lit splint; the anode gas relights a glowing splint.'}
      >
        <svg viewBox="0 0 800 470" role="group" aria-label="Hofmann voltameter with two graduated tubes and a DC supply">
          <defs>
            <linearGradient id="el-water" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#60a5fa" stopOpacity=".35" /><stop offset="1" stopColor="#2563eb" stopOpacity=".5" /></linearGradient>
            <linearGradient id="el-glass" x1="0" x2="1"><stop stopColor="#fff" stopOpacity=".16" /><stop offset=".5" stopColor="#fff" stopOpacity=".03" /><stop offset="1" stopColor="#fff" stopOpacity=".12" /></linearGradient>
          </defs>
          <text x="30" y="35" fill="#8a8a8f" fontFamily="var(--font-jetbrains)" fontSize="11" letterSpacing="3">ELECTROCHEMISTRY / BENCH 05</text>
          <rect x="0" y="420" width="800" height="50" fill="#1f1f21" /><rect x="0" y="420" width="800" height="3" fill="#fe5b2a" />
          {/* reservoir bulb */}
          <circle cx="400" cy="120" r="44" fill={filled ? 'url(#el-water)' : 'url(#el-glass)'} stroke="#c9c9c6" strokeWidth="1.5" />
          <rect x="392" y="60" width="16" height="30" fill="url(#el-glass)" stroke="#c9c9c6" strokeWidth="1.5" />
          <path d="M356 120 H260 V180 M444 120 H540 V180" stroke="#c9c9c6" strokeWidth="1.5" fill="none" />
          <path d="M256 120 h8 M536 120 h8" stroke="#c9c9c6" />
          {/* tubes */}
          {[{ x: 260, ml: h2, label: 'CATHODE (-)', gas: 'H2', sign: '-' }, { x: 540, ml: o2, label: 'ANODE (+)', gas: 'O2', sign: '+' }].map(t => (
            <g key={t.x}>
              <rect x={t.x - 22} y="170" width="44" height="200" rx="6" fill="url(#el-glass)" stroke="#c9c9c6" strokeWidth="1.5" />
              {/* water level drops as gas collects at the top */}
              {filled && <rect x={t.x - 20} y={172 + tubeFill(t.ml)} width="40" height={196 - tubeFill(t.ml)} rx="4" fill="url(#el-water)" />}
              {filled && t.ml > 0.3 && <rect x={t.x - 20} y="172" width="40" height={tubeFill(t.ml)} rx="4" fill={t.gas === 'H2' ? 'rgba(242,242,240,.08)' : 'rgba(96,165,250,.08)'} />}
              {Array.from({ length: 7 }, (_, k) => <g key={k}><line x1={t.x + 22} x2={t.x + 30} y1={172 + k * 25} y2={172 + k * 25} stroke="#8a8a8f" /><text x={t.x + 33} y={175 + k * 25} fontSize="8" fill="#8a8a8f" fontFamily="var(--font-jetbrains)">{k * 5}</text></g>)}
              {/* electrode */}
              <rect x={t.x - 2} y="330" width="4" height="60" fill="#c9c9c6" /><rect x={t.x - 8} y="322" width="16" height="10" rx="1" fill="#e5e5e5" />
              <line x1={t.x} y1="390" x2={t.x} y2="420" stroke={t.sign === '-' ? '#60a5fa' : '#f87171'} strokeWidth="2" />
              {/* bubbles */}
              {conducting && !full && Array.from({ length: t.gas === 'H2' ? 6 : 3 }, (_, k) => (
                <circle key={k} cx={t.x - 10 + k * 4} cy="318" r={1.5 + (k % 2)} fill="#fff" opacity=".7" className="bubble" style={{ animationDelay: `${k * 0.45}s`, animationDuration: `${2 + (k % 3) * 0.4}s` }} />
              ))}
              <text x={t.x} y="160" textAnchor="middle" fontSize="9" fill="#8a8a8f" fontFamily="var(--font-jetbrains)" letterSpacing="1.5">{t.label}</text>
              <text x={t.x} y={190 + tubeFill(t.ml) / 2} textAnchor="middle" fontSize="11" fill="#f2f2f0" fontFamily="var(--font-jetbrains)" opacity={t.ml > 3 ? 1 : 0}>{t.gas} {t.ml.toFixed(1)} mL</text>
            </g>
          ))}
          {/* stopcocks */}
          <rect x="248" y="150" width="24" height="8" rx="2" fill="#5f5f66" /><rect x="528" y="150" width="24" height="8" rx="2" fill="#5f5f66" />
          {/* power supply */}
          <g transform="translate(330 300)">
            <rect width="140" height="110" rx="6" fill="#161618" stroke="#3a3a3f" />
            <text x="12" y="20" fill="#8a8a8f" fontFamily="var(--font-jetbrains)" fontSize="9" letterSpacing="2">DC SUPPLY</text>
            <text x="12" y="52" fill={conducting ? '#4ade80' : '#5f5f66'} fontFamily="var(--font-jetbrains)" fontSize="24" fontWeight="600">{power ? voltage.toFixed(1) : '0.0'}<tspan fontSize="10" fill="#8a8a8f"> V</tspan></text>
            <text x="12" y="72" fill="#8a8a8f" fontFamily="var(--font-jetbrains)" fontSize="9">I = {conducting ? (0.15 * voltage / 6).toFixed(2) : power && filled ? '0.00' : '0.00'} A</text>
            <circle cx="120" cy="16" r="4" fill={power ? '#fe5b2a' : '#3a3a3f'} className={power ? 'led-on' : ''} />
            <circle cx="30" cy="94" r="6" fill="#60a5fa" /><text x="30" y="97" textAnchor="middle" fontSize="8" fill="#0f0f10" fontWeight="700">-</text>
            <circle cx="110" cy="94" r="6" fill="#f87171" /><text x="110" y="97" textAnchor="middle" fontSize="8" fill="#0f0f10" fontWeight="700">+</text>
          </g>
          <path d="M260 420 H360 V394" stroke="#60a5fa" strokeWidth="2" fill="none" opacity={power ? 1 : .4} />
          <path d="M540 420 H440 V394" stroke="#f87171" strokeWidth="2" fill="none" opacity={power ? 1 : .4} />
          {/* acid bottle */}
          <g transform="translate(120 330)" opacity={acid ? .5 : 1}>
            <rect width="44" height="70" rx="4" fill="#1f1f21" stroke="#3a3a3f" /><rect x="14" y="-12" width="16" height="14" rx="2" fill="#3a3a3f" />
            <rect x="6" y="26" width="32" height="26" fill="#f2f2f0" /><text x="22" y="38" textAnchor="middle" fontSize="8" fill="#0f0f10" fontWeight="700" fontFamily="var(--font-jetbrains)">H2SO4</text><text x="22" y="47" textAnchor="middle" fontSize="6" fill="#5f5f66">dilute</text>
          </g>
          {filled && !acid && power && <text x="400" y="250" textAnchor="middle" fill="#fbbf24" fontSize="11" fontFamily="var(--font-jetbrains)">NO IONS: ALMOST NO CURRENT</text>}
          <text x="30" y="450" fill="#8a8a8f" fontSize="11" fontFamily="var(--font-jetbrains)">H2 : O2 = {o2 > 0.2 ? ratio.toFixed(2) : '--'} : 1</text>
          <text x="560" y="450" fill="#8a8a8f" fontSize="11" fontFamily="var(--font-jetbrains)">{conducting ? 'ELECTROLYSIS RUNNING' : 'IDLE'}</text>
        </svg>
      </LabWorkspace>
    </div>
  );
}
