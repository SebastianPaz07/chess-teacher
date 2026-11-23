import type { Level } from '@/content/schema';
import { levelForRating } from './progression';

/**
 * Test de nivel adaptativo (escalera): empieza en START y sube o baja
 * con pasos cada vez más pequeños según aciertos y fallos.
 */
export const PLACEMENT_START = 1200;
export const PLACEMENT_STEPS = [300, 250, 200, 150, 125, 100, 75, 75, 50, 50];
export const PLACEMENT_LENGTH = PLACEMENT_STEPS.length;
const MIN = 400;
const MAX = 2600;

export interface PlacementAnswer {
  rating: number;
  success: boolean;
}

/** Siguiente dificultad objetivo tras responder la pregunta `index`. */
export function nextTarget(current: number, index: number, success: boolean): number {
  const step = PLACEMENT_STEPS[Math.min(index, PLACEMENT_STEPS.length - 1)];
  return Math.min(MAX, Math.max(MIN, current + (success ? step : -step)));
}

/**
 * Estimación final: rating de rendimiento sobre los ítems respondidos
 * (media de dificultad + ajuste por % de aciertos), mezclada con el
 * objetivo final de la escalera, que suele ser la mejor estimación.
 */
export function estimatePlacement(answers: PlacementAnswer[], finalTarget: number): { rating: number; level: Level } {
  if (!answers.length) return { rating: PLACEMENT_START, level: levelForRating(PLACEMENT_START) };
  const avg = answers.reduce((a, r) => a + r.rating, 0) / answers.length;
  const score = answers.filter((r) => r.success).length / answers.length;
  const clamped = Math.min(0.95, Math.max(0.05, score));
  const performance = avg + 400 * Math.log10(clamped / (1 - clamped));
  const rating = Math.round(Math.min(MAX, Math.max(MIN, 0.6 * finalTarget + 0.4 * performance)));
  return { rating, level: levelForRating(rating) };
}

export type EloSource = 'lichess' | 'chesscom' | 'fide';

/**
 * Convierte un Elo externo a rating de entrenamiento (escala de puzzles
 * de Lichess). Aproximación: los puzzles de Lichess suelen estar por
 * encima de Chess.com y FIDE en el mismo jugador.
 */
export function ratingFromElo(elo: number, source: EloSource): { rating: number; level: Level } {
  const offset = source === 'lichess' ? 0 : source === 'chesscom' ? 100 : 200;
  const rating = Math.round(Math.min(MAX, Math.max(MIN, elo + offset)));
  return { rating, level: levelForRating(rating) };
}

/** Elige el ejercicio no usado más cercano a la dificultad objetivo. */
export function pickNearest<T extends { id: string; rating: number }>(pool: T[], target: number, used: Set<string>, rand: () => number = Math.random): T | undefined {
  const candidates = pool.filter((e) => !used.has(e.id));
  if (!candidates.length) return undefined;
  const best = Math.min(...candidates.map((e) => Math.abs(e.rating - target)));
  // Pequeña aleatoriedad entre los que están a ≤50 del mejor
  const near = candidates.filter((e) => Math.abs(e.rating - target) <= best + 50);
  return near[Math.floor(rand() * near.length)];
}
