import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { clubRepo, type Club, type MyProfile, type Session } from '@/services/club';
import { publishNow, startClubSync } from '@/services/club/sync';
import { storeKey, zustandStorage } from '@/services/storage/localStorageAdapter';

type Status = 'loading' | 'signed-out' | 'no-profile' | 'no-club' | 'ready';

interface ClubState {
  status: Status;
  session: Session | null;
  profile: MyProfile | null;
  club: Club | null;
  /** Sube con cada cambio de datos: las consultas se recargan */
  version: number;
  /** Versión pedida explícitamente (acción del usuario): se recarga sin esperar */
  forcedVersion: number;
  init: () => Promise<void>;
  /** Recarga sesión, perfil y club */
  refresh: () => Promise<void>;
  bump: () => void;
  /** Recarga ya, sin respetar la espera mínima entre consultas */
  forceReload: () => void;
}

let initialized = false;

export const useClubStore = create<ClubState>()((set, get) => ({
  status: 'loading',
  session: null,
  profile: null,
  club: null,
  version: 0,
  forcedVersion: -1,

  init: async () => {
    if (initialized) return;
    initialized = true;
    startClubSync();
    // Los avisos en vivo se agrupan: varias novedades seguidas = una sola recarga
    let timer: ReturnType<typeof setTimeout> | null = null;
    clubRepo.subscribe(() => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        get().bump();
      }, 3000);
    });
    // Al volver a la pestaña solo se recarga si pasaron más de 2 minutos
    let lastFocusBump = Date.now();
    window.addEventListener('focus', () => {
      if (Date.now() - lastFocusBump < 2 * 60_000) return;
      lastFocusBump = Date.now();
      get().bump();
    });
    await get().refresh();
  },

  refresh: async () => {
    try {
      const session = await clubRepo.getSession();
      const profile = session ? await clubRepo.getMyProfile() : null;
      const club = session ? await clubRepo.getMyClub() : null;
      const status: Status = !session ? 'signed-out' : !profile ? 'no-profile' : !club ? 'no-club' : 'ready';
      set({ session, profile, club, status, version: get().version + 1, forcedVersion: get().version + 1 });
      if (status === 'ready') publishNow();
    } catch {
      set({ status: 'signed-out' });
    }
  },

  bump: () => set((s) => ({ version: s.version + 1 })),
  forceReload: () => set((s) => ({ version: s.version + 1, forcedVersion: s.version + 1 })),
}));

/** Recompensas ya cobradas (para no dar XP dos veces por el mismo reto). Se guarda en el navegador. */
interface ClaimsState {
  challenges: string[];
  weeks: string[];
  claimChallenge: (id: string) => boolean;
  claimWeek: (week: string) => boolean;
}

export const useClubClaimsStore = create<ClaimsState>()(
  persist(
    (set, get) => ({
      challenges: [],
      weeks: [],
      claimChallenge: (id) => {
        if (get().challenges.includes(id)) return false;
        set({ challenges: [...get().challenges, id].slice(-300) });
        return true;
      },
      claimWeek: (week) => {
        if (get().weeks.includes(week)) return false;
        set({ weeks: [...get().weeks, week].slice(-60) });
        return true;
      },
    }),
    { name: storeKey('club-claims'), storage: zustandStorage, partialize: ({ challenges, weeks }) => ({ challenges, weeks }) as ClaimsState },
  ),
);
