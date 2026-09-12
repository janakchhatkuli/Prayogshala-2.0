import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SUBJECTS, getExperiment } from './experiments';

export type Locale = 'en' | 'ne';
export type Theme = 'dark' | 'light';

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

export interface Session {
  email: string;
  name: string;
  role: 'student' | 'teacher';
  grade: number;
  school: string;
  loggedInAt: string;
}

export interface ViewEvent {
  path: string;
  at: string;
  experimentId?: string;
}

const VIEW_LOG_LIMIT = 200;

interface PrayogShalaStore {
  locale: Locale;
  setLocale: (locale: Locale) => void;

  theme: Theme;
  setTheme: (theme: Theme) => void;

  currentUser: UserProfile;
  setUser: (user: UserProfile) => void;

  session: Session | null;
  login: (session: Omit<Session, 'loggedInAt'>) => void;
  logout: () => void;

  viewLog: ViewEvent[];
  logView: (path: string, experimentId?: string) => void;

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

      theme: 'dark',
      setTheme: (theme) => set({ theme }),

      currentUser: { name: '', grade: 10 },
      setUser: (user) => set({ currentUser: user }),

      session: null,
      login: (session) =>
        set({
          session: { ...session, loggedInAt: new Date().toISOString() },
          currentUser: { name: session.name, grade: session.grade },
        }),
      logout: () => set({ session: null }),

      viewLog: [],
      logView: (path, experimentId) => {
        const { viewLog } = get();
        const last = viewLog[viewLog.length - 1];
        // Collapse rapid duplicate hits on the same route (e.g. re-renders, back/forward).
        if (last && last.path === path && Date.now() - new Date(last.at).getTime() < 5000) return;
        const next = [...viewLog, { path, at: new Date().toISOString(), experimentId }];
        set({ viewLog: next.slice(-VIEW_LOG_LIMIT) });
      },

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
