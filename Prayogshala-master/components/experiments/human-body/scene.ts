import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { REGIONS, SYSTEMS, type Point, type System } from './anatomy';

export type CameraCommand = 'left' | 'right' | 'up' | 'down' | 'in' | 'out' | 'pan-left' | 'pan-right' | 'pan-up' | 'pan-down' | 'reset';
export interface BodyScene {
  setSystem: (system: System) => void;
  select: (id: string | null) => void;
  command: (command: CameraCommand) => void;
  dispose: () => void;
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
  };

  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
    const view = renderer;
    view.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    view.shadowMap.enabled = true;
    view.shadowMap.type = THREE.PCFSoftShadowMap;
    view.shadowMap.autoUpdate = false;
    view.shadowMap.needsUpdate = true;
    view.outputColorSpace = THREE.SRGBColorSpace;
    view.toneMapping = THREE.ACESFilmicToneMapping;
    view.toneMappingExposure = 1.25;
    const canvas = view.domElement;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Interactive 3D human anatomy, anterior facing forward. Use the camera buttons and anatomical region buttons for keyboard access.');
    canvas.setAttribute('aria-describedby', 'human-body-interaction');
    canvas.tabIndex = 0;
    canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline-offset:-4px';
    host.appendChild(canvas);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#111d2c');
    scene.fog = new THREE.Fog('#111d2c', 22, 42);
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
    const homeTarget = new THREE.Vector3(0, 3.9, 0);
    const homePosition = new THREE.Vector3(0.7, 4.35, 14.6);
    camera.position.copy(homePosition);
    controls = new OrbitControls(camera, canvas);
    const orbit = controls;
    orbit.target.copy(homeTarget);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.13;
    orbit.minDistance = 4;
    orbit.maxDistance = 24;
    orbit.minPolarAngle = 0.15;
    orbit.maxPolarAngle = Math.PI - 0.15;
    orbit.maxTargetRadius = 3;
    orbit.cursor.copy(homeTarget);
    orbit.zoomSpeed = 0.8;
    orbit.panSpeed = 0.7;
    orbit.update();

    scene.add(new THREE.HemisphereLight('#e5f2ff', '#50504a', 2));
    const key = new THREE.DirectionalLight('#fff1da', 3.4);
    key.position.set(-4, 10, 7);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -5, right: 5, top: 9, bottom: -2, near: 0.5, far: 25 });
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.025;
    key.target.position.set(0, 3.8, 0);
    scene.add(key, key.target);
    cleanups.push(() => key.shadow.dispose());
    const rim = new THREE.DirectionalLight('#8ebbd8', 2.3);
    rim.position.set(4, 6, -5);
    scene.add(rim);

    function geometry<T extends THREE.BufferGeometry>(value: T, name: string): T {
      value.name = name;
      geometries.add(value);
      return value;
    }
    function material(color: string, extra: THREE.MeshStandardMaterialParameters = {}) {
      const value = new THREE.MeshStandardMaterial({ color, roughness: 0.68, ...extra });
      materials.add(value);
      return value;
    }
    const sphere = geometry(new THREE.SphereGeometry(1, 16, 12), 'Shared low-poly anatomical ellipsoid');
    const cylinder = geometry(new THREE.CylinderGeometry(1, 1, 1, 10), 'Shared anatomical shaft');
    const groups = Object.fromEntries(SYSTEMS.map(system => {
      const group = new THREE.Group();
      group.name = `${system} anatomical system`;
      scene.add(group);
      return [system, group];
    })) as Record<System, THREE.Group>;
    const regionMaterials = new Map<string, THREE.MeshStandardMaterial>();
    const colors: Record<System, string> = { body: '#be957d', skeleton: '#e9ddbc', muscles: '#a84343', nervous: '#f1ce45' };
    let group = groups.body;
    let system: System = 'body';
    let region = 'head';
    const getMaterial = () => {
      const id = `${system}:${region}`;
      if (!regionMaterials.has(id)) regionMaterials.set(id, material(colors[system], system === 'nervous' ? { emissive: '#9d7110', emissiveIntensity: 0.22, roughness: 0.45 } : {}));
      return regionMaterials.get(id)!;
    };
    function mesh(name: string, shape: THREE.BufferGeometry, position: Point, scale: Point, surface = getMaterial()) {
      const part = new THREE.Mesh(shape, surface);
      part.name = name;
      part.position.set(...position);
      part.scale.set(...scale);
      part.userData.region = region;
      part.castShadow = true;
      part.receiveShadow = true;
      group.add(part);
      return part;
    }
    const ellipsoid = (name: string, center: Point, scale: Point, surface?: THREE.MeshStandardMaterial) => mesh(name, sphere, center, scale, surface);
    function between(name: string, a: Point, b: Point, radius: number, depth = radius, round = false) {
      const start = new THREE.Vector3(...a);
      const end = new THREE.Vector3(...b);
      const delta = end.clone().sub(start);
      const center = start.add(end).multiplyScalar(0.5).toArray() as Point;
      const part = mesh(name, round ? sphere : cylinder, center, [radius, delta.length() / (round ? 2 : 1), depth]);
      part.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
      return part;
    }
    function tube(name: string, points: Point[], radius: number, segments = 16) {
      const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
      return mesh(name, geometry(new THREE.TubeGeometry(curve, segments, radius, 6, false), name), [0, 0, 0], [1, 1, 1]);
    }

    // +Y is superior, +Z anterior, +X the subject's left (viewer-right from the front).
    ellipsoid('Head / cranium', [0, 7.15, 0], [0.43, 0.57, 0.4]);
    ellipsoid('Lower face / jaw', [0, 6.92, 0.14], [0.32, 0.3, 0.3]);
    ellipsoid('Nose / anterior landmark', [0, 7.06, 0.41], [0.075, 0.13, 0.12]);
    between('Neck', [0, 6.22, 0], [0, 6.8, 0], 0.23);
    const dark = material('#3b302c');
    for (const side of [-1, 1]) {
      ellipsoid(`${side === 1 ? 'Left' : 'Right'} ear`, [side * 0.43, 7.1, 0], [0.085, 0.16, 0.09]);
      ellipsoid(`${side === 1 ? 'Left' : 'Right'} eye`, [side * 0.15, 7.2, 0.365], [0.048, 0.038, 0.025], dark);
    }
    region = 'trunk';
    const profile = [[0.25, 3.55], [0.62, 3.75], [0.67, 4.05], [0.53, 4.45], [0.62, 4.95], [0.83, 5.5], [0.92, 5.92], [0.8, 6.12], [0.28, 6.36]];
    mesh('Parametric ribcage waist and pelvis surface', geometry(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 24), 'Proportional torso surface of revolution'), [0, 0, 0], [1, 1, 0.58]);
    for (const side of [-1, 1]) {
      const name = side === 1 ? 'Left' : 'Right';
      region = `${name.toLowerCase()}-arm`;
      ellipsoid(`${name} shoulder`, [side * 0.92, 5.93, 0], [0.33, 0.34, 0.32]);
      between(`${name} upper arm`, [side * 1.02, 5.97, 0], [side * 1.34, 4.69, 0], 0.25, 0.26, true);
      ellipsoid(`${name} elbow`, [side * 1.34, 4.71, 0], [0.18, 0.2, 0.19]);
      between(`${name} forearm`, [side * 1.34, 4.84, 0], [side * 1.57, 3.63, 0.03], 0.19, 0.19, true);
      ellipsoid(`${name} palm / anterior facing`, [side * 1.6, 3.48, 0.03], [0.17, 0.26, 0.085]);
      for (let finger = 0; finger < 4; finger++) {
        const x = side * (1.72 - finger * 0.08);
        between(`${name} finger ${finger + 2}`, [x, 3.37, 0.03], [x + side * 0.025, 3.02 + Math.abs(finger - 1) * 0.045, 0.04], 0.035, 0.04, true);
      }
      between(`${name} thumb / lateral in anatomical position`, [side * 1.73, 3.6, 0.05], [side * 1.87, 3.3, 0.1], 0.055, 0.055, true);
      region = `${name.toLowerCase()}-leg`;
      between(`${name} thigh`, [side * 0.46, 3.93, 0], [side * 0.53, 2.1, 0], 0.35, 0.37, true);
      ellipsoid(`${name} knee`, [side * 0.53, 2.1, 0.03], [0.23, 0.23, 0.24]);
      between(`${name} calf`, [side * 0.53, 2.14, 0], [side * 0.54, 0.47, 0], 0.24, 0.28, true);
      between(`${name} ankle`, [side * 0.54, 0.3, 0], [side * 0.54, 0.69, 0], 0.14);
      ellipsoid(`${name} foot / toes anterior`, [side * 0.54, 0.2, 0.22], [0.2, 0.17, 0.43]);
    }

    system = 'skeleton'; group = groups.skeleton; region = 'skull';
    ellipsoid('Cranium', [0, 7.2, -0.025], [0.41, 0.49, 0.36]);
    ellipsoid('Maxilla', [0, 6.98, 0.19], [0.25, 0.2, 0.19]);
    tube('Mandible', [[-0.29, 7.03, 0], [-0.24, 6.75, 0.19], [0, 6.71, 0.3], [0.24, 6.75, 0.19], [0.29, 7.03, 0]], 0.065);
    const socket = material('#665d4e');
    for (const side of [-1, 1]) ellipsoid(`${side === 1 ? 'Left' : 'Right'} orbital landmark`, [side * 0.155, 7.14, 0.315], [0.105, 0.09, 0.05], socket);
    ellipsoid('Nasal aperture landmark', [0, 7.02, 0.373], [0.055, 0.065, 0.022], socket);
    region = 'spine';
    for (let i = 0; i < 24; i++) {
      const y = 3.92 + i * 0.112;
      const z = -0.18 - Math.sin(i / 23 * Math.PI) * 0.08;
      ellipsoid(`Vertebra ${i + 1} / schematic`, [0, y, z], [i > 17 ? 0.105 : 0.135, 0.047, 0.115]);
      between(`Spinous process ${i + 1}`, [0, y, z], [0, y - 0.035, z - 0.16], 0.035);
    }
    region = 'ribs';
    between('Sternum', [0, 5.08, 0.4], [0, 5.95, 0.43], 0.065, 0.05);
    for (const side of [-1, 1]) {
      const name = side === 1 ? 'Left' : 'Right';
      for (let rib = 0; rib < 12; rib++) {
        const y = 5.98 - rib * 0.105;
        const width = 0.53 + Math.sin(rib / 11 * Math.PI) * 0.29;
        const points: Point[] = [[side * 0.08, y, -0.24], [side * width * 0.7, y + 0.02, -0.32], [side * width, y - 0.13, 0.04]];
        if (rib < 10) points.push([side * width * 0.7, y - 0.2, 0.38], [side * 0.06, rib < 7 ? y - 0.15 : 5.11, 0.4]);
        else points.push([side * width * 0.65, y - 0.22, 0.2]);
        tube(`${name} rib ${rib + 1}${rib > 9 ? ' / floating' : ''}`, points, 0.029);
      }
      region = 'pelvis';
      tube(`${name} pelvic ring`, [[0, 3.96, -0.19], [side * 0.5, 4.17, -0.15], [side * 0.64, 3.84, 0.06], [side * 0.35, 3.45, 0.21], [0, 3.54, 0.27]], 0.1);
      ellipsoid(`${name} iliac wing`, [side * 0.43, 4.02, -0.13], [0.28, 0.3, 0.085]);
      ellipsoid('Sacrum', [0, 3.84, -0.18], [0.17, 0.28, 0.1]);
      region = `${name.toLowerCase()}-arm-bones`;
      tube(`${name} clavicle`, [[side * 0.05, 6.02, 0.28], [side * 0.5, 6.13, 0.13], [side * 0.98, 5.98, 0]], 0.06);
      ellipsoid(`${name} scapula`, [side * 0.65, 5.75, -0.29], [0.26, 0.33, 0.055]);
      between(`${name} humerus`, [side * 1.02, 5.91, 0], [side * 1.34, 4.73, 0], 0.075);
      ellipsoid(`${name} humeral head`, [side * 1.02, 5.91, 0], [0.135, 0.135, 0.135]);
      between(`${name} radius / lateral thumb side`, [side * 1.41, 4.7, 0], [side * 1.64, 3.77, 0], 0.046);
      between(`${name} ulna / medial`, [side * 1.28, 4.7, 0], [side * 1.5, 3.77, 0], 0.046);
      ellipsoid(`${name} carpals / simplified`, [side * 1.57, 3.69, 0], [0.12, 0.08, 0.07]);
      for (let finger = 0; finger < 4; finger++) {
        const x = side * (1.695 - finger * 0.075);
        between(`${name} metacarpal ${finger + 2}`, [side * 1.57, 3.65, 0], [x, 3.38, 0.02], 0.022);
        between(`${name} phalanges ${finger + 2} / simplified`, [x, 3.38, 0.02], [x + side * 0.025, 3.05 + Math.abs(finger - 1) * 0.045, 0.02], 0.025);
      }
      between(`${name} thumb bones / lateral`, [side * 1.64, 3.64, 0.02], [side * 1.85, 3.31, 0.04], 0.035);
      region = `${name.toLowerCase()}-leg-bones`;
      between(`${name} femoral neck`, [side * 0.38, 3.77, 0], [side * 0.61, 3.6, 0], 0.09);
      ellipsoid(`${name} femoral head`, [side * 0.38, 3.77, 0], [0.12, 0.12, 0.12]);
      between(`${name} femur`, [side * 0.61, 3.61, 0], [side * 0.53, 2.17, 0], 0.09);
      ellipsoid(`${name} femoral condyles`, [side * 0.53, 2.16, 0], [0.17, 0.12, 0.12]);
      ellipsoid(`${name} patella / anterior`, [side * 0.53, 2.13, 0.17], [0.105, 0.12, 0.065]);
      between(`${name} tibia / medial`, [side * 0.48, 2.05, 0], [side * 0.5, 0.48, 0], 0.077);
      between(`${name} fibula / lateral`, [side * 0.68, 2.01, -0.01], [side * 0.67, 0.48, 0], 0.038);
      ellipsoid(`${name} tarsals / simplified`, [side * 0.54, 0.29, 0.03], [0.15, 0.17, 0.18]);
      for (let toe = 0; toe < 5; toe++) {
        const x = side * (0.4 + toe * 0.065);
        between(`${name} metatarsal and toe ${toe + 1} / simplified`, [x, 0.26, 0.08], [x, 0.16, 0.57 - toe * 0.03], 0.028);
      }
      region = 'ribs';
    }

    system = 'muscles'; group = groups.muscles;
    for (const side of [-1, 1]) {
      const name = side === 1 ? 'Left' : 'Right';
      region = 'chest';
      const pec = ellipsoid(`${name} pectoralis major`, [side * 0.45, 5.66, 0.34], [0.46, 0.28, 0.18]);
      pec.rotation.z = side * 0.17;
      region = 'abdomen';
      for (let row = 0; row < 4; row++) ellipsoid(`${name} rectus abdominis segment ${row + 1}`, [side * 0.15, 5.25 - row * 0.23, 0.32], [0.135, 0.12, 0.1]);
      between(`${name} external oblique`, [side * 0.65, 5.3, 0.2], [side * 0.4, 4.26, 0.21], 0.16, 0.13, true);
      region = 'back';
      between(`${name} trapezius`, [side * 0.14, 6.3, -0.16], [side * 0.71, 5.72, -0.3], 0.23, 0.12, true);
      between(`${name} latissimus dorsi`, [side * 0.67, 5.62, -0.33], [side * 0.3, 4.47, -0.27], 0.29, 0.13, true);
      region = `${name.toLowerCase()}-arm-muscles`;
      ellipsoid(`${name} deltoid`, [side * 0.99, 5.88, 0], [0.29, 0.36, 0.29]);
      between(`${name} biceps / anterior`, [side * 1.1, 5.65, 0.14], [side * 1.32, 4.85, 0.12], 0.19, 0.15, true);
      between(`${name} triceps / posterior`, [side * 1.08, 5.63, -0.16], [side * 1.33, 4.8, -0.11], 0.19, 0.14, true);
      for (const front of [-1, 1]) between(`${name} forearm ${front === 1 ? 'flexor' : 'extensor'} group`, [side * 1.36, 4.73, front * 0.1], [side * 1.56, 3.79, front * 0.06], 0.145, 0.085, true);
      region = `${name.toLowerCase()}-leg-muscles`;
      ellipsoid(`${name} gluteal group / posterior`, [side * 0.4, 3.83, -0.23], [0.33, 0.37, 0.24]);
      between(`${name} quadriceps / anterior`, [side * 0.48, 3.76, 0.17], [side * 0.53, 2.25, 0.15], 0.29, 0.2, true);
      between(`${name} hamstrings / posterior`, [side * 0.47, 3.63, -0.2], [side * 0.53, 2.28, -0.12], 0.25, 0.16, true);
      between(`${name} adductors / medial thigh`, [side * 0.27, 3.66, 0], [side * 0.41, 2.55, 0], 0.16, 0.18, true);
      between(`${name} gastrocnemius / posterior calf`, [side * 0.54, 2.01, -0.16], [side * 0.54, 0.9, -0.1], 0.23, 0.18, true);
      between(`${name} tibialis anterior`, [side * 0.58, 1.98, 0.1], [side * 0.57, 0.53, 0.09], 0.12, 0.09, true);
    }

    system = 'nervous'; group = groups.nervous; region = 'brain';
    for (const side of [-1, 1]) {
      ellipsoid(`${side === 1 ? 'Left' : 'Right'} cerebral hemisphere`, [side * 0.17, 7.3, 0.015], [0.205, 0.33, 0.3]);
      for (let fold = 0; fold < 4; fold++) {
        const y = 7.1 + fold * 0.12;
        tube(`${side === 1 ? 'Left' : 'Right'} schematic cerebral fold ${fold + 1}`, [[side * 0.06, y, 0.23], [side * 0.27, y + 0.04, 0.19], [side * 0.34, y, -0.06]], 0.024, 8);
      }
    }
    ellipsoid('Cerebellum / posterior inferior', [0, 6.99, -0.17], [0.25, 0.14, 0.17]);
    region = 'cord';
    tube('Brainstem and spinal cord / ends at upper lumbar level', [[0, 7.07, -0.1], [0, 6.62, -0.15], [0, 5.65, -0.24], [0, 4.62, -0.2]], 0.062, 24);
    for (const side of [-1, 1]) {
      const name = side === 1 ? 'Left' : 'Right';
      region = 'trunk-nerves';
      for (let branch = 0; branch < 8; branch++) {
        const y = 5.99 - branch * 0.19;
        tube(`${name} representative thoracic nerve ${branch + 1}`, [[0, y, -0.23], [side * 0.3, y - 0.05, -0.26], [side * (0.73 - branch * 0.022), y - 0.15, 0], [side * 0.48, y - 0.23, 0.32]], 0.018, 12);
      }
      region = `${name.toLowerCase()}-arm-nerves`;
      tube(`${name} brachial plexus and main arm pathway`, [[0, 6.27, -0.18], [side * 0.7, 6.01, -0.02], [side * 1.08, 5.68, 0.03], [side * 1.34, 4.73, 0.04], [side * 1.57, 3.62, 0.05]], 0.032, 24);
      tube(`${name} branching forearm pathway`, [[side * 1.23, 5.2, 0.02], [side * 1.45, 4.67, 0.02], [side * 1.68, 3.7, 0.04]], 0.019);
      for (let finger = 0; finger < 4; finger++) tube(`${name} digital nerve ${finger + 2}`, [[side * 1.57, 3.7, 0.05], [side * (1.7 - finger * 0.075), 3.44, 0.05], [side * (1.725 - finger * 0.08), 3.12, 0.06]], 0.012, 8);
      tube(`${name} thumb nerve / lateral`, [[side * 1.57, 3.7, 0.05], [side * 1.73, 3.6, 0.06], [side * 1.85, 3.32, 0.08]], 0.012, 8);
      region = `${name.toLowerCase()}-leg-nerves`;
      for (let root = 0; root < 3; root++) tube(`${name} cauda equina root ${root + 1}`, [[side * 0.018 * root, 4.64, -0.2], [side * (0.08 + root * 0.06), 4.1, -0.17], [side * 0.4, 3.7, -0.08]], 0.013, 12);
      tube(`${name} sciatic and tibial pathway / posterior`, [[side * 0.4, 3.85, -0.1], [side * 0.52, 3.35, -0.16], [side * 0.53, 2.13, -0.1], [side * 0.55, 0.48, -0.03], [side * 0.53, 0.22, 0.48]], 0.033, 24);
      tube(`${name} femoral pathway / anterior`, [[side * 0.19, 4.05, -0.12], [side * 0.46, 3.61, 0.18], [side * 0.49, 2.27, 0.15]], 0.023);
      tube(`${name} common fibular branch / lateral`, [[side * 0.53, 2.32, -0.1], [side * 0.7, 1.98, 0], [side * 0.67, 0.5, 0.07], [side * 0.67, 0.2, 0.45]], 0.019);
    }

    // Reuse the surface geometry as a faint positional guide, never a raycast target.
    const context = new THREE.Group();
    context.name = 'Non-selectable translucent body context';
    const ghost = material('#99afbb', { transparent: true, opacity: 0.075, depthWrite: false, side: THREE.FrontSide });
    groups.body.children.forEach((child: THREE.Object3D) => {
      const source = child as THREE.Mesh;
      if (/finger|thumb|eye|ear|Nose/.test(source.name)) return;
      const part = new THREE.Mesh(source.geometry, ghost);
      part.name = `Context: ${source.name}`;
      part.position.copy(source.position);
      part.quaternion.copy(source.quaternion);
      part.scale.copy(source.scale);
      context.add(part);
    });
    scene.add(context);
    const floor = new THREE.Mesh(geometry(new THREE.CircleGeometry(15, 64), 'Shadow floor'), material('#172536', { roughness: 1 }));
    floor.name = 'Matte shadow floor';
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    let currentSystem: System = 'body';
    let selected: string | null = null;
    let reset: { start: number; position: THREE.Vector3; target: THREE.Vector3 } | null = null;
    let rendering = false;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const point = new THREE.Vector3();
    const offset = new THREE.Vector3();
    const spherical = new THREE.Spherical();
    function requestRender() {
      if (!disposed && !frame && !rendering && inView && !document.hidden) frame = requestAnimationFrame(render);
    }
    function render(now: number) {
      frame = 0;
      if (disposed || !inView || document.hidden) return;
      rendering = true;
      if (reset) {
        const progress = Math.min((now - reset.start) / 480, 1);
        const ease = 1 - (1 - progress) ** 3;
        camera.position.lerpVectors(reset.position, homePosition, ease);
        orbit.target.lerpVectors(reset.target, homeTarget, ease);
        if (progress === 1) reset = null;
      }
      const changed = orbit.update();
      view.render(scene, camera);
      const chosen = REGIONS[currentSystem].find(item => item.id === selected);
      if (chosen) {
        point.set(...chosen.anchor).project(camera);
        const visible = point.z > -1 && point.z < 1 && Math.abs(point.x) < 0.95 && Math.abs(point.y) < 0.94;
        label.hidden = !visible;
        label.textContent = chosen.name;
        label.style.left = `${(point.x * 0.5 + 0.5) * host.clientWidth}px`;
        label.style.top = `${(-point.y * 0.5 + 0.5) * host.clientHeight}px`;
      } else label.hidden = true;
      rendering = false;
      // Damping converges, then RAF stops. There is no permanent animation loop.
      if (changed || reset) requestRender();
    }
    const select = (id: string | null) => {
      selected = id;
      regionMaterials.forEach((surface, key) => {
        const highlighted = key === `${currentSystem}:${id}`;
        surface.emissive.set(highlighted ? '#3b91a8' : key.startsWith('nervous:') ? '#9d7110' : '#000000');
        surface.emissiveIntensity = highlighted ? 0.85 : 0.22;
      });
      requestRender();
    };
    const setSystem = (value: System) => {
      currentSystem = value;
      SYSTEMS.forEach(item => { groups[item].visible = item === value; });
      context.visible = value !== 'body';
      view.shadowMap.needsUpdate = true;
      canvas.setAttribute('aria-label', `Interactive 3D human ${value} model. Anatomical left is viewer-right from the front. Select named regions using the adjacent buttons.`);
      select(null);
    };
    const command = (value: CameraCommand) => {
      reset = null;
      // Flush residual pointer damping before a deterministic button movement.
      orbit.enableDamping = false;
      orbit.update();
      orbit.enableDamping = true;
      if (value === 'reset') {
        if (reducedMotion.matches) { camera.position.copy(homePosition); orbit.target.copy(homeTarget); }
        else reset = { start: performance.now(), position: camera.position.clone(), target: orbit.target.clone() };
      } else if (value.startsWith('pan-')) {
        const direction = new THREE.Vector3();
        direction.setFromMatrixColumn(camera.matrix, value === 'pan-up' || value === 'pan-down' ? 1 : 0);
        direction.multiplyScalar(value === 'pan-left' || value === 'pan-down' ? -0.25 : 0.25);
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
      if (!clicked) return;
      const rect = canvas.getBoundingClientRect();
      pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(groups[currentSystem].children, false)[0];
      if (hit?.object.userData.region) onSelect(currentSystem, hit.object.userData.region as string);
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
      onFailure('The WebGL graphics context was lost. Reload this visualization to try again. A WebGL 2 capable browser with graphics acceleration is required.');
      dispose();
    };
    const visibilityChange = () => {
      if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
      else requestRender();
    };
    const controlStart = () => { reset = null; requestRender(); };
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
      // Keep the full figure framed on narrow screens as well as desktop.
      homePosition.z = Math.min(23, Math.max(14.6, 6.3 / camera.aspect));
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
    setSystem('body');
    return { setSystem, select, command, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}
