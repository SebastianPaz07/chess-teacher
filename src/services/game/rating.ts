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

/** Pérdida máxima por ejercicio y suavizado de las pérdidas (para no desmotivar). */
export const MAX_LOSS = 8;
export const LOSS_FACTOR = 0.6;

/**
 * `score`: 1 = resuelto a la primera, 0.5 = resuelto con errores/pistas, 0 = no resuelto
 * (también acepta boolean). Las pérdidas se suavizan y tienen un tope.
 */
export function updateRating(player: number, puzzle: number, score: number | boolean, gamesPlayed: number) {
  const s = typeof score === 'boolean' ? (score ? 1 : 0) : score;
  let delta = Math.round(kFactor(gamesPlayed) * (s - expectedScore(player, puzzle)));
  if (delta < 0) delta = -Math.min(MAX_LOSS, Math.max(1, Math.round(-delta * LOSS_FACTOR)));
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
