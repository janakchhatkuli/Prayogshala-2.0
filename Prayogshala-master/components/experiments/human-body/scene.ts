import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

export type AnatomyLayer = 'surface' | 'muscles' | 'skeleton' | 'organs' | 'nervous' | 'respiratory' | 'digestive' | 'circulatory' | 'urinary' | 'all';
export type CameraCommand = 'front' | 'back' | 'left' | 'right' | 'reset' | 'in' | 'out';
export type AnimationState = 'playing' | 'paused' | 'stopped';
export interface StructureInfo { id: string; name: string; layer: Exclude<AnatomyLayer, 'all'>; system: string; description: string; function?: string; location?: string; source: 'Z-Anatomy' | 'HRA'; }
export interface BodyScene { setLayer(layer: AnatomyLayer): Promise<void>; select(id: string | null): void; focus(id?: string | null): void; isolate(id: string | null): void; command(command: CameraCommand): void; setOpacity(layer: Exclude<AnatomyLayer, 'all'>, opacity: number): void; setXray(enabled: boolean): void; setLabels(enabled: boolean): void; setExploded(enabled: boolean): void; setAnimation(state: AnimationState): void; resetAnimation(): void; dispose(): void; getStructures(layer?: AnatomyLayer): StructureInfo[]; }
export interface BodySceneCallbacks { onSelect(info: StructureInfo | null): void; onProgress(message: string, percent: number): void; onReady(structures: StructureInfo[]): void; onFailure(message: string): void; }

type MajorLayer = Exclude<AnatomyLayer, 'all'>;
type MeshMaterial = THREE.Material | THREE.Material[];

interface MaterialState {
  material: THREE.Material;
  opacity: number;
  transparent: boolean;
  depthWrite: boolean;
  emissive?: THREE.Color;
  emissiveIntensity?: number;
}

interface StructureRecord {
  info: StructureInfo;
  mesh: THREE.Mesh;
  materials: MaterialState[];
  basePosition: THREE.Vector3;
  baseScale: THREE.Vector3;
  explodedPosition: THREE.Vector3;
  asset: AssetKey;
  alpha: number;
  targetAlpha: number;
}

interface CameraMove {
  start: number;
  duration: number;
  fromPosition: THREE.Vector3;
  toPosition: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
}

interface AssetDefinition {
  file: string;
  layer: MajorLayer;
  system: string;
}

const HRA_ROOT_SCALE = 0.9288893838;
const HRA_ROOT_POSITION = new THREE.Vector3(0.0003184934, 0.8576904758, 0.00574435);
const FADE_DURATION = 450;

const ASSETS = {
  skin: { file: 'VH_M_Skin.glb', layer: 'surface', system: 'Integumentary system' },
  lung: { file: 'VH_M_Lung.glb', layer: 'respiratory', system: 'Respiratory system' },
  liver: { file: 'VH_M_Liver.glb', layer: 'digestive', system: 'Digestive system' },
  pancreas: { file: 'VH_M_Pancreas.glb', layer: 'digestive', system: 'Digestive system' },
  gallbladder: { file: 'VH_M_Gallbladder.glb', layer: 'digestive', system: 'Digestive system' },
  biliaryTree: { file: 'VH_M_Biliary_Tree.glb', layer: 'digestive', system: 'Digestive system' },
  smallIntestine: { file: 'VH_M_Small_Intestine.glb', layer: 'digestive', system: 'Digestive system' },
  largeIntestine: { file: 'SBU_M_Intestine_Large.glb', layer: 'digestive', system: 'Digestive system' },
  heart: { file: 'VH_M_Heart.glb', layer: 'circulatory', system: 'Circulatory system' },
  vasculature: { file: 'VH_M_Blood_Vasculature.glb', layer: 'circulatory', system: 'Circulatory system' },
  kidneyLeft: { file: 'VH_M_Kidney_L.glb', layer: 'urinary', system: 'Urinary system' },
  kidneyRight: { file: 'VH_M_Kidney_R.glb', layer: 'urinary', system: 'Urinary system' },
  ureterLeft: { file: 'VH_M_Ureter_L.glb', layer: 'urinary', system: 'Urinary system' },
  ureterRight: { file: 'VH_M_Ureter_R.glb', layer: 'urinary', system: 'Urinary system' },
  bladder: { file: 'VH_M_Urinary_Bladder.glb', layer: 'urinary', system: 'Urinary system' },
  urethra: { file: 'VH_M_Urethra.glb', layer: 'urinary', system: 'Urinary system' },
  brain: { file: 'Allen_M_Brain.glb', layer: 'nervous', system: 'Nervous system' },
  spinalCord: { file: 'VH_M_Spinal_Cord.glb', layer: 'nervous', system: 'Nervous system' },
} as const satisfies Record<string, AssetDefinition>;

type AssetKey = keyof typeof ASSETS | 'z-anatomy';

const INTERNAL_ASSETS = Object.keys(ASSETS).filter((key): key is keyof typeof ASSETS => key !== 'skin');
const LAYER_ASSETS: Record<MajorLayer, (keyof typeof ASSETS)[]> = {
  surface: ['skin'],
  muscles: [],
  skeleton: [],
  organs: INTERNAL_ASSETS,
  nervous: ['brain', 'spinalCord'],
  respiratory: ['lung'],
  digestive: ['liver', 'pancreas', 'gallbladder', 'biliaryTree', 'smallIntestine', 'largeIntestine'],
  circulatory: ['heart', 'vasculature'],
  urinary: ['kidneyLeft', 'kidneyRight', 'ureterLeft', 'ureterRight', 'bladder', 'urethra'],
};

const LAYER_SYSTEM: Record<MajorLayer, string> = {
  surface: 'Integumentary system', muscles: 'Muscular system', skeleton: 'Skeletal system', organs: 'Internal organs',
  nervous: 'Nervous system', respiratory: 'Respiratory system', digestive: 'Digestive system',
  circulatory: 'Circulatory system', urinary: 'Urinary system',
};

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanName(value: string): string {
  const cleaned = value.replace(/^(mesh|node)[_-]?\d*[_-]?/i, '').replace(/[_.-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned || 'Anatomical structure';
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'structure';
}

function materialArray(material: MeshMaterial): THREE.Material[] {
  return Array.isArray(material) ? material : [material];
}

function isVisibleInHierarchy(object: THREE.Object3D): boolean {
  for (let current: THREE.Object3D | null = object; current; current = current.parent) if (!current.visible) return false;
  return true;
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'unknown loading error';
}

export function createBodyScene(host: HTMLDivElement, label: HTMLDivElement, callbacks: BodySceneCallbacks): BodyScene {
  let disposed = false;
  let frame = 0;
  let inView = true;
  let controlsSettling = 0;
  let cameraMove: CameraMove | null = null;
  let fadeStarted = 0;
  let activeLayer: AnatomyLayer = 'surface';
  let selectedId: string | null = null;
  let isolatedId: string | null = null;
  let labelsEnabled = true;
  let xray = false;
  let exploded = false;
  let animationState: AnimationState = 'stopped';
  let animationTime = 0;
  let previousFrameTime = 0;
  let layerRequest = 0;
  let pointerDown: { x: number; y: number; id: number } | null = null;
  let pointerDragged = false;

  const records: StructureRecord[] = [];
  const byId = new Map<string, StructureRecord>();
  const assetPromises = new Map<keyof typeof ASSETS, Promise<void>>();
  const roots = new Set<THREE.Object3D>();
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const cleanups: Array<() => void> = [];
  const layerOpacity: Record<MajorLayer, number> = {
    surface: 1, muscles: 1, skeleton: 1, organs: 1, nervous: 1,
    respiratory: 1, digestive: 1, circulatory: 1, urinary: 1,
  };

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'application');
  canvas.setAttribute('aria-label', 'Interactive three-dimensional human anatomy model');
  canvas.setAttribute('aria-describedby', 'human-body-interaction');
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline-offset:-4px';
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f1824);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.03, 50);
  const homeTarget = new THREE.Vector3(0, 0.86, 0);
  const homePosition = new THREE.Vector3(0, 0.92, 3.25);
  camera.position.copy(homePosition);

  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(homeTarget);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.minDistance = 0.42;
  controls.maxDistance = 10;
  controls.minPolarAngle = 0.08;
  controls.maxPolarAngle = Math.PI - 0.08;
  controls.update();

  scene.add(new THREE.HemisphereLight(0xd9ebff, 0x3b302c, 2.1));
  const key = new THREE.DirectionalLight(0xfff3e1, 3.1);
  key.position.set(-3, 5, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0002;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x75aee8, 1.5);
  rim.position.set(3, 3, -3);
  scene.add(rim);

  const draco = new DRACOLoader();
  draco.setDecoderPath('/draco/');
  const loader = new GLTFLoader().setDRACOLoader(draco);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const overlay = new THREE.Group();
  overlay.name = 'Approximate educational directional overlays';
  overlay.userData = { educationalOverlay: true, approximate: true, selectable: false };
  scene.add(overlay);
  const overlayMaterial = new THREE.PointsMaterial({ color: 0x67d8ff, size: 0.022, transparent: true, opacity: 0.88, depthWrite: false });
  materials.add(overlayMaterial);
  const overlayPositions = new Float32Array(42 * 3);
  const overlayGeometry = new THREE.BufferGeometry();
  overlayGeometry.setAttribute('position', new THREE.BufferAttribute(overlayPositions, 3));
  geometries.add(overlayGeometry);
  const particles = new THREE.Points(overlayGeometry, overlayMaterial);
  particles.frustumCulled = false;
  particles.userData = { educationalOverlay: true, approximate: true, selectable: false };
  overlay.add(particles);
  overlay.visible = false;

  function requestRender(): void {
    if (!disposed && !frame && inView && !document.hidden) frame = requestAnimationFrame(render);
  }

  function layerShown(record: StructureRecord): boolean {
    if (isolatedId) return record.info.id === isolatedId;
    if (activeLayer === 'all') return true;
    if (activeLayer === 'organs') return record.asset !== 'z-anatomy' && record.info.layer !== 'surface';
    return record.info.layer === activeLayer;
  }

  function effectiveOpacity(record: StructureRecord): number {
    let opacity = layerOpacity[record.info.layer];
    if (record.asset !== 'z-anatomy' && record.info.layer !== 'surface') opacity *= layerOpacity.organs;
    if (xray && record.info.layer === 'surface') opacity = Math.min(opacity, 0.24);
    return opacity * record.alpha;
  }

  function updateMaterial(record: StructureRecord): void {
    const opacity = effectiveOpacity(record);
    const selected = record.info.id === selectedId;
    for (const state of record.materials) {
      state.material.opacity = state.opacity * opacity;
      state.material.transparent = state.transparent || opacity < 0.999;
      state.material.depthWrite = state.depthWrite && opacity > 0.72;
      if (state.emissive && 'emissive' in state.material) {
        const material = state.material as THREE.MeshStandardMaterial;
        material.emissive.copy(selected ? new THREE.Color(0x16b8d4) : state.emissive);
        material.emissiveIntensity = selected ? 0.75 : (state.emissiveIntensity ?? 1);
      }
      state.material.needsUpdate = true;
    }
    record.mesh.visible = opacity > 0.002;
  }

  function beginFade(): void {
    if (reducedMotion.matches) {
      fadeStarted = 0;
      for (const record of records) {
        record.targetAlpha = layerShown(record) ? 1 : 0;
        record.alpha = record.targetAlpha;
        updateMaterial(record);
      }
      requestRender();
      return;
    }
    fadeStarted = performance.now();
    for (const record of records) record.targetAlpha = layerShown(record) ? 1 : 0;
    requestRender();
  }

  function selectedRecord(): StructureRecord | undefined {
    return selectedId ? byId.get(selectedId) : undefined;
  }

  function updateLabel(): void {
    const record = selectedRecord();
    if (!labelsEnabled || !record || !record.mesh.visible || !isVisibleInHierarchy(record.mesh)) {
      label.hidden = true;
      return;
    }
    const point = new THREE.Box3().setFromObject(record.mesh).getCenter(new THREE.Vector3()).project(camera);
    const visible = point.z > -1 && point.z < 1 && Math.abs(point.x) < 0.98 && Math.abs(point.y) < 0.98;
    label.hidden = !visible;
    if (visible) {
      label.textContent = record.info.name;
      label.style.left = `${(point.x * 0.5 + 0.5) * host.clientWidth}px`;
      label.style.top = `${(-point.y * 0.5 + 0.5) * host.clientHeight}px`;
    }
  }

  function setOverlayPoint(index: number, x: number, y: number, z: number): void {
    overlayPositions[index * 3] = x;
    overlayPositions[index * 3 + 1] = y;
    overlayPositions[index * 3 + 2] = z;
  }

  function updateEducationalAnimation(dt: number): void {
    if (animationState !== 'playing') return;
    animationTime += dt;
    const phase = animationTime;
    const supported = activeLayer === 'respiratory' || activeLayer === 'circulatory' || activeLayer === 'digestive' || activeLayer === 'nervous';
    overlay.visible = supported;
    if (activeLayer === 'respiratory') {
      for (const record of records) if (record.asset === 'lung') record.mesh.scale.copy(record.baseScale).multiplyScalar(1 + Math.sin(phase * 2.2) * 0.018);
      for (let i = 0; i < 42; i++) {
        const p = (i / 42 + phase * 0.18) % 1;
        setOverlayPoint(i, Math.sin(i * 2.4) * 0.035 * p, 1.64 - p * 0.72, 0.09);
      }
    } else if (activeLayer === 'circulatory') {
      for (const record of records) if (record.asset === 'heart') record.mesh.scale.copy(record.baseScale).multiplyScalar(1 + Math.max(0, Math.sin(phase * 7)) * 0.045);
      for (let i = 0; i < 42; i++) {
        const p = (i / 42 + phase * 0.24) % 1;
        const side = i % 2 ? -1 : 1;
        setOverlayPoint(i, side * (0.11 + Math.sin(p * Math.PI) * 0.14), 1.13 - p * 0.85, 0.04 + Math.sin(p * 8) * 0.025);
      }
    } else if (activeLayer === 'digestive') {
      for (let i = 0; i < 42; i++) {
        const p = (i / 42 + phase * 0.11) % 1;
        setOverlayPoint(i, Math.sin(p * 7 * Math.PI) * (0.04 + p * 0.12), 1.22 - p * 0.72, 0.13 + Math.cos(p * 6 * Math.PI) * 0.035);
      }
    } else if (activeLayer === 'nervous') {
      for (let i = 0; i < 42; i++) {
        const p = (i / 42 + phase * 0.35) % 1;
        setOverlayPoint(i, Math.sin(i * 1.7) * 0.012, 1.67 - p * 1.2, -0.035);
      }
    }
    overlayGeometry.attributes.position.needsUpdate = true;
  }

  function restoreAnimatedScales(): void {
    for (const record of records) record.mesh.scale.copy(record.baseScale);
  }

  function render(now: number): void {
    frame = 0;
    if (disposed || !inView || document.hidden) return;
    const dt = previousFrameTime ? Math.min((now - previousFrameTime) / 1000, 0.05) : 0;
    previousFrameTime = now;
    let continuous = false;

    if (cameraMove) {
      const t = Math.min((now - cameraMove.start) / cameraMove.duration, 1);
      const eased = 1 - (1 - t) ** 3;
      camera.position.lerpVectors(cameraMove.fromPosition, cameraMove.toPosition, eased);
      controls.target.lerpVectors(cameraMove.fromTarget, cameraMove.toTarget, eased);
      if (t === 1) cameraMove = null;
      else continuous = true;
    }

    if (fadeStarted) {
      const step = Math.min((now - fadeStarted) / FADE_DURATION, 1);
      for (const record of records) {
        record.alpha += (record.targetAlpha - record.alpha) * Math.min(1, step * 0.22 + 0.12);
        if (Math.abs(record.alpha - record.targetAlpha) < 0.005) record.alpha = record.targetAlpha;
        else continuous = true;
        updateMaterial(record);
      }
      if (!continuous && !cameraMove) fadeStarted = 0;
    }

    if (animationState === 'playing') {
      updateEducationalAnimation(dt);
      if (activeLayer === 'muscles' || activeLayer === 'skeleton') {
        const record = selectedRecord();
        if (record) record.mesh.scale.copy(record.baseScale).multiplyScalar(1 + Math.sin(animationTime * 2.4) * 0.008);
      }
      continuous = true;
    }

    controls.update();
    if (controlsSettling > 0) { controlsSettling--; continuous = true; }
    updateLabel();
    renderer.render(scene, camera);
    if (continuous || cameraMove) requestRender();
  }

  function rememberTexture(value: unknown): void {
    if (value instanceof THREE.Texture) textures.add(value);
  }

  function cloneMaterials(mesh: THREE.Mesh): MaterialState[] {
    const cloned = materialArray(mesh.material as MeshMaterial).map(source => {
      materials.add(source);
      for (const value of Object.values(source)) rememberTexture(value);
      const material = source.clone();
      materials.add(material);
      const emissiveMaterial = material as THREE.MeshStandardMaterial;
      return {
        material,
        opacity: material.opacity,
        transparent: material.transparent,
        depthWrite: material.depthWrite,
        emissive: emissiveMaterial.emissive?.clone(),
        emissiveIntensity: emissiveMaterial.emissiveIntensity,
      };
    });
    mesh.material = (Array.isArray(mesh.material) ? cloned.map(item => item.material) : cloned[0].material) as MeshMaterial;
    return cloned;
  }

  function registerModel(root: THREE.Object3D, source: 'Z-Anatomy' | 'HRA', asset: AssetKey, fixedLayer?: MajorLayer, fixedSystem?: string): void {
    const meshes: THREE.Mesh[] = [];
    root.traverse(child => { if (child instanceof THREE.Mesh) meshes.push(child); });
    const counters = new Map<string, number>();
    for (const mesh of meshes) {
      geometries.add(mesh.geometry);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const lineage: THREE.Object3D[] = [];
      for (let node: THREE.Object3D | null = mesh; node && node !== root.parent; node = node.parent) lineage.unshift(node);
      const metadata = Object.assign({}, ...lineage.map(node => node.userData)) as Record<string, unknown>;
      const type = asText(metadata.type).toLowerCase();
      const searchable = `${type} ${mesh.name}`.toLowerCase();
      let layer: MajorLayer = fixedLayer ?? 'muscles';
      if (!fixedLayer) {
        if (type === 'bone' || type.includes('bone')) layer = 'skeleton';
        else if (type === 'muscle' || type.includes('muscle')) layer = 'muscles';
        else if (/\bbone\b|skeleton/.test(searchable)) layer = 'skeleton';
        else if (/\bmuscle\b|muscular/.test(searchable)) layer = 'muscles';
      }
      const rawName = asText(metadata.label) || asText(metadata.name) || asText(metadata.nameDetail) || mesh.name;
      const name = cleanName(rawName);
      const baseId = `${source === 'HRA' ? 'hra' : 'za'}:${asset}:${layer}:${slug(name)}`;
      const ordinal = (counters.get(baseId) ?? 0) + 1;
      counters.set(baseId, ordinal);
      let id = ordinal === 1 ? baseId : `${baseId}:${ordinal}`;
      while (byId.has(id)) id = `${baseId}:${ordinal}-${byId.size}`;
      const description = asText(metadata.description) || `${name} is shown as part of the ${fixedSystem ?? LAYER_SYSTEM[layer]}.`;
      const functionText = asText(metadata.function);
      const location = asText(metadata.location);
      const info: StructureInfo = {
        id, name, layer, system: fixedSystem ?? LAYER_SYSTEM[layer], description, source,
        ...(functionText ? { function: functionText } : {}),
        ...(location ? { location } : {}),
      };
      const record: StructureRecord = {
        info, mesh, materials: cloneMaterials(mesh), asset,
        basePosition: mesh.position.clone(), baseScale: mesh.scale.clone(), explodedPosition: mesh.position.clone(),
        alpha: layerShown({ info, asset } as StructureRecord) ? 1 : 0,
        targetAlpha: layerShown({ info, asset } as StructureRecord) ? 1 : 0,
      };
      if (asset === 'skin') {
        for (const state of record.materials) {
          if ('color' in state.material) (state.material as THREE.MeshStandardMaterial).color.set(0xc79272);
          if ('roughness' in state.material) (state.material as THREE.MeshStandardMaterial).roughness = 0.72;
        }
      }
      mesh.userData.structureId = id;
      mesh.userData.structureInfo = info;
      records.push(record);
      byId.set(id, record);
      updateMaterial(record);
    }
    roots.add(root);
    scene.add(root);
    computeExplodedPositions();
  }

  function computeExplodedPositions(): void {
    scene.updateMatrixWorld(true);
    const bodyCenter = new THREE.Vector3(0, 0.86, 0);
    const center = new THREE.Vector3();
    const displaced = new THREE.Vector3();
    for (const record of records) {
      new THREE.Box3().setFromObject(record.mesh).getCenter(center);
      const direction = center.clone().sub(bodyCenter);
      if (direction.lengthSq() < 0.0001) direction.set(0, center.y >= bodyCenter.y ? 1 : -1, 0);
      direction.normalize().multiplyScalar(0.055);
      if (record.mesh.parent) {
        displaced.copy(center).add(direction);
        const localCenter = record.mesh.parent.worldToLocal(center.clone());
        record.explodedPosition.copy(record.basePosition).add(record.mesh.parent.worldToLocal(displaced).sub(localCenter));
      }
      record.mesh.position.copy(exploded ? record.explodedPosition : record.basePosition);
    }
  }

  function loadUrl(url: string, message: string, progressBase: number, progressSpan: number): Promise<THREE.Object3D> {
    return new Promise((resolve, reject) => {
      loader.load(url, gltf => {
        if (disposed) {
          gltf.scene.traverse(child => {
            if (child instanceof THREE.Mesh) {
              child.geometry.dispose();
              materialArray(child.material as MeshMaterial).forEach(material => material.dispose());
            }
          });
          reject(new Error('Viewer was disposed'));
          return;
        }
        resolve(gltf.scene);
      }, event => {
        const fraction = event.lengthComputable && event.total ? event.loaded / event.total : 0;
        callbacks.onProgress(message, Math.round(progressBase + fraction * progressSpan));
      }, reject);
    });
  }

  function loadAsset(keyName: keyof typeof ASSETS, initial = false): Promise<void> {
    const existing = assetPromises.get(keyName);
    if (existing) return existing;
    const definition = ASSETS[keyName];
    const promise = loadUrl(`/anatomy/hra-v1.2/${definition.file}`, `Loading ${definition.file.replace('.glb', '').replace(/_/g, ' ')}...`, initial ? 72 : 10, initial ? 27 : 80)
      .then(root => {
        root.name = `HRA ${keyName}`;
        root.scale.setScalar(HRA_ROOT_SCALE);
        root.position.copy(HRA_ROOT_POSITION);
        root.updateMatrixWorld(true);
        registerModel(root, 'HRA', keyName, definition.layer, definition.system);
        beginFade();
        callbacks.onReady(records.map(record => record.info));
      })
      .catch(error => {
        assetPromises.delete(keyName);
        if (!initial) {
          const message = `Failed to load ${definition.file}: ${errorMessage(error)}. Already loaded anatomy remains available.`;
          callbacks.onFailure(message);
        }
        throw error;
      });
    assetPromises.set(keyName, promise);
    return promise;
  }

  async function initialize(): Promise<void> {
    try {
      callbacks.onProgress('Loading Z-Anatomy musculoskeletal model...', 0);
      const body = await loadUrl('/body.glb', 'Loading Z-Anatomy musculoskeletal model...', 0, 70);
      body.name = 'Z-Anatomy musculoskeletal model';
      registerModel(body, 'Z-Anatomy', 'z-anatomy');
      callbacks.onProgress('Loading HRA body surface...', 72);
      await loadAsset('skin', true);
      if (!disposed) {
        callbacks.onProgress('Anatomy ready', 100);
        callbacks.onReady(records.map(record => record.info));
        requestRender();
      }
    } catch (error) {
      if (!disposed) callbacks.onFailure(`Failed to load the initial anatomy: ${errorMessage(error)}.`);
    }
  }

  function moveCamera(position: THREE.Vector3, target: THREE.Vector3, duration = 520): void {
    const distance = position.distanceTo(target);
    if (distance < controls.minDistance) position.copy(target).add(position.clone().sub(target).normalize().multiplyScalar(controls.minDistance));
    if (reducedMotion.matches) {
      camera.position.copy(position);
      controls.target.copy(target);
      cameraMove = null;
    } else {
      cameraMove = { start: performance.now(), duration: THREE.MathUtils.clamp(duration, 300, 800), fromPosition: camera.position.clone(), toPosition: position.clone(), fromTarget: controls.target.clone(), toTarget: target.clone() };
    }
    requestRender();
  }

  function focus(id: string | null = selectedId): void {
    const record = id ? byId.get(id) : undefined;
    if (!record) {
      moveCamera(homePosition.clone(), homeTarget.clone());
      return;
    }
    scene.updateMatrixWorld(true);
    const sphere = new THREE.Box3().setFromObject(record.mesh).getBoundingSphere(new THREE.Sphere());
    const radius = Math.max(sphere.radius, 0.025);
    const fov = THREE.MathUtils.degToRad(camera.fov);
    const fitDistance = Math.max(controls.minDistance, radius / Math.sin(fov / 2) * 1.25);
    const direction = camera.position.clone().sub(controls.target).normalize();
    moveCamera(sphere.center.clone().add(direction.multiplyScalar(fitDistance)), sphere.center, 480);
  }

  function select(id: string | null): void {
    selectedId = id && byId.has(id) ? id : null;
    for (const record of records) updateMaterial(record);
    requestRender();
  }

  function isolate(id: string | null): void {
    isolatedId = id && byId.has(id) ? id : null;
    beginFade();
  }

  async function setLayer(layer: AnatomyLayer): Promise<void> {
    const request = ++layerRequest;
    const needed: (keyof typeof ASSETS)[] = layer === 'all' || layer === 'organs' ? INTERNAL_ASSETS : layer === 'surface' ? ['skin'] : LAYER_ASSETS[layer];
    const results = await Promise.allSettled(needed.map(keyName => loadAsset(keyName)));
    if (request !== layerRequest || disposed) return;
    const failures = results.filter(result => result.status === 'rejected');
    if (failures.length) throw new Error(`${failures.length} anatomy asset${failures.length === 1 ? '' : 's'} failed to load.`);
    activeLayer = layer;
    isolatedId = null;
    select(null);
    resetAnimation();
    beginFade();
    callbacks.onReady(records.map(record => record.info));
  }

  function command(value: CameraCommand): void {
    const target = controls.target.clone();
    const distance = THREE.MathUtils.clamp(camera.position.distanceTo(target), controls.minDistance, controls.maxDistance);
    if (value === 'reset') { moveCamera(homePosition.clone(), homeTarget.clone()); return; }
    if (value === 'in' || value === 'out') {
      const direction = camera.position.clone().sub(target).normalize();
      const next = THREE.MathUtils.clamp(distance * (value === 'in' ? 0.78 : 1.28), controls.minDistance, controls.maxDistance);
      moveCamera(target.clone().add(direction.multiplyScalar(next)), target, 320);
      return;
    }
    const positions: Record<'front' | 'back' | 'left' | 'right', THREE.Vector3> = {
      front: new THREE.Vector3(0, 0, distance), back: new THREE.Vector3(0, 0, -distance),
      left: new THREE.Vector3(distance, 0, 0), right: new THREE.Vector3(-distance, 0, 0),
    };
    moveCamera(target.clone().add(positions[value]), target, 520);
  }

  function setOpacity(layer: MajorLayer, opacity: number): void {
    layerOpacity[layer] = THREE.MathUtils.clamp(opacity, 0, 1);
    for (const record of records) updateMaterial(record);
    requestRender();
  }

  function setXray(enabled: boolean): void {
    xray = enabled;
    for (const record of records) updateMaterial(record);
    requestRender();
  }

  function setLabels(enabled: boolean): void {
    labelsEnabled = enabled;
    if (!enabled) label.hidden = true;
    requestRender();
  }

  function setExploded(enabled: boolean): void {
    exploded = enabled;
    for (const record of records) record.mesh.position.copy(enabled ? record.explodedPosition : record.basePosition);
    requestRender();
  }

  function setAnimation(state: AnimationState): void {
    const supported = activeLayer === 'respiratory' || activeLayer === 'circulatory' || activeLayer === 'digestive' || activeLayer === 'nervous' || activeLayer === 'muscles' || activeLayer === 'skeleton';
    if (!supported) return;
    animationState = state;
    if (state === 'stopped') resetAnimation();
    requestRender();
  }

  function resetAnimation(): void {
    animationState = 'stopped';
    animationTime = 0;
    overlay.visible = false;
    restoreAnimatedScales();
    requestRender();
  }

  function getStructures(layer?: AnatomyLayer): StructureInfo[] {
    return records.filter(record => !layer || layer === 'all' || (layer === 'organs' ? record.asset !== 'z-anatomy' && record.info.layer !== 'surface' : record.info.layer === layer)).map(record => record.info);
  }

  function pick(event: PointerEvent): StructureRecord | undefined {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return undefined;
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const candidates = records.filter(record => record.mesh.visible && record.alpha > 0.05 && isVisibleInHierarchy(record.mesh)).map(record => record.mesh);
    const hit = raycaster.intersectObjects(candidates, false)[0]?.object;
    const id = hit?.userData.structureId;
    return typeof id === 'string' ? byId.get(id) : undefined;
  }

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || pointerDown) return;
    pointerDown = { x: event.clientX, y: event.clientY, id: event.pointerId };
    pointerDragged = false;
  };
  const onPointerMove = (event: PointerEvent) => {
    if (pointerDown && Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > 6) pointerDragged = true;
  };
  const onPointerUp = (event: PointerEvent) => {
    if (!pointerDown || pointerDown.id !== event.pointerId) return;
    const clicked = !pointerDragged && Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) <= 6;
    pointerDown = null;
    if (!clicked) return;
    const record = pick(event);
    select(record?.info.id ?? null);
    callbacks.onSelect(record?.info ?? null);
  };
  const onDoubleClick = (event: MouseEvent) => {
    const record = pick(event as PointerEvent);
    if (record) { select(record.info.id); callbacks.onSelect(record.info); focus(record.info.id); }
  };
  const onPointerCancel = () => { pointerDown = null; pointerDragged = false; };
  const onKeyDown = (event: KeyboardEvent) => {
    const map: Record<string, CameraCommand> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'front', ArrowDown: 'back', '+': 'in', '=': 'in', '-': 'out', Home: 'reset' };
    const value = map[event.key];
    if (value) { event.preventDefault(); command(value); }
  };
  const onContextLost = (event: Event) => { event.preventDefault(); callbacks.onFailure('The WebGL graphics context was lost. Reload the viewer to continue.'); };
  const onVisibilityChange = () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
    else requestRender();
  };
  const onControlStart = () => { cameraMove = null; controlsSettling = 12; requestRender(); };
  const onControlEnd = () => { controlsSettling = 12; requestRender(); };
  const onControlChange = () => requestRender();

  controls.addEventListener('start', onControlStart);
  controls.addEventListener('end', onControlEnd);
  controls.addEventListener('change', onControlChange);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);
  canvas.addEventListener('dblclick', onDoubleClick);
  canvas.addEventListener('keydown', onKeyDown);
  canvas.addEventListener('webglcontextlost', onContextLost);
  document.addEventListener('visibilitychange', onVisibilityChange);
  cleanups.push(() => {
    controls.removeEventListener('start', onControlStart);
    controls.removeEventListener('end', onControlEnd);
    controls.removeEventListener('change', onControlChange);
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerCancel);
    canvas.removeEventListener('dblclick', onDoubleClick);
    canvas.removeEventListener('keydown', onKeyDown);
    canvas.removeEventListener('webglcontextlost', onContextLost);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  });

  const resizeObserver = new ResizeObserver(() => {
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(width, height, false);
    requestRender();
  });
  resizeObserver.observe(host);
  cleanups.push(() => resizeObserver.disconnect());

  const intersectionObserver = new IntersectionObserver(([entry]) => {
    inView = entry?.isIntersecting ?? true;
    if (inView) requestRender();
    else { cancelAnimationFrame(frame); frame = 0; }
  });
  intersectionObserver.observe(host);
  cleanups.push(() => intersectionObserver.disconnect());

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    cleanups.forEach(cleanup => cleanup());
    controls.dispose();
    draco.dispose();
    roots.forEach(root => scene.remove(root));
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
    textures.forEach(texture => texture.dispose());
    key.shadow.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
    label.hidden = true;
    records.length = 0;
    byId.clear();
    assetPromises.clear();
  }

  void initialize();
  requestRender();
  return { setLayer, select, focus, isolate, command, setOpacity, setXray, setLabels, setExploded, setAnimation, resetAnimation, dispose, getStructures };
}
