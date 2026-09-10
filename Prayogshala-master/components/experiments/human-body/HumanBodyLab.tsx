'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { REGIONS, SYSTEM_INFO, SYSTEMS, type System } from './anatomy';
import type { BodyScene, CameraCommand } from './scene';
import styles from './human-body.module.css';

const CAMERA_BUTTONS: { command: CameraCommand; label: string }[] = [
  { command: 'left', label: 'Orbit left' }, { command: 'right', label: 'Orbit right' },
  { command: 'up', label: 'Orbit up' }, { command: 'down', label: 'Orbit down' },
  { command: 'in', label: 'Zoom in' }, { command: 'out', label: 'Zoom out' },
  { command: 'pan-left', label: 'Pan left' }, { command: 'pan-right', label: 'Pan right' },
  { command: 'pan-up', label: 'Pan up' }, { command: 'pan-down', label: 'Pan down' },
];

export default function HumanBodyLab() {
  const host = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLDivElement>(null);
  const scene = useRef<BodyScene | null>(null);
  const [system, setSystem] = useState<System>('body');
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [visited, setVisited] = useState<System[]>([]);
  const [observed, setObserved] = useState<Partial<Record<System, string>>>({});
  const [note, setNote] = useState('');
  const completeExperiment = useStore(state => state.completeExperiment);
  const completed = useStore(state => state.completedExperiments.some(result => result.experimentId === 'human-body'));

  function selectRegion(value: System, id: string) {
    setSelected(id);
    setObserved(previous => ({ ...previous, [value]: id }));
    scene.current?.select(id);
  }

  useEffect(() => {
    let cancelled = false;
    let active: BodyScene | null = null;
    // Three.js and OrbitControls are fetched only when this client lab mounts.
    import('./scene').then(({ createBodyScene }) => {
      if (cancelled || !host.current || !label.current) return;
      active = createBodyScene(host.current, label.current, (value, id) => {
        setSelected(id);
        setObserved(previous => ({ ...previous, [value]: id }));
        active?.select(id);
      }, message => {
        if (cancelled) return;
        scene.current = null;
        setError(message);
        setStatus('error');
      });
      scene.current = active;
      setStatus('ready');
      setVisited(previous => previous.includes('body') ? previous : [...previous, 'body']);
    }).catch(() => {
      if (cancelled) return;
      setError('The 3D viewer could not start. It requires WebGL 2 and graphics acceleration in a supported browser. Check your browser graphics settings, or try another device. No substitute image is being shown.');
      setStatus('error');
    });
    return () => {
      cancelled = true;
      active?.dispose();
      scene.current = null;
    };
  }, [attempt]);

  function switchSystem(value: System) {
    setSystem(value);
    setSelected(null);
    scene.current?.setSystem(value);
    if (status === 'ready') setVisited(previous => previous.includes(value) ? previous : [...previous, value]);
  }

  const region = REGIONS[system].find(item => item.id === selected);
  const inspectedCount = Object.keys(observed).length;

  return (
    <div lang="en" className={styles.lab}>
      <div className={styles.workspace}>
        <header className={styles.header}>
          <div className={styles.heading}>
            <Link href="/lab" className={styles.back} aria-label="Back to experiment library">Back to labs</Link>
            <div><p className={styles.eyebrow}>Biology / Spatial explorer</p><h1>Human body</h1></div>
          </div>
          <span className={styles.language}>English-language panel</span>
        </header>
        <p className={styles.intro}>How do support, movement and communication fit together? Orbit a human figure and compare four anatomical views.</p>
        <div className={styles.grid}>
          <section className={styles.viewer} aria-label="Human anatomy explorer">
            <div role="tablist" aria-label="Anatomical systems" className={styles.tabs}>
              {SYSTEMS.map((value, index) => <button key={value} id={`human-body-tab-${value}`} role="tab" aria-selected={system === value} aria-controls="human-body-panel" tabIndex={system === value ? 0 : -1} disabled={status !== 'ready'} onClick={() => switchSystem(value)} onKeyDown={event => {
                let next: System | undefined;
                if (event.key === 'ArrowRight') next = SYSTEMS[(index + 1) % SYSTEMS.length];
                if (event.key === 'ArrowLeft') next = SYSTEMS[(index + SYSTEMS.length - 1) % SYSTEMS.length];
                if (event.key === 'Home') next = SYSTEMS[0];
                if (event.key === 'End') next = SYSTEMS[SYSTEMS.length - 1];
                if (next) { event.preventDefault(); switchSystem(next); document.getElementById(`human-body-tab-${next}`)?.focus(); }
              }}><span className={styles.swatch} style={{ backgroundColor: SYSTEM_INFO[value].color }} />{SYSTEM_INFO[value].label}</button>)}
            </div>
            <div id="human-body-panel" role="tabpanel" aria-labelledby={`human-body-tab-${system}`}>
              <div className={styles.stage}>
                <div ref={host} className={styles.canvasHost} />
                <div ref={label} hidden aria-hidden="true" className={styles.anatomicalLabel} />
                {status === 'ready' && <><div className={styles.stageCaption}>3D / {SYSTEM_INFO[system].label}<small>Anterior = front · Posterior = back</small></div><span className={styles.schematic}>Schematic, not medical reference</span></>}
                {status === 'loading' && <div className={styles.notice} role="status"><strong>Preparing the 3D model</strong><p>Loading the local procedural anatomy viewer...</p></div>}
                {status === 'error' && <div className={styles.notice} role="alert"><strong>3D graphics unavailable</strong><p>{error}</p><button className="lab-button" onClick={() => { setStatus('loading'); setSystem('body'); setSelected(null); setAttempt(value => value + 1); }}>Retry 3D viewer</button></div>}
              </div>
              <div className={styles.viewSummary}><span className={styles.swatch} style={{ backgroundColor: SYSTEM_INFO[system].color }} /><p>{SYSTEM_INFO[system].summary}</p></div>
            </div>
            <div className={styles.cameraControls}>
              <div className={styles.sectionHeading}><h2>Camera controls</h2><button className="lab-button" disabled={status !== 'ready'} onClick={() => scene.current?.command('reset')}>Reset camera</button></div>
              <div className={styles.buttonGrid}>{CAMERA_BUTTONS.map(button => <button key={button.command} className="lab-button" disabled={status !== 'ready'} onClick={() => scene.current?.command(button.command)}>{button.label}</button>)}</div>
              <p id="human-body-interaction" className={styles.hint}>Drag to orbit; scroll or pinch to zoom; right-drag or two-finger drag to pan. On the focused canvas: arrow keys orbit, Shift + arrows pan, + / - zoom, Home resets. All actions also have buttons.</p>
            </div>
          </section>

          <aside className={styles.sidebar}>
            <section className={styles.card}>
              <p className={styles.eyebrow}>01 / Identify</p><h2>Anatomical regions</h2>
              <p className={styles.hint}>Click a structure in 3D or choose a name below. Left and right always mean the person&apos;s own sides, not yours.</p>
              <div className={styles.regions}>{REGIONS[system].map(item => <button key={item.id} aria-pressed={selected === item.id} disabled={status !== 'ready'} onClick={() => selectRegion(system, item.id)}>{item.name}</button>)}</div>
              <div className={styles.fact} aria-live="polite" aria-atomic="true"><h3>{region?.name ?? 'Choose a region'}</h3><p>{region?.fact ?? 'Your selected structure will highlight in blue-green. The floating label marks its approximate location, including structures on the far side.'}</p></div>
            </section>
            <section className={styles.card}>
              <p className={styles.eyebrow}>02 / Observe</p><h2>Observation notebook</h2>
              <p className={styles.hint} aria-live="polite">{visited.length} of 4 views visited · {inspectedCount} of 4 views inspected</p>
              <ul className={styles.notebook}>{SYSTEMS.map(value => <li key={value}><span>{SYSTEM_INFO[value].label}</span><span>{observed[value] ? REGIONS[value].find(item => item.id === observed[value])?.name : visited.includes(value) ? 'Select a region' : 'Not visited'}</span></li>)}</ul>
              <label className={styles.noteLabel} htmlFor="human-body-note">What connects the systems?</label>
              <textarea id="human-body-note" value={note} onChange={event => setNote(event.target.value)} maxLength={1000} rows={3} placeholder="Compare a limb's bones, muscles and nerves..." />
              <p className={styles.hint}>Notes stay in this session. Inspect at least one region in every view to record exploration.</p>
              <button className="lab-button lab-button-primary" disabled={inspectedCount < 4 || completed || status !== 'ready'} onClick={() => completeExperiment('human-body', 100)}>{completed ? 'Exploration recorded' : 'Record exploration'}</button>
              <p className={styles.hint} role="status">{completed ? 'Completion is saved in this browser. This is exploration credit, not a medical assessment.' : 'Recording completion is optional.'}</p>
            </section>
          </aside>
        </div>
        <footer className={styles.footer}><strong>Reading this model</strong><p>A procedural, low-poly teaching model with representative anatomy. Proportions, bone shapes, muscle attachments and nerve paths are simplified; many small structures and all internal organs are omitted. Faint surfaces provide position only. It is not suitable for diagnosis or clinical training.</p></footer>
      </div>
    </div>
  );
}
