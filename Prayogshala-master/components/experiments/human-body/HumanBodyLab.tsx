'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import type { AnatomyLayer, AnimationState, CameraCommand, StructureInfo } from './scene';
import styles from './human-body.module.css';

type SceneController = {
  setLayer: (layer: AnatomyLayer) => Promise<void>;
  select: (id: string | null) => void;
  focus: (id: string) => void;
  isolate: (id: string | null) => void;
  command: (command: CameraCommand) => void;
  setOpacity: (layer: Exclude<AnatomyLayer, 'all'>, opacity: number) => void;
  setXray: (enabled: boolean) => void;
  setLabels: (enabled: boolean) => void;
  setExploded: (enabled: boolean) => void;
  setAnimation: (state: AnimationState) => void;
  resetAnimation: () => void;
  dispose: () => void;
  getStructures: () => StructureInfo[];
};

type LoadStatus = 'loading' | 'ready' | 'error';
type OpacityGroup = 'surface' | 'muscles' | 'skeleton' | 'organs';
type AnimatedLayer = 'respiratory' | 'circulatory' | 'digestive' | 'nervous';

const LAYERS: { id: AnatomyLayer; label: string }[] = [
  { id: 'surface', label: 'Surface' },
  { id: 'muscles', label: 'Muscles' },
  { id: 'skeleton', label: 'Skeleton' },
  { id: 'organs', label: 'Organs' },
  { id: 'nervous', label: 'Nervous' },
  { id: 'respiratory', label: 'Respiratory' },
  { id: 'digestive', label: 'Digestive' },
  { id: 'circulatory', label: 'Circulatory' },
  { id: 'urinary', label: 'Urinary' },
  { id: 'all', label: 'All available' },
];

const CAMERA: { command: CameraCommand; label: string; short: string }[] = [
  { command: 'front', label: 'View from front', short: 'Front' },
  { command: 'back', label: 'View from back', short: 'Back' },
  { command: 'left', label: 'View left side', short: 'Left' },
  { command: 'right', label: 'View right side', short: 'Right' },
  { command: 'reset', label: 'Reset camera', short: 'Reset' },
  { command: 'in', label: 'Zoom in', short: 'Zoom +' },
  { command: 'out', label: 'Zoom out', short: 'Zoom -' },
];

const SEARCH_LAYER_HINTS: Array<{ terms: string[]; layer: AnatomyLayer }> = [
  { terms: ['heart', 'artery', 'vein', 'aorta', 'blood', 'vascular'], layer: 'circulatory' },
  { terms: ['lung', 'trachea', 'bronch', 'respirat'], layer: 'respiratory' },
  { terms: ['liver', 'pancreas', 'gallbladder', 'biliary', 'intestine', 'digest'], layer: 'digestive' },
  { terms: ['kidney', 'ureter', 'bladder', 'urethra', 'urinary'], layer: 'urinary' },
  { terms: ['brain', 'spinal cord', 'nerv'], layer: 'nervous' },
  { terms: ['bone', 'skull', 'mandible', 'rib', 'vertebra', 'femur', 'patella', 'tibia', 'fibula', 'humerus', 'radius', 'ulna', 'pelvis', 'clavicle', 'scapula', 'sternum'], layer: 'skeleton' },
  { terms: ['muscle', 'biceps', 'triceps', 'deltoid', 'pectoralis', 'abdominis', 'latissimus', 'gluteus', 'quadriceps', 'hamstring', 'gastrocnemius'], layer: 'muscles' },
];

const EXPLANATIONS: Record<AnimatedLayer, { title: string; summary: string; steps: string[] }> = {
  respiratory: {
    title: 'How breathing moves air',
    summary: 'Ventilation brings air to exchange surfaces; diffusion moves gases between alveoli and blood.',
    steps: [
      'Air enters through the nose or mouth and passes through the pharynx and larynx.',
      'The trachea divides into bronchi, then smaller bronchioles within the lungs.',
      'At the alveoli, oxygen diffuses into capillary blood while carbon dioxide diffuses out.',
      'The diaphragm and intercostal muscles change chest volume to move air in and out.',
    ],
  },
  circulatory: {
    title: 'How blood circulates',
    summary: 'Two connected circuits move blood through the lungs and the rest of the body.',
    steps: [
      'Oxygen-poor blood returns through veins to the right side of the heart.',
      'The right ventricle pumps it through pulmonary arteries to the lungs.',
      'Oxygen-rich blood returns through pulmonary veins to the left side of the heart.',
      'The left ventricle pumps it through the aorta and arteries to body tissues.',
    ],
  },
  digestive: {
    title: 'How digestion proceeds',
    summary: 'Mechanical and chemical processing turns food into absorbable nutrients and waste.',
    steps: [
      'Chewing and saliva begin processing food before swallowing moves it through the esophagus.',
      'The stomach mixes food with acid and enzymes to form chyme.',
      'The small intestine receives bile and pancreatic enzymes and absorbs most nutrients.',
      'The large intestine absorbs water, compacts waste, and moves it toward elimination.',
    ],
  },
  nervous: {
    title: 'How neural signals travel',
    summary: 'Electrical impulses and chemical synapses coordinate sensation, movement, and regulation.',
    steps: [
      'Sensory receptors convert changes inside or outside the body into neural signals.',
      'Sensory neurons carry those signals toward the spinal cord and brain.',
      'Neural networks integrate the information and determine a response.',
      'Motor neurons carry commands to muscles or glands; this model shows only part of the network.',
    ],
  },
};

const EMPTY_OPACITY: Record<OpacityGroup, number> = {
  surface: 100,
  muscles: 100,
  skeleton: 100,
  organs: 100,
};

function sourceIsUrl(source: string): boolean {
  return /^https?:\/\//i.test(source);
}

export default function HumanBodyLab() {
  const hostRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneController | null>(null);
  const structuresRef = useRef<StructureInfo[]>([]);
  const layerRequestRef = useRef(0);
  const readyRef = useRef(false);

  const [status, setStatus] = useState<LoadStatus>('loading');
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('Connecting to model source...');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [layer, setLayer] = useState<AnatomyLayer>('surface');
  const [layerBusy, setLayerBusy] = useState(false);
  const [structures, setStructures] = useState<StructureInfo[]>([]);
  const [selected, setSelected] = useState<StructureInfo | null>(null);
  const [query, setQuery] = useState('');
  const [searchMessage, setSearchMessage] = useState('');
  const [inspected, setInspected] = useState<string[]>([]);
  const [isolated, setIsolated] = useState(false);
  const [opacity, setOpacity] = useState(EMPTY_OPACITY);
  const [xray, setXray] = useState(false);
  const [labels, setLabels] = useState(true);
  const [exploded, setExploded] = useState(false);
  const [animation, setAnimation] = useState<AnimationState>('stopped');

  const completeExperiment = useStore(state => state.completeExperiment);
  const completed = useStore(state => state.completedExperiments.some(item => item.experimentId === 'human-body'));

  const registerSelection = useCallback((value: StructureInfo | string | null) => {
    if (value === null) {
      setSelected(null);
      setIsolated(false);
      return;
    }
    const structure = typeof value === 'string'
      ? structuresRef.current.find(item => item.id === value) ?? null
      : value;
    if (!structure) return;
    setSelected(structure);
    setIsolated(false);
    setInspected(previous => previous.includes(structure.id) ? previous : [...previous, structure.id]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let active: SceneController | null = null;
    setStatus('loading');
    setProgress(0);
    setProgressMessage('Connecting to model source...');
    setError('');
    readyRef.current = false;

    import('./scene').then(({ createBodyScene }) => {
      if (cancelled || !hostRef.current || !labelRef.current) return;
      active = createBodyScene(hostRef.current, labelRef.current, {
        onSelect: (value: StructureInfo | string | null) => registerSelection(value),
        onProgress: (message: string, percent: number) => {
          if (cancelled) return;
          setProgressMessage(message);
          setProgress(Math.min(100, Math.max(0, Math.round(percent))));
        },
        onReady: (loadedStructures: StructureInfo[]) => {
          if (cancelled || !active) return;
          const loaded = loadedStructures.length ? loadedStructures : active.getStructures();
          structuresRef.current = loaded;
          setStructures(loaded);
          setProgress(100);
          setStatus('ready');
          readyRef.current = true;
        },
        onFailure: (reason: string | Error) => {
          if (cancelled) return;
          setError(typeof reason === 'string' ? reason : reason.message);
          if (!readyRef.current) setStatus('error');
        },
      }) as SceneController;
      sceneRef.current = active;
    }).catch((reason: unknown) => {
      if (cancelled) return;
      setError(reason instanceof Error ? reason.message : 'The 3D anatomy viewer could not start.');
      setStatus('error');
    });

    return () => {
      cancelled = true;
      active?.dispose();
      sceneRef.current = null;
      structuresRef.current = [];
      readyRef.current = false;
    };
  }, [attempt, registerSelection]);

  const layerCounts = useMemo(() => {
    const counts = new Map<AnatomyLayer, number>();
    for (const item of structures) counts.set(item.layer, (counts.get(item.layer) ?? 0) + 1);
    return counts;
  }, [structures]);

  const organCount = useMemo(() => structures.filter(item => ['nervous', 'respiratory', 'digestive', 'circulatory', 'urinary'].includes(item.layer)).length, [structures]);

  const searchResults = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return [];
    return structures.filter(item => [
      item.name, item.system, item.location, item.function, item.description, item.source,
    ].some(value => value?.toLocaleLowerCase().includes(term))).slice(0, 12);
  }, [query, structures]);

  const animatedLayer = layer in EXPLANATIONS ? layer as AnimatedLayer : null;

  async function changeLayer(nextLayer: AnatomyLayer, preserveSelection = false) {
    const active = sceneRef.current;
    if (!active || status !== 'ready' || nextLayer === layer) return;
    const request = ++layerRequestRef.current;
    setLayerBusy(true);
    if (!preserveSelection) {
      active.select(null);
      active.isolate(null);
      setSelected(null);
      setIsolated(false);
    }
    active.setAnimation('stopped');
    setAnimation('stopped');
    try {
      setError('');
      await active.setLayer(nextLayer);
      if (request === layerRequestRef.current) setLayer(nextLayer);
    } catch (reason) {
      if (request === layerRequestRef.current) {
        setError(reason instanceof Error ? reason.message : 'This anatomy layer could not be displayed.');
      }
    } finally {
      if (request === layerRequestRef.current) setLayerBusy(false);
    }
  }

  async function chooseSearchResult(structure: StructureInfo) {
    if (structure.layer !== layer) await changeLayer(structure.layer, true);
    sceneRef.current?.select(structure.id);
    sceneRef.current?.focus(structure.id);
    registerSelection(structure);
    setQuery('');
  }

  async function submitSearch() {
    const term = query.trim().toLocaleLowerCase();
    if (!term || disabled) return;
    setSearchMessage('');
    const loadedMatch = structuresRef.current.find(item => [item.name, item.system, item.location, item.function, item.description]
      .some(value => value?.toLocaleLowerCase().includes(term)));
    if (loadedMatch) {
      await chooseSearchResult(loadedMatch);
      return;
    }
    const hintedLayer = SEARCH_LAYER_HINTS.find(item => item.terms.some(hint => term.includes(hint)))?.layer;
    if (!hintedLayer) {
      setSearchMessage('No matching structure is available in this anatomy dataset.');
      return;
    }
    await changeLayer(hintedLayer, true);
    const loaded = sceneRef.current?.getStructures() ?? [];
    structuresRef.current = loaded;
    setStructures(loaded);
    const match = loaded.find(item => [item.name, item.system, item.location, item.function, item.description]
      .some(value => value?.toLocaleLowerCase().includes(term)));
    if (match) await chooseSearchResult(match);
    else setSearchMessage(`No structure matching “${query.trim()}” is present in the ${hintedLayer} dataset.`);
  }

  function chooseStructure(structure: StructureInfo) {
    sceneRef.current?.isolate(null);
    sceneRef.current?.select(structure.id);
    registerSelection(structure);
  }

  function updateOpacity(group: OpacityGroup, nextValue: number) {
    setOpacity(previous => ({ ...previous, [group]: nextValue }));
    const normalized = nextValue / 100;
    sceneRef.current?.setOpacity(group, normalized);
  }

  function toggleIsolation() {
    if (!selected) return;
    sceneRef.current?.isolate(isolated ? null : selected.id);
    setIsolated(value => !value);
  }

  function toggleAnimation() {
    const next: AnimationState = animation === 'playing' ? 'paused' : 'playing';
    sceneRef.current?.setAnimation(next);
    setAnimation(next);
  }

  function resetAnimation() {
    sceneRef.current?.resetAnimation();
    setAnimation('stopped');
  }

  async function toggleXray() {
    const next = !xray;
    setXray(next);
    sceneRef.current?.setXray(next);
    if (next && layer !== 'all') await changeLayer('all');
  }

  const disabled = status !== 'ready' || layerBusy;

  return (
    <main className={styles.lab} lang="en">
      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.titleGroup}>
            <Link href="/lab" className={styles.back}>Back to labs</Link>
            <div>
              <p className={styles.eyebrow}>Clinical anatomy laboratory</p>
              <h1>Human body atlas</h1>
            </div>
          </div>
          <p className={styles.disclaimer}>Educational model · Not for diagnosis</p>
        </header>

        <nav className={styles.layerBar} aria-label="Anatomy layers">
          {LAYERS.map(item => {
            const count = item.id === 'all' ? structures.length : item.id === 'organs' ? organCount : layerCounts.get(item.id) ?? 0;
            return (
              <button
                key={item.id}
                type="button"
                className={styles.layerButton}
                aria-pressed={layer === item.id}
                aria-label={`${item.label}${item.id === 'nervous' ? ', partial dataset' : ''}${item.id === 'all' ? `, ${count} loaded structures` : ''}`}
                disabled={disabled}
                onClick={() => void changeLayer(item.id)}
              >
                <span>{item.label}</span>
                {item.id === 'nervous' && <small>Partial</small>}
                {status === 'ready' && count === 0 && !['muscles', 'skeleton'].includes(item.id) && <small>Load</small>}
                {item.id === 'all' && <small>{status === 'ready' ? `${count} loaded` : 'Loading'}</small>}
              </button>
            );
          })}
        </nav>

        <div className={styles.workspace}>
          <section className={styles.viewer} aria-label="Interactive three-dimensional anatomy model">
            <div className={styles.stage} aria-busy={status === 'loading'}>
              <div ref={hostRef} className={styles.canvasHost} />
              <div ref={labelRef} hidden className={styles.anatomicalLabel} aria-hidden="true" />

              {status === 'ready' && (
                <div className={styles.stageMeta} aria-live="polite">
                  <strong>{LAYERS.find(item => item.id === layer)?.label}</strong>
                  <span>{layer === 'all' ? `${structures.length} loaded structures` : `${layer === 'organs' ? organCount : layerCounts.get(layer) ?? 0} structures`}</span>
                </div>
              )}

              {status === 'loading' && (
                <div className={styles.loadPanel} role="status" aria-live="polite">
                  <p className={styles.eyebrow}>Preparing specimen</p>
                  <strong>Loading anatomical geometry</strong>
                  <div className={styles.progressTrack} aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
                  <span>{progressMessage}{progress > 0 ? ` · ${progress}%` : ''}</span>
                </div>
              )}

              {status === 'error' && (
                <div className={styles.loadPanel} role="alert">
                  <p className={styles.eyebrow}>Viewer unavailable</p>
                  <strong>Unable to load the anatomy model</strong>
                   <span>{error || 'A WebGL 2 capable browser with graphics acceleration is required.'}</span>
                  <button type="button" className={styles.primaryButton} onClick={() => setAttempt(value => value + 1)}>Retry viewer</button>
                </div>
              )}
            </div>

            <div className={styles.viewportTools} aria-label="Camera and display controls">
              <div className={styles.cameraRow} role="group" aria-label="Camera views">
                {CAMERA.map(item => (
                  <button key={item.command} type="button" title={item.label} aria-label={item.label} disabled={disabled} onClick={() => sceneRef.current?.command(item.command)}>{item.short}</button>
                ))}
              </div>
              <div className={styles.toggleRow}>
                <button type="button" role="switch" aria-checked={xray} disabled={disabled} onClick={() => void toggleXray()}>X-ray</button>
                <button type="button" role="switch" aria-checked={labels} disabled={disabled} onClick={() => { const next = !labels; setLabels(next); sceneRef.current?.setLabels(next); }}>Labels</button>
                <button type="button" role="switch" aria-checked={exploded} disabled={disabled} onClick={() => { const next = !exploded; setExploded(next); sceneRef.current?.setExploded(next); }}>Explode</button>
              </div>
            </div>
            <p id="human-body-interaction" className={styles.interactionHint}>Drag to rotate · Scroll or pinch to zoom · Select anatomy directly in the model</p>
          </section>

          <aside className={styles.sidebar} aria-label="Anatomy information and controls">
            {status === 'ready' && error && <p className={styles.layerWarning} role="status">{error}</p>}
            <section className={styles.panel}>
              <div className={styles.panelHeading}>
                <div><p className={styles.eyebrow}>Find anatomy</p><h2>Structure search</h2></div>
                <span>{structures.length} indexed</span>
              </div>
              <label className={styles.srOnly} htmlFor="anatomy-search">Search loaded anatomical structures</label>
              <form className={styles.searchForm} onSubmit={event => { event.preventDefault(); void submitSearch(); }}>
                <input
                  id="anatomy-search"
                  type="search"
                  value={query}
                  disabled={status !== 'ready'}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="Femur, heart, lungs, brain..."
                  autoComplete="off"
                />
                <button type="submit" disabled={disabled || !query.trim()}>Find</button>
              </form>
              {query.trim() && (
                <div className={styles.searchResults} aria-label="Search results">
                  {searchResults.length ? searchResults.map(item => (
                    <button key={`${item.layer}-${item.id}`} type="button" onClick={() => void chooseSearchResult(item)}>
                      <strong>{item.name}</strong><span>{item.system} · {item.layer}</span>
                    </button>
                  )) : <p>{searchMessage || 'Press Find to load and search the matching body system.'}</p>}
                </div>
              )}
            </section>

            <section className={`${styles.panel} ${styles.selectionPanel}`} aria-live="polite">
              <p className={styles.eyebrow}>Selected structure</p>
              {selected ? (
                <>
                  <div className={styles.selectionTitle}><h2>{selected.name}</h2><span>{selected.system}</span></div>
                  <dl className={styles.details}>
                    {selected.location && <><dt>Location</dt><dd>{selected.location}</dd></>}
                    {selected.function && <><dt>Function</dt><dd>{selected.function}</dd></>}
                    <dt>Description</dt><dd>{selected.description}</dd>
                    <dt>Source</dt><dd>{sourceIsUrl(selected.source) ? <a href={selected.source} target="_blank" rel="noreferrer">Open source record</a> : selected.source}</dd>
                  </dl>
                  <div className={styles.actionRow}>
                    <button type="button" disabled={disabled} onClick={() => sceneRef.current?.focus(selected.id)}>Focus</button>
                    <button type="button" aria-pressed={isolated} disabled={disabled} onClick={toggleIsolation}>{isolated ? 'Show all' : 'Isolate'}</button>
                  </div>
                </>
              ) : (
                <div className={styles.emptySelection}>
                  <h2>No structure selected</h2>
                  <p>Select the model or search the loaded metadata to inspect anatomical details.</p>
                </div>
              )}
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeading}><div><p className={styles.eyebrow}>Visibility</p><h2>Layer opacity</h2></div></div>
              <div className={styles.sliders}>
                {(Object.keys(opacity) as OpacityGroup[]).map(item => (
                  <label key={item}>
                    <span><strong>{item[0].toUpperCase() + item.slice(1)}</strong><output>{opacity[item]}%</output></span>
                    <input type="range" min="0" max="100" step="5" value={opacity[item]} disabled={disabled} onChange={event => updateOpacity(item, Number(event.target.value))} />
                  </label>
                ))}
              </div>
              <p className={styles.panelNote}>Organ opacity also controls respiratory, digestive, circulatory, and urinary structures.</p>
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeading}><div><p className={styles.eyebrow}>Physiology guide</p><h2>How it works</h2></div></div>
              {animatedLayer ? (
                <div className={styles.guide}>
                  <h3>{EXPLANATIONS[animatedLayer].title}</h3>
                  <p>{EXPLANATIONS[animatedLayer].summary}</p>
                  <ol>{EXPLANATIONS[animatedLayer].steps.map(step => <li key={step}>{step}</li>)}</ol>
                  <div className={styles.actionRow}>
                    <button type="button" disabled={disabled} aria-label={animation === 'playing' ? 'Pause flow visualization' : 'Play flow visualization'} onClick={toggleAnimation}>{animation === 'playing' ? 'Pause' : 'Play'}</button>
                    <button type="button" disabled={disabled} onClick={resetAnimation}>Reset</button>
                  </div>
                </div>
              ) : (
                <div className={styles.unsupported}>
                  <h3>No flow animation for this layer</h3>
                  <p>Choose Respiratory, Circulatory, Digestive, or Nervous to view its four-step physiology guide and supported animation.</p>
                </div>
              )}
              <p className={styles.animationNote}>Flow animations are simplified educational visualizations. They do not represent clinical timing, pressure, scale, or every anatomical pathway.</p>
              {animatedLayer === 'digestive' && <p className={styles.animationNote}>The current 3D dataset includes liver, pancreas, gallbladder, biliary tree, and intestines; the mouth, esophagus, and stomach are explained but are not modeled.</p>}
              {animatedLayer === 'nervous' && <p className={styles.animationNote}>The current 3D dataset includes the brain and spinal cord, not the complete peripheral nervous system.</p>}
            </section>

            <section className={styles.completion}>
              <div><strong>{completed ? 'Exploration recorded' : `${Math.min(inspected.length, 4)} of 4 structures inspected`}</strong><p>Inspect four distinct structures to complete this lab.</p></div>
              <button type="button" disabled={completed || inspected.length < 4 || status !== 'ready'} onClick={() => completeExperiment('human-body', 100)}>{completed ? 'Completed' : 'Record completion'}</button>
            </section>
          </aside>
        </div>

        <footer className={styles.footer}>
          <p><strong>Model attribution.</strong> Anatomy data and terminology are informed by the <a href="https://humanatlas.io/" target="_blank" rel="noreferrer">Human Reference Atlas</a> and <a href="https://www.z-anatomy.com/" target="_blank" rel="noreferrer">Z-Anatomy</a>. Repository-level asset and license details are documented in <code>ANATOMY_CREDITS.md</code>.</p>
          <p>This atlas is an educational visualization and is not a substitute for professional medical advice, diagnosis, or treatment.</p>
        </footer>
      </div>
    </main>
  );
}
