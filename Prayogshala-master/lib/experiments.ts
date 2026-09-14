import type { MessageKey } from './translations';

export const SUBJECTS = ['physics', 'chemistry', 'biology'] as const;
export type Subject = typeof SUBJECTS[number];

interface ExperimentMetadata {
  id: string;
  subject: Subject;
  icon: 'flask' | 'zap' | 'pendulum' | 'filter' | 'microscope' | 'droplets' | 'heart' | 'spring' | 'prism' | 'electrolysis' | 'leaf';
  nameKey: MessageKey;
  descKey: MessageKey;
  gradeKey: MessageKey;
  hintKey: MessageKey;
  duration: number;
  difficulty: 'beginner' | 'intermediate';
  panelLanguage: 'bilingual' | 'en';
  gradient: string;
  subjectBg: string;
}

// Plain metadata only: safe to import in routes, the store, and client discovery UI.
export const EXPERIMENTS = [
  {
    id: 'titration-acid-base', subject: 'chemistry', icon: 'flask',
    nameKey: 'exp.titration.name', descKey: 'exp.titration.desc', gradeKey: 'exp.titration.grade', hintKey: 'exp.titration.hint',
    duration: 30, difficulty: 'intermediate', panelLanguage: 'bilingual',
    gradient: 'from-blue-500 to-blue-700', subjectBg: 'bg-blue-50 text-blue-700',
  },
  {
    id: 'ohms-law', subject: 'physics', icon: 'zap',
    nameKey: 'exp.ohmslaw.name', descKey: 'exp.ohmslaw.desc', gradeKey: 'exp.ohmslaw.grade', hintKey: 'exp.ohmslaw.hint',
    duration: 25, difficulty: 'beginner', panelLanguage: 'bilingual',
    gradient: 'from-amber-400 to-amber-600', subjectBg: 'bg-amber-50 text-amber-700',
  },
  {
    id: 'simple-pendulum', subject: 'physics', icon: 'pendulum',
    nameKey: 'exp.pendulum.name', descKey: 'exp.pendulum.desc', gradeKey: 'exp.pendulum.grade', hintKey: 'exp.pendulum.hint',
    duration: 20, difficulty: 'beginner', panelLanguage: 'en',
    gradient: 'from-violet-500 to-indigo-700', subjectBg: 'bg-amber-50 text-amber-700',
  },
  {
    id: 'filtration', subject: 'chemistry', icon: 'filter',
    nameKey: 'exp.filtration.name', descKey: 'exp.filtration.desc', gradeKey: 'exp.filtration.grade', hintKey: 'exp.filtration.hint',
    duration: 15, difficulty: 'beginner', panelLanguage: 'en',
    gradient: 'from-cyan-500 to-blue-700', subjectBg: 'bg-blue-50 text-blue-700',
  },
  {
    id: 'microscope-cells', subject: 'biology', icon: 'microscope',
    nameKey: 'exp.microscope.name', descKey: 'exp.microscope.desc', gradeKey: 'exp.microscope.grade', hintKey: 'exp.microscope.hint',
    duration: 20, difficulty: 'beginner', panelLanguage: 'en',
    gradient: 'from-emerald-500 to-teal-700', subjectBg: 'bg-green-50 text-green-700',
  },
  {
    id: 'osmosis', subject: 'biology', icon: 'droplets',
    nameKey: 'exp.osmosis.name', descKey: 'exp.osmosis.desc', gradeKey: 'exp.osmosis.grade', hintKey: 'exp.osmosis.hint',
    duration: 20, difficulty: 'intermediate', panelLanguage: 'en',
    gradient: 'from-teal-500 to-cyan-700', subjectBg: 'bg-green-50 text-green-700',
  },
  {
    id: 'frog-anatomy', subject: 'biology', icon: 'heart',
    nameKey: 'exp.frog.name', descKey: 'exp.frog.desc', gradeKey: 'exp.frog.grade', hintKey: 'exp.frog.hint',
    duration: 35, difficulty: 'intermediate', panelLanguage: 'bilingual',
    gradient: 'from-green-500 to-green-700', subjectBg: 'bg-green-50 text-green-700',
  },
  {
    id: 'hookes-law', subject: 'physics', icon: 'spring',
    nameKey: 'exp.hooke.name', descKey: 'exp.hooke.desc', gradeKey: 'exp.hooke.grade', hintKey: 'exp.hooke.hint',
    duration: 20, difficulty: 'beginner', panelLanguage: 'en',
    gradient: 'from-amber-400 to-amber-600', subjectBg: 'bg-amber-50 text-amber-700',
  },
  {
    id: 'refraction', subject: 'physics', icon: 'prism',
    nameKey: 'exp.refraction.name', descKey: 'exp.refraction.desc', gradeKey: 'exp.refraction.grade', hintKey: 'exp.refraction.hint',
    duration: 25, difficulty: 'intermediate', panelLanguage: 'en',
    gradient: 'from-amber-400 to-amber-600', subjectBg: 'bg-amber-50 text-amber-700',
  },
  {
    id: 'electrolysis', subject: 'chemistry', icon: 'electrolysis',
    nameKey: 'exp.electrolysis.name', descKey: 'exp.electrolysis.desc', gradeKey: 'exp.electrolysis.grade', hintKey: 'exp.electrolysis.hint',
    duration: 20, difficulty: 'beginner', panelLanguage: 'en',
    gradient: 'from-blue-500 to-blue-700', subjectBg: 'bg-blue-50 text-blue-700',
  },
  {
    id: 'photosynthesis', subject: 'biology', icon: 'leaf',
    nameKey: 'exp.photosynthesis.name', descKey: 'exp.photosynthesis.desc', gradeKey: 'exp.photosynthesis.grade', hintKey: 'exp.photosynthesis.hint',
    duration: 25, difficulty: 'intermediate', panelLanguage: 'en',
    gradient: 'from-green-500 to-green-700', subjectBg: 'bg-green-50 text-green-700',
  },
  {
    id: 'human-body', subject: 'biology', icon: 'heart',
    nameKey: 'exp.humanBody.name', descKey: 'exp.humanBody.desc', gradeKey: 'exp.humanBody.grade', hintKey: 'exp.humanBody.hint',
    duration: 30, difficulty: 'intermediate', panelLanguage: 'en',
    gradient: 'from-red-500 to-red-700', subjectBg: 'bg-green-50 text-green-700',
  },
] as const satisfies readonly ExperimentMetadata[];

export type Experiment = typeof EXPERIMENTS[number];
export type ExperimentId = Experiment['id'];

export function getExperiment(id: string) {
  return EXPERIMENTS.find(experiment => experiment.id === id);
}
