import { allExercises } from '@/content/registry';
import { loadPuzzles } from '@/content/puzzles';
import { now } from '@/lib/date';
import { storage, storeKey } from '@/services/storage/localStorageAdapter';
import { useSettingsStore } from '@/store/settingsStore';
import { supabase } from '@/services/supabase/client';
import { createMockRepository } from './mockRepository';
import { createSupabaseRepository } from './supabaseRepository';

const pool = async () => [...allExercises, ...(await loadPuzzles().catch(() => []))];

const mockRepo = createMockRepository({
  load: () => storage.getItem(storeKey('club-mock')),
  save: (json) => storage.setItem(storeKey('club-mock'), json),
  now,
  realNow: () => Date.now(),
  pool,
  latencyMs: 120,
  isPlatformAdmin: () => useSettingsStore.getState().isPlatformAdmin,
});

/**
 * Repositorio activo del club: Supabase si hay proyecto configurado; si no,
 * el modo demo con compañeros simulados. Se tipa como el mock porque las
 * herramientas `_advance`, `_reset`… solo se usan tras comprobar `isDemo`.
 */
export const clubRepo: typeof mockRepo = supabase ? (createSupabaseRepository({ client: supabase, now, pool }) as typeof mockRepo) : mockRepo;

export type { ClubRepository, MyProfile } from './ClubRepository';
export * from './types';
export { CLUB_FEED_ID } from './mockRepository';
