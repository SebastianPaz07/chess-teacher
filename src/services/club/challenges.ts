import type { Exercise } from '@/content/schema';
import { hashString, seededRandom, shuffle } from '@/lib/random';
import type { ChallengeKind, ChallengeResult } from './types';

export const CHALLENGE_PUZZLES = 5;
export const RUSH_SECONDS = 180;
export const RUSH_STRIKES = 3;
export const WEEKLY_PUZZLES = 10;
export const CHALLENGE_TTL_HOURS = 72;

type PuzzleLike = Pick<Exercise, 'id' | 'rating' | 'solution'>;

/** Puzzles cercanos a `target` (se amplía la ventana hasta tener suficientes). */
function near<T extends PuzzleLike>(pool: T[], target: number, min: number): T[] {
  const usable = pool.filter((p) => p.solution.length <= 5);
  for (let window = 100; window <= 1600; window += 100) {
    const hits = usable.filter((p) => Math.abs(p.rating - target) <= window);
    if (hits.length >= min) return hits;
  }
  return usable;
}

/**
 * Set fijo de un reto: el mismo para los dos jugadores.
 * - puzzles: N ejercicios alrededor del rating medio de ambos.
 * - rush: lista larga de dificultad creciente desde unos 300 puntos por debajo.
 */
export function pickChallengePuzzles<T extends PuzzleLike>(pool: T[], kind: ChallengeKind, ratingA: number, ratingB: number, seed: string): string[] {
  const rand = seededRandom(hashString(seed));
  const avg = Math.round((ratingA + ratingB) / 2);
  if (kind === 'puzzles') {
    return shuffle(near(pool, avg, CHALLENGE_PUZZLES * 4), rand)
      .slice(0, CHALLENGE_PUZZLES)
      .sort((a, b) => a.rating - b.rating)
      .map((p) => p.id);
  }
  const usable = pool.filter((p) => p.solution.length <= 3);
  const tiers = [-300, -150, 0, 150, 300, 450].map((d) => shuffle(near(usable, avg + d, 12), rand).slice(0, 8));
  const seen = new Set<string>();
  return tiers.flat().filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true))).map((p) => p.id);
}

/** 10 puzzles del desafío semanal: iguales para todo el club esa semana. */
export function pickWeeklyPuzzles<T extends PuzzleLike>(pool: T[], clubId: string, weekStart: string, clubRating: number): string[] {
  const rand = seededRandom(hashString(`${clubId}:${weekStart}`));
  const tiers = [-250, -100, 0, 100, 250].map((d) => shuffle(near(pool, clubRating + d, 6), rand).slice(0, 2));
  const seen = new Set<string>();
  return tiers
    .flat()
    .filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)))
    .slice(0, WEEKLY_PUZZLES)
    .map((p) => p.id);
}

/** Compara dos resultados: más resueltos, luego menos errores, luego menos tiempo. */
export function compareResults(a: Pick<ChallengeResult, 'solved' | 'mistakes' | 'timeMs'>, b: Pick<ChallengeResult, 'solved' | 'mistakes' | 'timeMs'>): number {
  if (a.solved !== b.solved) return b.solved - a.solved;
  if (a.mistakes !== b.mistakes) return a.mistakes - b.mistakes;
  return a.timeMs - b.timeMs;
}

/** Ganador de un reto con dos resultados. null = empate exacto. */
export function scoreChallenge(results: ChallengeResult[]): string | null {
  if (results.length < 2) throw new Error('El reto aún no tiene dos resultados');
  const [a, b] = results;
  const c = compareResults(a, b);
  if (c === 0) return null;
  return c < 0 ? a.memberId : b.memberId;
}

/** Probabilidad de resolver un puzzle (curva Elo). */
export const solveChance = (playerRating: number, puzzleRating: number) => 1 / (1 + 10 ** ((puzzleRating - playerRating) / 400));

/**
 * Simula la partida de un compañero (modo demo). Determinista con la semilla.
 */
export function simulateRun(rating: number, puzzleRatings: number[], kind: ChallengeKind, seed: string): { solved: number; mistakes: number; timeMs: number } {
  const rand = seededRandom(hashString(seed));
  let solved = 0;
  let mistakes = 0;
  let time = 0;
  for (const pr of puzzleRatings) {
    const secs = 10 + rand() * 35 + Math.max(0, pr - rating) / 25;
    if (kind === 'rush' && time + secs * 1000 > RUSH_SECONDS * 1000) break;
    time += secs * 1000;
    if (rand() < solveChance(rating, pr)) solved++;
    else {
      mistakes++;
      if (kind === 'rush' && mistakes >= RUSH_STRIKES) break;
    }
  }
  return { solved, mistakes, timeMs: Math.round(time) };
}
