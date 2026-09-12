import type { ExperimentId } from './experiments';

export interface ExperimentFact {
  question: string;
  answer: string;
  equation?: string;
  readouts: { label: string; value: string }[];
  steps: string[];
}

/** Expected results for each lab. Used by the landing preview and the "Demo answer" panel. */
export const EXPERIMENT_FACTS: Record<ExperimentId, ExperimentFact> = {
  'titration-acid-base': {
    question: 'What is the concentration of the HCl sample?',
    answer: '0.1000 mol/L. Equivalence at 25.00 mL NaOH, pH 7.00; phenolphthalein turns persistent pink just past it.',
    equation: 'M1 V1 = M2 V2',
    readouts: [{ label: 'NaOH at endpoint', value: '25.00 mL' }, { label: 'pH at endpoint', value: '7.02' }, { label: '[HCl]', value: '0.1000 mol/L' }],
    steps: ['Mount burette', 'Fill to zero', 'Pipette 25 mL HCl', 'Add indicator', 'Titrate to pink'],
  },
  'ohms-law': {
    question: 'How does current change with voltage across a fixed resistor?',
    answer: 'Current is directly proportional to voltage. The V-I graph is a straight line through the origin whose slope is the resistance.',
    equation: 'V = I R',
    readouts: [{ label: 'Resistor', value: '10 ohm' }, { label: 'At 6 V', value: '0.60 A' }, { label: 'Slope', value: '10.0 ohm' }],
    steps: ['Build circuit', 'Set supply', 'Read V and I', 'Repeat 5 times', 'Plot V vs I'],
  },
  'simple-pendulum': {
    question: 'How does string length affect the period?',
    answer: 'Period grows with the square root of length. Doubling L multiplies T by 1.41. Using T and L gives g close to 9.81 m/s^2.',
    equation: 'T = 2 pi sqrt(L / g)',
    readouts: [{ label: 'L = 1.00 m', value: 'T = 2.006 s' }, { label: 'L = 0.50 m', value: 'T = 1.419 s' }, { label: 'g (calc)', value: '9.81 m/s^2' }],
    steps: ['Set length', 'Release bob', 'Time 5 swings', 'Repeat new length', 'Calculate g'],
  },
  filtration: {
    question: 'Can filter paper separate mud from water?',
    answer: 'Yes. Insoluble mud stays on the paper as residue; clear water passes through as filtrate. Dissolved salts are not removed.',
    readouts: [{ label: 'Filtrate', value: 'Clear' }, { label: 'Residue', value: 'Mud on paper' }, { label: 'Dissolved solids', value: 'Not removed' }],
    steps: ['Fold paper', 'Seat funnel', 'Pour slowly', 'Collect filtrate'],
  },
  'microscope-cells': {
    question: 'How do plant, animal and blood cells differ?',
    answer: 'Plant cells have a rigid wall and large vacuole; animal cheek cells are irregular with a central nucleus; red blood cells lack a nucleus.',
    readouts: [{ label: 'Onion cell', value: 'Wall + vacuole' }, { label: 'Cheek cell', value: 'Nucleus, no wall' }, { label: 'RBC', value: 'No nucleus' }],
    steps: ['Load slide', 'Focus 10x', 'Focus 40x', 'Record two specimens'],
  },
  osmosis: {
    question: 'What happens to potato mass in salt solutions?',
    answer: 'In pure water the potato gains mass (water enters). In concentrated salt it loses mass (water leaves). Water moves toward higher solute concentration.',
    readouts: [{ label: 'Distilled water', value: '+8.2 %' }, { label: '0.5 M NaCl', value: '-6.4 %' }, { label: 'Direction', value: 'Toward solute' }],
    steps: ['Cut samples', 'Weigh', 'Immerse 20 min', 'Re-weigh', 'Compare'],
  },
  'frog-anatomy': {
    question: 'Which organs make up the frog body systems?',
    answer: 'Three-chambered heart, two lungs, liver with three lobes, stomach leading to small intestine, kidneys and a large fat body.',
    readouts: [{ label: 'Heart', value: '3 chambers' }, { label: 'Liver lobes', value: '3' }, { label: 'Systems', value: '5 explored' }],
    steps: ['Open layers', 'Identify organs', 'Answer quiz'],
  },
  'hookes-law': {
    question: 'Is spring extension proportional to load?',
    answer: 'Yes, up to the elastic limit. Extension increases in equal steps for equal added masses; the F-x graph is a straight line with slope k.',
    equation: 'F = k x',
    readouts: [{ label: '100 g load', value: '2.0 cm' }, { label: '300 g load', value: '6.0 cm' }, { label: 'k', value: '49 N/m' }],
    steps: ['Hang spring', 'Zero the scale', 'Add masses', 'Read extension', 'Plot F vs x'],
  },
  refraction: {
    question: 'How does light bend entering a glass block?',
    answer: 'It bends toward the normal. sin(i) / sin(r) stays constant: the refractive index of glass, about 1.50.',
    equation: 'n = sin i / sin r',
    readouts: [{ label: 'i = 45 deg', value: 'r = 28.1 deg' }, { label: 'i = 60 deg', value: 'r = 35.3 deg' }, { label: 'n (glass)', value: '1.50' }],
    steps: ['Aim ray box', 'Mark ray', 'Measure i and r', 'Repeat angles', 'Compute n'],
  },
  electrolysis: {
    question: 'What gases form when water is electrolysed, and in what ratio?',
    answer: 'Hydrogen at the cathode (negative) and oxygen at the anode (positive), in a 2 : 1 volume ratio. Pure water needs a little acid to conduct.',
    equation: '2 H2O -> 2 H2 + O2',
    readouts: [{ label: 'Cathode gas', value: 'H2, 20 mL' }, { label: 'Anode gas', value: 'O2, 10 mL' }, { label: 'Ratio', value: '2 : 1' }],
    steps: ['Fill tubes', 'Add dilute acid', 'Connect 6 V', 'Collect gas', 'Compare volumes'],
  },
  photosynthesis: {
    question: 'How does light intensity affect photosynthesis rate?',
    answer: 'Bubble rate rises as the lamp moves closer, then levels off when another factor (CO2 or temperature) limits the rate.',
    equation: 'rate ~ 1 / d^2',
    readouts: [{ label: '10 cm', value: '38 bubbles/min' }, { label: '30 cm', value: '9 bubbles/min' }, { label: 'Limiting', value: 'CO2 at high light' }],
    steps: ['Set lamp distance', 'Add NaHCO3', 'Count bubbles 1 min', 'Repeat distances', 'Plot rate vs distance'],
  },
};
