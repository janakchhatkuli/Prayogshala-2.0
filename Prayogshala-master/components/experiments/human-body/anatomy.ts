export const SYSTEMS = ['body', 'skeleton', 'muscles', 'nervous'] as const;
export type System = (typeof SYSTEMS)[number];
export type Point = [number, number, number];
export interface Region {
  id: string;
  name: string;
  fact: string;
  anchor: Point;
}

export const SYSTEM_INFO: Record<System, { label: string; color: string; summary: string }> = {
  body: { label: 'Body', color: '#c9a487', summary: 'Explore the head, trunk and paired limbs. This surface model shows proportions, not internal organs.' },
  skeleton: { label: 'Skeleton', color: '#eee1bd', summary: 'Bones support the body, protect organs and provide attachment points for muscles.' },
  muscles: { label: 'Muscles', color: '#e18179', summary: 'Skeletal muscles pull on bones. Opposing groups help move joints in different directions.' },
  nervous: { label: 'Nervous', color: '#f5d45e', summary: 'The brain and spinal cord form the central nervous system. Peripheral nerves connect them to the body.' },
};

const paired = (id: string, name: string, fact: string, anchor: Point): Region[] =>
  [1, -1].map(side => ({
    id: `${side === 1 ? 'left' : 'right'}-${id}`,
    name: `${side === 1 ? 'Left' : 'Right'} ${name}`,
    fact,
    anchor: [anchor[0] * side, anchor[1], anchor[2]],
  }));

export const REGIONS: Record<System, Region[]> = {
  body: [
    { id: 'head', name: 'Head & neck', fact: 'The skull protects the brain. The neck supports the head and links it to the trunk.', anchor: [0, 7.15, 0.4] },
    { id: 'trunk', name: 'Trunk', fact: 'The chest and abdomen contain many organs. The pelvis connects the trunk to the lower limbs.', anchor: [0, 5.15, 0.45] },
    ...paired('arm', 'arm & hand', 'The shoulder, elbow and wrist allow the upper limb to position the hand for reaching and grasping.', [1.35, 4.8, 0.16]),
    ...paired('leg', 'leg & foot', 'The hip, knee and ankle work together to support weight, balance and walking.', [0.53, 2.2, 0.2]),
  ],
  skeleton: [
    { id: 'skull', name: 'Skull & mandible', fact: 'The cranium encloses the brain. The mandible is the movable lower jaw. Facial openings are simplified here.', anchor: [0, 7.1, 0.42] },
    { id: 'ribs', name: 'Ribs & sternum', fact: 'Most people have 12 pairs of ribs. The upper ribs connect to the sternum through cartilage; the last two pairs are floating ribs.', anchor: [0.7, 5.45, 0.45] },
    { id: 'spine', name: 'Vertebral column', fact: 'The vertebral column supports the trunk and surrounds the spinal cord. Its curves and vertebrae are schematic here.', anchor: [0, 4.7, -0.24] },
    { id: 'pelvis', name: 'Pelvis', fact: 'The two hip bones and sacrum form a ring that transfers body weight to the legs.', anchor: [0.45, 3.8, 0.15] },
    ...paired('arm-bones', 'upper-limb bones', 'Each upper arm has one humerus. The forearm has a radius on the thumb side and an ulna on the little-finger side.', [1.36, 4.7, 0.08]),
    ...paired('leg-bones', 'lower-limb bones', 'Each thigh has one femur. The tibia is the larger, medial shin bone; the fibula lies laterally. The patella sits in front of the knee.', [0.54, 2.1, 0.12]),
  ],
  muscles: [
    { id: 'chest', name: 'Pectorals', fact: 'The pectoralis major muscles help bring the arms forward and across the chest.', anchor: [0.5, 5.65, 0.5] },
    { id: 'abdomen', name: 'Abdominals & obliques', fact: 'These trunk muscles help bend and rotate the torso and support the abdominal wall.', anchor: [0, 4.8, 0.37] },
    { id: 'back', name: 'Back muscles', fact: 'The trapezius and latissimus dorsi help position the shoulder girdle and move the arms. Orbit behind the model to see them.', anchor: [0.5, 5.4, -0.43] },
    ...paired('arm-muscles', 'shoulder & arm muscles', 'The deltoid covers the shoulder. Biceps are anterior and triceps posterior; they act in opposing directions at the elbow.', [1.19, 5.25, 0.19]),
    ...paired('leg-muscles', 'hip & leg muscles', 'Quadriceps lie at the front of the thigh, hamstrings behind it, and calf muscles behind the lower leg.', [0.55, 2.9, 0.26]),
  ],
  nervous: [
    { id: 'brain', name: 'Brain', fact: 'The brain integrates sensory information and coordinates responses. The two cerebral hemispheres and cerebellum are simplified.', anchor: [0, 7.3, 0.15] },
    { id: 'cord', name: 'Spinal cord', fact: 'The spinal cord carries signals between brain and body. It ends in the upper lumbar region; nerve roots continue below it.', anchor: [0, 5.15, -0.2] },
    { id: 'trunk-nerves', name: 'Trunk nerves', fact: 'Paired spinal nerves branch from the central pathway to serve the trunk. Only representative branches are shown.', anchor: [0.64, 5.25, 0.2] },
    ...paired('arm-nerves', 'arm nerves', 'Networks of peripheral nerves carry sensory and motor signals between the spinal cord and each arm and hand.', [1.34, 4.75, 0.06]),
    ...paired('leg-nerves', 'leg nerves', 'Nerve roots continue below the spinal cord and form networks supplying the legs. These paths represent major routes, not every nerve.', [0.5, 2.45, 0.06]),
  ],
};
