export const ANATOMY_LAYERS = [
  { id: 'skin', label: 'Skin', color: '#d4a574', icon: '👤', order: 1 },
  { id: 'muscles', label: 'Muscles', color: '#c0392b', icon: '💪', order: 2 },
  { id: 'skeleton', label: 'Skeleton', color: '#ecf0f1', icon: '🦴', order: 3 },
  { id: 'organs', label: 'Organs', color: '#e74c3c', icon: '🫀', order: 4 },
  { id: 'nervous', label: 'Nervous', color: '#f39c12', icon: '🧠', order: 5 },
  { id: 'respiratory', label: 'Respiratory', color: '#3498db', icon: '🫁', order: 6 },
  { id: 'digestive', label: 'Digestive', color: '#e67e22', icon: '🍽️', order: 7 },
  { id: 'circulatory', label: 'Circulatory', color: '#e74c3c', icon: '🩸', order: 8 },
] as const;

export type AnatomyLayerId = (typeof ANATOMY_LAYERS)[number]['id'];

export const ANATOMY_SYSTEMS = [
  { id: 'skeletal', label: 'Skeletal', layerId: 'skeleton', color: '#ecf0f1' },
  { id: 'muscular', label: 'Muscular', layerId: 'muscles', color: '#c0392b' },
  { id: 'nervous', label: 'Nervous', layerId: 'nervous', color: '#f39c12' },
  { id: 'respiratory', label: 'Respiratory', layerId: 'respiratory', color: '#3498db' },
  { id: 'digestive', label: 'Digestive', layerId: 'digestive', color: '#e67e22' },
  { id: 'circulatory', label: 'Circulatory', layerId: 'circulatory', color: '#e74c3c' },
  { id: 'urinary', label: 'Urinary', layerId: 'organs', color: '#9b59b6' },
  { id: 'endocrine', label: 'Endocrine', layerId: 'organs', color: '#1abc9c' },
  { id: 'lymphatic', label: 'Lymphatic', layerId: 'organs', color: '#34495e' },
  { id: 'reproductive', label: 'Reproductive', layerId: 'organs', color: '#e91e63' },
  { id: 'integumentary', label: 'Integumentary', layerId: 'skin', color: '#d4a574' },
] as const;

export type AnatomySystemId = (typeof ANATOMY_SYSTEMS)[number]['id'];

export interface StructureInfo {
  id: string;
  name: string;
  system: AnatomySystemId;
  layer: AnatomyLayerId;
  description: string;
  function: string;
  location: string;
  wikiUrl?: string;
}

export const STRUCTURE_DATABASE: Record<string, StructureInfo> = {
  // Skeleton - major bones
  skull: { id: 'skull', name: 'Skull', system: 'skeletal', layer: 'skeleton', description: 'The bony structure that forms the head and protects the brain.', function: 'Protects the brain and supports facial structures.', location: 'Head' },
  mandible: { id: 'mandible', name: 'Mandible', system: 'skeletal', layer: 'skeleton', description: 'The lower jawbone, the only movable bone of the skull.', function: 'Supports lower teeth and enables chewing.', location: 'Lower jaw' },
  clavicle: { id: 'clavicle', name: 'Clavicle', system: 'skeletal', layer: 'skeleton', description: 'The collarbone connecting the sternum to the scapula.', function: 'Strut that keeps the shoulder in position.', location: 'Upper chest' },
  scapula: { id: 'scapula', name: 'Scapula', system: 'skeletal', layer: 'skeleton', description: 'The shoulder blade, a flat triangular bone.', function: 'Provides attachment for shoulder muscles.', location: 'Upper back' },
  sternum: { id: 'sternum', name: 'Sternum', system: 'skeletal', layer: 'skeleton', description: 'The breastbone, a flat bone in the center of the chest.', function: 'Protects heart and lungs; attaches ribs.', location: 'Center of chest' },
  ribs: { id: 'ribs', name: 'Ribs', system: 'skeletal', layer: 'skeleton', description: 'Curved bones forming the thoracic cage.', function: 'Protect thoracic organs; assist breathing.', location: 'Chest' },
  vertebrae: { id: 'vertebrae', name: 'Vertebrae', system: 'skeletal', layer: 'skeleton', description: 'The 33 bones forming the spinal column.', function: 'Protect spinal cord; support body weight.', location: 'Spine' },
  humerus: { id: 'humerus', name: 'Humerus', system: 'skeletal', layer: 'skeleton', description: 'The upper arm bone.', function: 'Connects shoulder to elbow.', location: 'Upper arm' },
  radius: { id: 'radius', name: 'Radius', system: 'skeletal', layer: 'skeleton', description: 'The lateral forearm bone (thumb side).', function: 'Allows forearm rotation.', location: 'Forearm' },
  ulna: { id: 'ulna', name: 'Ulna', system: 'skeletal', layer: 'skeleton', description: 'The medial forearm bone (pinky side).', function: 'Forms elbow joint with humerus.', location: 'Forearm' },
  pelvis: { id: 'pelvis', name: 'Pelvis', system: 'skeletal', layer: 'skeleton', description: 'The hip bone structure.', function: 'Transfers weight to legs; protects organs.', location: 'Hip' },
  femur: { id: 'femur', name: 'Femur', system: 'skeletal', layer: 'skeleton', description: 'The thigh bone, longest and strongest bone.', function: 'Supports body weight; enables walking.', location: 'Thigh' },
  patella: { id: 'patella', name: 'Patella', system: 'skeletal', layer: 'skeleton', description: 'The kneecap, a sesamoid bone.', function: 'Protects knee joint; improves leverage.', location: 'Knee' },
  tibia: { id: 'tibia', name: 'Tibia', system: 'skeletal', layer: 'skeleton', description: 'The larger, medial shin bone.', function: 'Main weight-bearing bone of lower leg.', location: 'Lower leg' },
  fibula: { id: 'fibula', name: 'Fibula', system: 'skeletal', layer: 'skeleton', description: 'The lateral, thinner lower leg bone.', function: 'Muscle attachment; ankle stability.', location: 'Lower leg' },

  // Muscles
  'pectoralis-major': { id: 'pectoralis-major', name: 'Pectoralis Major', system: 'muscular', layer: 'muscles', description: 'Large fan-shaped chest muscle.', function: 'Adducts and medially rotates arm.', location: 'Chest' },
  'biceps-brachii': { id: 'biceps-brachii', name: 'Biceps Brachii', system: 'muscular', layer: 'muscles', description: 'Two-headed muscle on anterior upper arm.', function: 'Flexes elbow; supinates forearm.', location: 'Upper arm' },
  'triceps-brachii': { id: 'triceps-brachii', name: 'Triceps Brachii', system: 'muscular', layer: 'muscles', description: 'Three-headed muscle on posterior upper arm.', function: 'Extends elbow.', location: 'Upper arm' },
  deltoid: { id: 'deltoid', name: 'Deltoid', system: 'muscular', layer: 'muscles', description: 'Triangular shoulder muscle.', function: 'Abducts arm at shoulder.', location: 'Shoulder' },
  'rectus-abdominis': { id: 'rectus-abdominis', name: 'Rectus Abdominis', system: 'muscular', layer: 'muscles', description: 'Paired vertical abdominal muscle.', function: 'Flexes trunk; compresses abdomen.', location: 'Abdomen' },
  'latissimus-dorsi': { id: 'latissimus-dorsi', name: 'Latissimus Dorsi', system: 'muscular', layer: 'muscles', description: 'Broad, flat back muscle.', function: 'Adducts, extends, medially rotates arm.', location: 'Back' },
  'gluteus-maximus': { id: 'gluteus-maximus', name: 'Gluteus Maximus', system: 'muscular', layer: 'muscles', description: 'Largest buttock muscle.', function: 'Extends and laterally rotates hip.', location: 'Buttock' },
  quadriceps: { id: 'quadriceps', name: 'Quadriceps', system: 'muscular', layer: 'muscles', description: 'Four-headed anterior thigh muscle.', function: 'Extends knee; flexes hip.', location: 'Thigh' },
  hamstrings: { id: 'hamstrings', name: 'Hamstrings', system: 'muscular', layer: 'muscles', description: 'Posterior thigh muscle group.', function: 'Flexes knee; extends hip.', location: 'Thigh' },
  gastrocnemius: { id: 'gastrocnemius', name: 'Gastrocnemius', system: 'muscular', layer: 'muscles', description: 'Superficial calf muscle.', function: 'Plantarflexes ankle; flexes knee.', location: 'Calf' },

  // Organs
  heart: { id: 'heart', name: 'Heart', system: 'circulatory', layer: 'organs', description: 'Muscular pump that circulates blood.', function: 'Pumps deoxygenated blood to lungs and oxygenated blood to body.', location: 'Mediastinum' },
  lungs: { id: 'lungs', name: 'Lungs', system: 'respiratory', layer: 'organs', description: 'Paired organs for gas exchange.', function: 'Oxygenate blood; remove carbon dioxide.', location: 'Thoracic cavity' },
  liver: { id: 'liver', name: 'Liver', system: 'digestive', layer: 'organs', description: 'Largest internal organ; metabolic factory.', function: 'Detoxification; protein synthesis; bile production.', location: 'Right upper abdomen' },
  stomach: { id: 'stomach', name: 'Stomach', system: 'digestive', layer: 'organs', description: 'J-shaped digestive organ.', function: 'Chemical and mechanical digestion.', location: 'Left upper abdomen' },
  kidneys: { id: 'kidneys', name: 'Kidneys', system: 'urinary', layer: 'organs', description: 'Paired bean-shaped filtration organs.', function: 'Filter blood; produce urine; regulate electrolytes.', location: 'Retroperitoneal' },
  brain: { id: 'brain', name: 'Brain', system: 'nervous', layer: 'nervous', description: 'Central organ of the nervous system.', function: 'Controls body; processes information.', location: 'Cranial cavity' },
  'spinal-cord': { id: 'spinal-cord', name: 'Spinal Cord', system: 'nervous', layer: 'nervous', description: 'Cylindrical neural tissue in vertebral canal.', function: 'Relays signals between brain and body.', location: 'Vertebral canal' },
  pancreas: { id: 'pancreas', name: 'Pancreas', system: 'digestive', layer: 'organs', description: 'Glandular organ behind stomach.', function: 'Endocrine (insulin) and exocrine (digestive enzymes).', location: 'Upper abdomen' },
  intestines: { id: 'intestines', name: 'Intestines', system: 'digestive', layer: 'organs', description: 'Long tube for nutrient absorption.', function: 'Absorb nutrients and water.', location: 'Abdomen' },
  spleen: { id: 'spleen', name: 'Spleen', system: 'lymphatic', layer: 'organs', description: 'Largest lymphoid organ.', function: 'Filters blood; immune response.', location: 'Left upper abdomen' },
  trachea: { id: 'trachea', name: 'Trachea', system: 'respiratory', layer: 'respiratory', description: 'Windpipe connecting larynx to bronchi.', function: 'Air passage to lungs.', location: 'Neck/upper chest' },
  bronchi: { id: 'bronchi', name: 'Bronchi', system: 'respiratory', layer: 'respiratory', description: 'Main airways branching from trachea.', function: 'Conduct air to lungs.', location: 'Lungs' },
  diaphragm: { id: 'diaphragm', name: 'Diaphragm', system: 'respiratory', layer: 'muscles', description: 'Dome-shaped muscle separating thorax and abdomen.', function: 'Primary muscle of inspiration.', location: 'Base of thorax' },
  esophagus: { id: 'esophagus', name: 'Esophagus', system: 'digestive', layer: 'digestive', description: 'Muscular tube connecting pharynx to stomach.', function: 'Transports food to stomach.', location: 'Thorax/abdomen' },
  'small-intestine': { id: 'small-intestine', name: 'Small Intestine', system: 'digestive', layer: 'digestive', description: 'Long coiled tube for nutrient absorption.', function: 'Primary site of nutrient absorption.', location: 'Abdomen' },
  'large-intestine': { id: 'large-intestine', name: 'Large Intestine', system: 'digestive', layer: 'digestive', description: 'Wider tube for water absorption and waste formation.', function: 'Absorb water; form feces.', location: 'Abdomen' },

  // Vascular
  aorta: { id: 'aorta', name: 'Aorta', system: 'circulatory', layer: 'circulatory', description: 'Largest artery in the body.', function: 'Distributes oxygenated blood from heart.', location: 'Thorax/abdomen' },
  'superior-vena-cava': { id: 'superior-vena-cava', name: 'Superior Vena Cava', system: 'circulatory', layer: 'circulatory', description: 'Large vein returning blood from upper body.', function: 'Returns deoxygenated blood to heart.', location: 'Mediastinum' },
  'inferior-vena-cava': { id: 'inferior-vena-cava', name: 'Inferior Vena Cava', system: 'circulatory', layer: 'circulatory', description: 'Large vein returning blood from lower body.', function: 'Returns deoxygenated blood to heart.', location: 'Abdomen/thorax' },
  'pulmonary-artery': { id: 'pulmonary-artery', name: 'Pulmonary Artery', system: 'circulatory', layer: 'circulatory', description: 'Artery carrying deoxygenated blood to lungs.', function: 'Carries blood to lungs for oxygenation.', location: 'Mediastinum' },
  'pulmonary-veins': { id: 'pulmonary-veins', name: 'Pulmonary Veins', system: 'circulatory', layer: 'circulatory', description: 'Veins carrying oxygenated blood from lungs.', function: 'Return oxygenated blood to heart.', location: 'Lungs/heart' },

  // Nervous system
  cerebrum: { id: 'cerebrum', name: 'Cerebrum', system: 'nervous', layer: 'nervous', description: 'Largest part of the brain.', function: 'Higher cognitive functions.', location: 'Brain' },
  cerebellum: { id: 'cerebellum', name: 'Cerebellum', system: 'nervous', layer: 'nervous', description: 'Posterior brain structure.', function: 'Coordination and balance.', location: 'Posterior brain' },
  brainstem: { id: 'brainstem', name: 'Brainstem', system: 'nervous', layer: 'nervous', description: 'Connects brain to spinal cord.', function: 'Vital autonomic functions.', location: 'Base of brain' },
  'sciatic-nerve': { id: 'sciatic-nerve', name: 'Sciatic Nerve', system: 'nervous', layer: 'nervous', description: 'Largest nerve in the body.', function: 'Innervates lower limb.', location: 'Lower limb' },
  'brachial-plexus': { id: 'brachial-plexus', name: 'Brachial Plexus', system: 'nervous', layer: 'nervous', description: 'Network of nerves for upper limb.', function: 'Innervates upper limb.', location: 'Neck/shoulder' },
};

export function getStructureInfo(id: string): StructureInfo | undefined {
  return STRUCTURE_DATABASE[id];
}

export function searchStructures(query: string): StructureInfo[] {
  const lower = query.toLowerCase();
  return Object.values(STRUCTURE_DATABASE).filter(s =>
    s.name.toLowerCase().includes(lower) ||
    s.id.toLowerCase().includes(lower) ||
    s.system.toLowerCase().includes(lower) ||
    s.layer.toLowerCase().includes(lower)
  );
}

export function getStructuresByLayer(layer: AnatomyLayerId): StructureInfo[] {
  return Object.values(STRUCTURE_DATABASE).filter(s => s.layer === layer);
}

export function getStructuresBySystem(system: AnatomySystemId): StructureInfo[] {
  return Object.values(STRUCTURE_DATABASE).filter(s => s.system === system);
}