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
  init: () => Promise<void>;
  /** Recarga sesión, perfil y club */
  refresh: () => Promise<void>;
  bump: () => void;
}

let initialized = false;

export const useClubStore = create<ClubState>()((set, get) => ({
  status: 'loading',
  session: null,
  profile: null,
  club: null,
  version: 0,

  init: async () => {
    if (initialized) return;
    initialized = true;
    startClubSync();
    clubRepo.subscribe(() => get().bump());
    window.addEventListener('focus', () => get().bump());
    await get().refresh();
  },

  refresh: async () => {
    try {
      const session = await clubRepo.getSession();
      const profile = session ? await clubRepo.getMyProfile() : null;
      const club = session ? await clubRepo.getMyClub() : null;
      const status: Status = !session ? 'signed-out' : !profile ? 'no-profile' : !club ? 'no-club' : 'ready';
      set({ session, profile, club, status, version: get().version + 1 });
      if (status === 'ready') publishNow();
    } catch {
      set({ status: 'signed-out' });
    }
  },

  bump: () => set((s) => ({ version: s.version + 1 })),
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
