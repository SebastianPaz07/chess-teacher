import { allExercises } from '@/content/registry';
import { loadPuzzles } from '@/content/puzzles';
import { now } from '@/lib/date';
import { storage, storeKey } from '@/services/storage/localStorageAdapter';
import { createMockRepository } from './mockRepository';

/**
 * Repositorio activo del club. Hoy: modo demo con compañeros simulados.
 * Para conectar Supabase basta con implementar `ClubRepository` y cambiar
 * esta línea.
 */
export const clubRepo = createMockRepository({
  load: () => storage.getItem(storeKey('club-mock')),
  save: (json) => storage.setItem(storeKey('club-mock'), json),
  now,
  realNow: () => Date.now(),
  pool: async () => [...allExercises, ...(await loadPuzzles().catch(() => []))],
  latencyMs: 120,
});

export type { ClubRepository, MyProfile } from './ClubRepository';
export * from './types';
export { CLUB_FEED_ID } from './mockRepository';
