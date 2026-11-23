/** Rating de entrenamiento tipo Elo (contra la dificultad del ejercicio). */

export const INITIAL_RATING = 800;
export const MIN_RATING = 100;

export function expectedScore(player: number, puzzle: number) {
  return 1 / (1 + 10 ** ((puzzle - player) / 400));
}

/**
 * K moderado: al principio se ajusta algo más rápido, luego se estabiliza.
 * Un ejercicio de tu nivel resuelto a la primera da ≈ +6…+12, no +24.
 */
export function kFactor(gamesPlayed: number) {
  if (gamesPlayed < 15) return 24;
  if (gamesPlayed < 60) return 16;
  return 12;
}

export function updateRating(player: number, puzzle: number, success: boolean, gamesPlayed: number) {
  const delta = Math.round(kFactor(gamesPlayed) * ((success ? 1 : 0) - expectedScore(player, puzzle)));
  return { rating: Math.max(MIN_RATING, player + delta), delta };
}

/** Elige ítems cercanos al rating (adaptativo), priorizando los no vistos. */
export function pickAdaptive<T extends { id: string; rating: number }>(
  items: T[],
  rating: number,
  count: number,
  seen: Set<string> = new Set(),
  rand: () => number = Math.random,
): T[] {
  return [...items]
    .map((it) => ({
      it,
      score: Math.abs(it.rating - (rating + 50)) + (seen.has(it.id) ? 400 : 0) + rand() * 120,
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, count)
    .map((x) => x.it);
}
