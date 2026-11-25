import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setDayOffset } from '@/lib/date';
import { storeKey, zustandStorage } from '@/services/storage/localStorageAdapter';

export type ThemeMode = 'system' | 'light' | 'dark';

/** En qué quiere reforzar más el plan de entrenamiento */
export type FocusArea = 'tactica' | 'teoria' | 'finales' | 'medio-juego';

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
  /** false = principiante absoluto que aún no completa la lección de cómo mover las piezas: sin ejercicios hasta entonces */
  learnedBasics: boolean;
  /** Demo: soy admin de la plataforma y puedo crear clubes y compartir el link de creación */
  isPlatformAdmin: boolean;
  /** Áreas a reforzar (vacío = plan equilibrado) */
  focusAreas: FocusArea[];
  /** Apertura que el alumno quiere repasar */
  favoriteOpening: string | null;
  /** Aperturas que quiere conocer */
  exploreOpenings: string[];
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
      learnedBasics: true,
      isPlatformAdmin: false,
      focusAreas: [],
      favoriteOpening: null,
      exploreOpenings: [],
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
        // El desfase de días es solo una herramienta de desarrollo: en producción siempre es 0
        if (state) setDayOffset(import.meta.env.DEV ? state.dayOffset : 0);
      },
    },
  ),
);
