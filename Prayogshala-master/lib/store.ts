import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SUBJECTS, getExperiment } from './experiments';

export type Locale = 'en' | 'ne';

export interface UserProfile {
  name: string;
  grade: number;
}

export interface ExperimentResult {
  experimentId: string;
  completedAt: string;
  score: number;
  endpointAccuracy?: number;
}

interface PrayogShalaStore {
  locale: Locale;
  setLocale: (locale: Locale) => void;

  currentUser: UserProfile;
  setUser: (user: UserProfile) => void;

  completedExperiments: ExperimentResult[];
  streak: number;
  lastCompletedDate: string | null;
  badges: string[];

  completeExperiment: (experimentId: string, score?: number, endpointAccuracy?: number) => void;
  isCompleted: (experimentId: string) => boolean;
  getResult: (experimentId: string) => ExperimentResult | undefined;
}

export const useStore = create<PrayogShalaStore>()(
  persist(
    (set, get) => ({
      locale: 'ne',
      setLocale: (locale) => set({ locale }),

      currentUser: { name: '', grade: 10 },
      setUser: (user) => set({ currentUser: user }),

      completedExperiments: [],
      streak: 0,
      lastCompletedDate: null,
      badges: [],

      completeExperiment: (experimentId, score = 100, endpointAccuracy) => {
        const state = get();
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();

        let newStreak = state.streak;
        if (state.lastCompletedDate === yesterday) {
          newStreak = state.streak + 1;
        } else if (state.lastCompletedDate !== today) {
          newStreak = 1;
        }

        const alreadyDone = state.completedExperiments.find(
          (r) => r.experimentId === experimentId
        );
        const newResult: ExperimentResult = {
          experimentId,
          completedAt: new Date().toISOString(),
          score,
          endpointAccuracy,
        };
        const newCompleted = alreadyDone
          ? state.completedExperiments.map((r) =>
              r.experimentId === experimentId ? newResult : r
            )
          : [...state.completedExperiments, newResult];

        const newBadges = [...state.badges];
        if (experimentId === 'titration-acid-base' && !newBadges.includes('first-titration')) {
          newBadges.push('first-titration');
        }
        if (
          endpointAccuracy !== undefined &&
          endpointAccuracy >= 0.9 &&
          !alreadyDone &&
          !newBadges.includes('steady-hands')
        ) {
          newBadges.push('steady-hands');
        }
        const completedSubjects = new Set(newCompleted.map((r) => getExperiment(r.experimentId)?.subject));
        if (
          SUBJECTS.every((subject) => completedSubjects.has(subject)) &&
          !newBadges.includes('triple-scientist')
        ) {
          newBadges.push('triple-scientist');
        }

        set({
          completedExperiments: newCompleted,
          streak: newStreak,
          lastCompletedDate: today,
          badges: newBadges,
        });
      },

      isCompleted: (experimentId) =>
        get().completedExperiments.some((r) => r.experimentId === experimentId),

      getResult: (experimentId) =>
        get().completedExperiments.find((r) => r.experimentId === experimentId),
    }),
    { name: 'prayogshala-storage' }
  )
);
