import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { SYSTEMS, type System, type Point } from './anatomy';

export type CameraCommand = 'left' | 'right' | 'up' | 'down' | 'in' | 'out' | 'pan-left' | 'pan-right' | 'pan-up' | 'pan-down' | 'reset';

export interface StructureInfo {
  id: string;
  name: string;
}

export interface BodyScene {
  setSystem: (system: System) => void;
  select: (id: string | null) => void;
  command: (command: CameraCommand) => void;
  dispose: () => void;
  getStructures: (system: System) => StructureInfo[];
}

const SYSTEM_COLORS: Record<System, string> = {
  body: '#c9a487',
  skeleton: '#eee1bd',
  muscles: '#e18179',
  nervous: '#f5d45e',
};

const SYSTEM_MATERIALS: Record<System, THREE.MeshStandardMaterialParameters> = {
  body: { color: '#c9a487', roughness: 0.7, metalness: 0.05 },
  skeleton: { color: '#f0e6d2', roughness: 0.85, metalness: 0.0 },
  muscles: { color: '#b84545', roughness: 0.6, metalness: 0.05 },
  nervous: { color: '#e8b84d', roughness: 0.55, metalness: 0.1, emissive: '#8b6b1a', emissiveIntensity: 0.15 },
};

function createSystemMaterial(system: System): THREE.MeshStandardMaterial {
  const params = SYSTEM_MATERIALS[system];
  const material = new THREE.MeshStandardMaterial(params);
  material.name = `${system}-material`;
  return material;
}

export function createBodyScene(
  host: HTMLDivElement,
  label: HTMLDivElement,
  onSelect: (system: System, id: string) => void,
  onFailure: (message: string) => void,
): BodyScene {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  let renderer: THREE.WebGLRenderer | undefined;
  let controls: OrbitControls | undefined;
  let observer: ResizeObserver | undefined;
  let visibilityObserver: IntersectionObserver | undefined;
  let frame = 0;
  let disposed = false;
  let inView = true;
  const cleanups: (() => void)[] = [];

  const systemGroups = Object.fromEntries(
    SYSTEMS.map(system => {
      const group = new THREE.Group();
      group.name = `${system} anatomical system`;
      group.visible = false;
      return [system, group];
    })
  ) as Record<System, THREE.Group>;

  const originalMaterials = new Map<THREE.Mesh, THREE.Material>();
  const highlightMaterial = new THREE.MeshStandardMaterial({
    color: '#3b91a8',
    emissive: '#3b91a8',
    emissiveIntensity: 0.85,
    roughness: 0.3,
    metalness: 0.1,
  });
  materials.add(highlightMaterial);

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    observer?.disconnect();
    visibilityObserver?.disconnect();
    cleanups.forEach(cleanup => cleanup());
    controls?.dispose();
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
    renderer?.dispose();
    renderer?.forceContextLoss();
    renderer?.domElement.remove();
    label.hidden = true;
    originalMaterials.clear();
  };

  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    const view = renderer;
    view.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    view.shadowMap.enabled = true;
    view.shadowMap.type = THREE.PCFSoftShadowMap;
    view.shadowMap.autoUpdate = false;
    view.shadowMap.needsUpdate = true;
    view.outputColorSpace = THREE.SRGBColorSpace;
    view.toneMapping = THREE.ACESFilmicToneMapping;
    view.toneMappingExposure = 1.1;
    const canvas = view.domElement;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Interactive 3D human anatomy. Use camera controls and region buttons for navigation.');
    canvas.setAttribute('aria-describedby', 'human-body-interaction');
    canvas.tabIndex = 0;
    canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline-offset:-4px';
    host.appendChild(canvas);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0f1824');
    scene.fog = new THREE.Fog('#0f1824', 18, 40);

    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 80);
    const homeTarget = new THREE.Vector3(0, 1.0, 0);
    const homePosition = new THREE.Vector3(0.5, 1.2, 4.8);
    camera.position.copy(homePosition);

    controls = new OrbitControls(camera, canvas);
    const orbit = controls;
    orbit.target.copy(homeTarget);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.12;
    orbit.minDistance = 1.2;
    orbit.maxDistance = 12;
    orbit.minPolarAngle = 0.1;
    orbit.maxPolarAngle = Math.PI - 0.1;
    orbit.maxTargetRadius = 1.5;
    orbit.cursor.copy(homeTarget);
    orbit.zoomSpeed = 0.85;
    orbit.panSpeed = 0.65;
    orbit.update();

    scene.add(new THREE.HemisphereLight('#d0e8ff', '#4a4a4a', 1.8));
    const keyLight = new THREE.DirectionalLight('#fff5e6', 2.8);
    keyLight.position.set(-3, 6, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    Object.assign(keyLight.shadow.camera, { left: -3.5, right: 3.5, top: 5, bottom: -2.5, near: 0.5, far: 20 });
    keyLight.shadow.bias = -0.0003;
    keyLight.shadow.normalBias = 0.02;
    keyLight.target.position.set(0, 1.0, 0);
    scene.add(keyLight, keyLight.target);
    cleanups.push(() => keyLight.shadow.dispose());

    const rimLight = new THREE.DirectionalLight('#7eb8e0', 1.6);
    rimLight.position.set(3, 4, -3);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight('#ffffff', 0.6);
    fillLight.position.set(0, -4, 0);
    scene.add(fillLight);

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');

    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    let modelLoaded = false;
    let currentSystem: System = 'body';
    let selected: string | null = null;
    let resetAnim: { start: number; position: THREE.Vector3; target: THREE.Vector3 } | null = null;
    let rendering = false;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const point = new THREE.Vector3();
    const offset = new THREE.Vector3();
    const spherical = new THREE.Spherical();

    function requestRender() {
      if (!disposed && !frame && !rendering && inView && !document.hidden) {
        frame = requestAnimationFrame(render);
      }
    }

    function render(now: number) {
      frame = 0;
      if (disposed || !inView || document.hidden) return;
      rendering = true;

      if (resetAnim) {
        const progress = Math.min((now - resetAnim.start) / 480, 1);
        const ease = 1 - (1 - progress) ** 3;
        camera.position.lerpVectors(resetAnim.position, homePosition, ease);
        orbit.target.lerpVectors(resetAnim.target, homeTarget, ease);
        if (progress === 1) resetAnim = null;
      }

      const changed = orbit.update();
      view.render(scene, camera);

      if (selected && systemGroups[currentSystem]) {
        const targetMesh = systemGroups[currentSystem].getObjectByName(selected);
        if (targetMesh) {
          targetMesh.getWorldPosition(point).project(camera);
          const visible = point.z > -1 && point.z < 1 && Math.abs(point.x) < 0.95 && Math.abs(point.y) < 0.94;
          label.hidden = !visible;
          if (visible) {
            label.textContent = selected;
            label.style.left = `${(point.x * 0.5 + 0.5) * host.clientWidth}px`;
            label.style.top = `${(-point.y * 0.5 + 0.5) * host.clientHeight}px`;
          }
        } else {
          label.hidden = true;
        }
      } else {
        label.hidden = true;
      }

      rendering = false;
      if (changed || resetAnim) requestRender();
    }

    function applySystemMaterials(group: THREE.Group, system: System) {
      const sysMaterial = createSystemMaterial(system);
      materials.add(sysMaterial);
      group.traverse(child => {
        if (child instanceof THREE.Mesh) {
          originalMaterials.set(child, child.material);
          child.material = sysMaterial;
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
    }

    function loadModel() {
      const modelUrl = '/body.glb';
      loader.load(
        modelUrl,
        (gltf) => {
          if (disposed) return;
          const model = gltf.scene;
          model.name = 'AnatomicalModel';
          
          model.traverse(child => {
            if (child instanceof THREE.Mesh) {
              geometries.add(child.geometry);
              if (child.material) {
                if (Array.isArray(child.material)) {
                  child.material.forEach(m => materials.add(m));
                } else {
                  materials.add(child.material);
                }
              }
              child.castShadow = true;
              child.receiveShadow = true;
              child.frustumCulled = true;
            }
          });

          const bbox = new THREE.Box3().setFromObject(model);
          const size = bbox.getSize(new THREE.Vector3());
          const center = bbox.getCenter(new THREE.Vector3());
          
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 2.0 / maxDim;
          model.scale.setScalar(scale);
          
          model.position.sub(center.clone().multiplyScalar(scale));
          model.position.y += 1.0;

          const systemMap: Record<string, System> = {
            'skin': 'body',
            'body': 'body',
            'skeleton': 'skeleton',
            'bone': 'skeleton',
            'muscle': 'muscles',
            'muscles': 'muscles',
            'nervous': 'nervous',
            'nerve': 'nervous',
            'brain': 'nervous',
            'spinal': 'nervous',
            'organ': 'body',
            'heart': 'body',
            'lung': 'body',
            'liver': 'body',
            'stomach': 'body',
            'kidney': 'body',
            'intestine': 'body',
          };

          model.traverse(child => {
            if (child instanceof THREE.Mesh) {
              const name = child.name.toLowerCase();
              let assignedSystem: System = 'body';
              for (const [keyword, sys] of Object.entries(systemMap)) {
                if (name.includes(keyword)) {
                  assignedSystem = sys;
                  break;
                }
              }
              if (!systemGroups[assignedSystem]) assignedSystem = 'body';
              systemGroups[assignedSystem].add(child);
              child.userData.originalSystem = assignedSystem;
              child.userData.anatomicalName = child.name;
            }
          });

          SYSTEMS.forEach(sys => {
            scene.add(systemGroups[sys]);
          });

          applySystemMaterials(systemGroups.body, 'body');
          applySystemMaterials(systemGroups.skeleton, 'skeleton');
          applySystemMaterials(systemGroups.muscles, 'muscles');
          applySystemMaterials(systemGroups.nervous, 'nervous');

          systemGroups.body.visible = true;
          modelLoaded = true;
          setStatus('ready');
          requestRender();
        },
        (progress) => {
          if (progress.lengthComputable) {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            setStatus(`loading ${percent}%`);
          }
        },
        (error) => {
          if (disposed) return;
          console.error('Failed to load anatomical model:', error);
          onFailure('Failed to load the anatomical model. Ensure a valid GLB file is available at /body.glb');
          setStatus('error');
        }
      );
    }

    let status: string = 'loading';
    function setStatus(newStatus: string) {
      status = newStatus;
      if (newStatus === 'ready') {
        modelLoaded = true;
      }
    }

    const select = (id: string | null) => {
      selected = id;
      if (!modelLoaded) return;
      SYSTEMS.forEach(sys => {
        const group = systemGroups[sys];
        group.traverse(child => {
          if (child instanceof THREE.Mesh && child.name === id) {
            child.material = highlightMaterial;
          } else if (child instanceof THREE.Mesh && originalMaterials.has(child)) {
            child.material = originalMaterials.get(child)!;
          }
        });
      });
      requestRender();
    };

    const setSystem = (value: System) => {
      currentSystem = value;
      SYSTEMS.forEach(sys => {
        systemGroups[sys].visible = sys === value;
      });
      canvas.setAttribute('aria-label', `Interactive 3D human ${value} model. Select structures using the adjacent buttons.`);
      select(null);
      requestRender();
    };

    const command = (value: CameraCommand) => {
      resetAnim = null;
      orbit.enableDamping = false;
      orbit.update();
      orbit.enableDamping = true;

      if (value === 'reset') {
        if (reducedMotion.matches) {
          camera.position.copy(homePosition);
          orbit.target.copy(homeTarget);
        } else {
          resetAnim = { start: performance.now(), position: camera.position.clone(), target: orbit.target.clone() };
        }
      } else if (value.startsWith('pan-')) {
        const direction = new THREE.Vector3();
        direction.setFromMatrixColumn(camera.matrix, value === 'pan-up' || value === 'pan-down' ? 1 : 0);
        direction.multiplyScalar(value === 'pan-left' || value === 'pan-down' ? -0.15 : 0.15);
        camera.position.add(direction);
        orbit.target.add(direction);
      } else {
        offset.copy(camera.position).sub(orbit.target);
        spherical.setFromVector3(offset);
        if (value === 'left') spherical.theta -= 0.2;
        if (value === 'right') spherical.theta += 0.2;
        if (value === 'up') spherical.phi -= 0.15;
        if (value === 'down') spherical.phi += 0.15;
        if (value === 'in') spherical.radius *= 0.86;
        if (value === 'out') spherical.radius /= 0.86;
        spherical.phi = THREE.MathUtils.clamp(spherical.phi, orbit.minPolarAngle, orbit.maxPolarAngle);
        spherical.radius = THREE.MathUtils.clamp(spherical.radius, orbit.minDistance, orbit.maxDistance);
        camera.position.copy(orbit.target).add(offset.setFromSpherical(spherical));
      }
      requestRender();
    };

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let down: { x: number; y: number; id: number } | null = null;
    let dragged = false;

    const pointerDown = (event: PointerEvent) => {
      if (down || event.button !== 0) { dragged = true; return; }
      down = { x: event.clientX, y: event.clientY, id: event.pointerId };
      dragged = false;
    };

    const pointerMove = (event: PointerEvent) => {
      if (down && Math.hypot(event.clientX - down.x, event.clientY - down.y) > 6) dragged = true;
    };

    const pointerUp = (event: PointerEvent) => {
      if (!down || down.id !== event.pointerId) return;
      const clicked = !dragged && Math.hypot(event.clientX - down.x, event.clientY - down.y) <= 6;
      down = null;
      if (!clicked || !modelLoaded) return;
      const rect = canvas.getBoundingClientRect();
      pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const group = systemGroups[currentSystem];
      const hit = raycaster.intersectObjects(group.children, true)[0];
      if (hit?.object) {
        let mesh = hit.object;
        while (mesh.parent && mesh.parent !== group && !(mesh.parent instanceof THREE.Scene)) {
          mesh = mesh.parent as THREE.Mesh;
        }
        if (mesh.userData.anatomicalName) {
          onSelect(currentSystem, mesh.userData.anatomicalName);
        } else if (mesh.name) {
          onSelect(currentSystem, mesh.name);
        }
      }
    };

    const pointerCancel = () => { down = null; dragged = false; };

    const keyDown = (event: KeyboardEvent) => {
      const keys: Record<string, CameraCommand> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', '+': 'in', '=': 'in', '-': 'out', Home: 'reset' };
      let value = keys[event.key];
      if (event.shiftKey && event.key.startsWith('Arrow')) value = `pan-${value}` as CameraCommand;
      if (value) { event.preventDefault(); command(value); }
    };

    const contextLost = (event: Event) => {
      event.preventDefault();
      onFailure('The WebGL graphics context was lost. Reload to try again. A WebGL 2 capable browser with graphics acceleration is required.');
      dispose();
    };

    const visibilityChange = () => {
      if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
      else requestRender();
    };

    const controlStart = () => { resetAnim = null; requestRender(); };

    orbit.addEventListener('change', requestRender);
    orbit.addEventListener('start', controlStart);
    canvas.addEventListener('pointerdown', pointerDown);
    canvas.addEventListener('pointermove', pointerMove);
    canvas.addEventListener('pointerup', pointerUp);
    canvas.addEventListener('pointercancel', pointerCancel);
    canvas.addEventListener('keydown', keyDown);
    canvas.addEventListener('webglcontextlost', contextLost);
    document.addEventListener('visibilitychange', visibilityChange);

    cleanups.push(() => {
      orbit.removeEventListener('change', requestRender);
      orbit.removeEventListener('start', controlStart);
      canvas.removeEventListener('pointerdown', pointerDown);
      canvas.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('pointerup', pointerUp);
      canvas.removeEventListener('pointercancel', pointerCancel);
      canvas.removeEventListener('keydown', keyDown);
      canvas.removeEventListener('webglcontextlost', contextLost);
      document.removeEventListener('visibilitychange', visibilityChange);
    });

    let firstSize = true;
    observer = new ResizeObserver(() => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      homePosition.z = Math.min(10, Math.max(4.8, 2.5 / camera.aspect));
      if (firstSize) { camera.position.copy(homePosition); firstSize = false; }
      view.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      view.setSize(width, height, false);
      requestRender();
    });
    observer.observe(host);

    visibilityObserver = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) requestRender();
      else { cancelAnimationFrame(frame); frame = 0; }
    });
    visibilityObserver.observe(host);

    loadModel();

    const getStructures = (sys: System): StructureInfo[] => {
      const group = systemGroups[sys];
      const structures: StructureInfo[] = [];
      group.traverse(child => {
        if (child instanceof THREE.Mesh && child.name) {
          structures.push({ id: child.name, name: child.name });
        }
      });
      return structures;
    };

    return { setSystem, select, command, dispose, getStructures };
  } catch (error) {
    dispose();
    throw error;
  }
}