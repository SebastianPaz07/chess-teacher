/** Rating de entrenamiento tipo Elo (contra la dificultad del ejercicio). */

export const INITIAL_RATING = 800;
export const MIN_RATING = 100;

export function expectedScore(player: number, puzzle: number) {
  return 1 / (1 + 10 ** ((puzzle - player) / 400));
}

/**
 * K bajo a propósito: subir de nivel de verdad lleva muchos ejercicios (y teoría).
 * Un ejercicio de tu nivel mueve el puntaje unos ±4 al principio y ±3 después.
 */
export function kFactor(gamesPlayed: number) {
  return gamesPlayed < 30 ? 8 : 6;
}

/** Máximo que puede subir el puntaje en un día (bajar no tiene tope diario). */
export const DAILY_GAIN_CAP = 15;

/**
 * `score`: 1 = resuelto a la primera sin ayuda, 0.5 = resuelto con pista,
 * 0.25 = resuelto tras equivocarte, 0 = no resuelto (también acepta boolean).
 * Solo el resultado limpio puede sumar; los fallos restan tanto como suman los aciertos.
 */
export function updateRating(player: number, puzzle: number, score: number | boolean, gamesPlayed: number) {
  const s = typeof score === 'boolean' ? (score ? 1 : 0) : score;
  let delta = Math.round(kFactor(gamesPlayed) * (s - expectedScore(player, puzzle)));
  if (s < 1) delta = Math.min(delta, 0);
  // Un fallo siempre se nota, aunque el ejercicio fuera muy difícil
  if (s === 0) delta = Math.min(delta, -1);
  const rating = Math.max(MIN_RATING, player + delta);
  return { rating, delta: rating - player };
}

/**
 * Como `pickAdaptive`, pero variado: como mucho `maxPerKind` ejercicios del mismo
 * tipo (si no alcanza, completa con lo que haya).
 */
export function pickVaried<T extends { id: string; rating: number }>(
  items: T[],
  rating: number,
  count: number,
  seen: Set<string>,
  rand: () => number,
  kindOf: (item: T) => string,
  maxPerKind = 1,
  already: T[] = [],
): T[] {
  const ranked = pickAdaptive(items, rating, items.length, seen, rand);
  const used = new Map<string, number>();
  for (const it of already) used.set(kindOf(it), (used.get(kindOf(it)) ?? 0) + 1);
  const out: T[] = [];
  const taken = new Set(already.map((a) => a.id));
  for (let cap = maxPerKind; out.length < count && cap <= maxPerKind + count; cap++) {
    for (const it of ranked) {
      if (out.length >= count) break;
      const kind = kindOf(it);
      // No se alejan del nivel solo por variar
      if (taken.has(it.id) || (used.get(kind) ?? 0) >= cap || (cap === maxPerKind && Math.abs(it.rating - rating) > 350)) continue;
      taken.add(it.id);
      used.set(kind, (used.get(kind) ?? 0) + 1);
      out.push(it);
    }
  }
  return out;
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
