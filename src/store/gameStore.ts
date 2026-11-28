import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { todayKey } from '@/lib/date';
import { initialStats } from '@/services/game/achievements';
import { applyEvent, freshDaily, initialGameState, type GameState } from '@/services/game/engine';
import type { GameEvent, Reward } from '@/services/game/events';
import type { DailyTask } from '@/services/scheduler/dailyPlan';
import type { ThemeId } from '@/services/scheduler/weekPlan';
import { storeKey, zustandStorage } from '@/services/storage/localStorageAdapter';
import { useSettingsStore } from './settingsStore';

interface GameStore extends GameState {
  /** Plan del día congelado (se genera una vez por fecha) */
  plan: { date: string; tasks: DailyTask[]; key?: string } | null;
  /** Temas de la semana, congelados para que el plan no cambie a mitad de camino */
  week: { weekStart: string; key: string; themes: Record<string, ThemeId | null> } | null;
  setWeek: (week: NonNullable<GameStore['week']>) => void;
  /** Cola de recompensas pendientes de mostrar (no se persiste) */
  rewards: (Reward & { key: number })[];
  dispatch: (e: GameEvent, extra?: { dailyTotal?: number }) => Reward[];
  /** Suma tiempo de estudio activo al día de hoy */
  addStudySeconds: (secs: number) => void;
  ensureToday: () => void;
  setPlan: (date: string, tasks: DailyTask[], key?: string) => void;
  shiftReward: () => void;
}

let rewardKey = 0;

/** Oyentes de eventos de juego (p. ej. el feed del club). Desacopla la store de lo social. */
type GameListener = (e: GameEvent, rewards: Reward[], prev: GameState, next: GameState) => void;
const listeners = new Set<GameListener>();
export function onGameEvent(cb: GameListener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...initialGameState(todayKey()),
      plan: null,
      week: null,
      rewards: [],
      setWeek: (week) => set({ week }),

      dispatch: (e, extra) => {
        const prev = get();
        const { trainingDays, startedAt } = useSettingsStore.getState();
        const { state, rewards } = applyEvent(prev, e, todayKey(), { ...extra, trainingDays, startedAt });
        set({ ...state, rewards: [...prev.rewards, ...rewards.map((r) => ({ ...r, key: ++rewardKey }))] });
        for (const l of listeners) {
          try {
            l(e, rewards, prev, state);
          } catch (err) {
            console.error(err);
          }
        }
        return rewards;
      },

      addStudySeconds: (secs) => {
        if (secs <= 0) return;
        const today = todayKey();
        const log = get().activityLog ?? {};
        const day = log[today] ?? { puzzles: 0, lessons: 0, reviews: 0 };
        set({ activityLog: { ...log, [today]: { ...day, seconds: (day.seconds ?? 0) + secs } } });
      },

      ensureToday: () => {
        const today = todayKey();
        if (get().daily.date !== today) set({ daily: freshDaily(today) });
      },

      setPlan: (date, tasks, key) => set({ plan: { date, tasks, key } }),
      shiftReward: () => set((s) => ({ rewards: s.rewards.slice(1) })),
    }),
    {
      name: storeKey('game'),
      storage: zustandStorage,
      version: 2,
      // v2: nuevas estadísticas de club y contadores diarios
      migrate: (persisted, version) => {
        const s = (persisted ?? {}) as Partial<GameState>;
        if (version < 2) return { ...s, stats: { ...initialStats, ...(s.stats ?? {}) }, activityLog: s.activityLog ?? {} } as GameState;
        return s as GameState;
      },
      partialize: ({ rewards: _r, dispatch: _d, ensureToday: _e, setPlan: _s, shiftReward: _sh, addStudySeconds: _a, setWeek: _w, ...rest }) => rest,
    },
  ),
);
