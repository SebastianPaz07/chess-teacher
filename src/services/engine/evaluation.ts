/**
 * Puntuación del motor desde el punto de vista del ALUMNO.
 *  - mate ≥ 0: el alumno da mate en `mate` jugadas (0 = ya dio mate)
 *  - mate < 0: el alumno recibe mate
 *  - cp: centipeones (100 = un peón)
 */
export interface Score {
  cp?: number;
  mate?: number;
}

/** Valor numérico comparable (los mates dominan a cualquier ventaja material). */
export function scoreValue(s: Score): number {
  if (s.mate !== undefined) return s.mate >= 0 ? 100_000 - s.mate : -100_000 - s.mate;
  return s.cp ?? 0;
}

/** Invierte una puntuación UCI (dada para el bando al que le toca) al otro bando. */
export function flip(s: Score): Score {
  // "mate 0" = el bando al que le toca está mateado → el otro ya dio mate (0)
  return s.mate !== undefined ? { mate: s.mate === 0 ? 0 : -s.mate } : { cp: -(s.cp ?? 0) };
}

/**
 * ¿La jugada del alumno es tan buena como la del libro?
 *  - Si la del libro da mate: hace falta mate igual de rápido (o más).
 *  - Si el alumno da mate y la del libro no: se acepta.
 *  - Si la del libro gana (≥ +1.5): el alumno debe seguir ganando claro y
 *    no perder más de max(60 cp, 10 %) respecto a la del libro.
 *  - Posiciones de defensa/igualdad: como mucho 40 cp peor.
 */
export function isAcceptableAlternative(expected: Score, user: Score): boolean {
  if (expected.mate !== undefined && expected.mate >= 0) {
    return user.mate !== undefined && user.mate >= 0 && user.mate <= expected.mate;
  }
  if (user.mate !== undefined) return user.mate >= 0;
  if (expected.mate !== undefined) return true; // la del libro recibe mate y la del alumno no
  const e = expected.cp ?? 0;
  const u = user.cp ?? 0;
  if (e >= 150) return u >= 150 && u >= e - Math.max(60, e * 0.1);
  return u >= e - 40;
}
