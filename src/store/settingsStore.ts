import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setDayOffset } from '@/lib/date';
import { storeKey, zustandStorage } from '@/services/storage/localStorageAdapter';

export type ThemeMode = 'system' | 'light' | 'dark';

interface SettingsState {
  playerName: string;
  /** Minutos de estudio por día (plan personalizado) */
  dailyMinutes: number;
  /** Días de entrenamiento (0 = domingo … 6 = sábado). El resto son de descanso: no rompen la racha. */
  trainingDays: number[];
  sound: boolean;
  spanishNotation: boolean;
  theme: ThemeMode;
  /** Depuración: simular días futuros */
  dayOffset: number;
  onboarded: boolean;
  update: (patch: Partial<Omit<SettingsState, 'update'>>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      playerName: '',
      dailyMinutes: 15,
      trainingDays: [1, 2, 3, 4, 5],
      sound: true,
      spanishNotation: true,
      theme: 'system',
      dayOffset: 0,
      onboarded: false,
      update: (patch) => {
        if (patch.dayOffset !== undefined) setDayOffset(patch.dayOffset);
        set(patch);
      },
    }),
    {
      name: storeKey('settings'),
      storage: zustandStorage,
      version: 1,
      onRehydrateStorage: () => (state) => {
        if (state) setDayOffset(state.dayOffset);
      },
    },
  ),
);
