import { Chess } from 'chess.js';
import { registerExercises } from '@/content/registry';
import type { Exercise } from '@/content/schema';
import { storage, storeKey } from '@/services/storage/localStorageAdapter';
import { LICHESS_TO_TAG, MOTIF_ORDER, TAG_TO_ANGLE, TITLE_BY_TAG } from './themes';

/**
 * Ejercicios «infinitos»: se piden a la API pública de Lichess (sin cuenta,
 * con CORS abierto) y se guardan en el dispositivo para poder repasarlos
 * sin conexión. Si no hay red, la app sigue con los puzzles incluidos.
 */
const API = 'https://lichess.org/api/puzzle/next';
const CACHE_KEY = storeKey('lichess-cache');
const CACHE_MAX = 500;

interface ApiPuzzle {
  puzzle: { id: string; rating: number; solution: string[]; themes: string[]; fen?: string; initialPly?: number };
  game?: { pgn?: string };
}

type Difficulty = 'easiest' | 'easier' | 'normal' | 'harder' | 'hardest';

/** Lichess ofrece 5 niveles alrededor de 1500 para quien no tiene cuenta (≈ 880 … 1900). */
export function difficultyFor(rating: number): Difficulty {
  if (rating < 1050) return 'easiest';
  if (rating < 1300) return 'easier';
  if (rating < 1650) return 'normal';
  if (rating < 1900) return 'harder';
  return 'hardest';
}

const uciMove = (u: string) => ({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });

/** Convierte la respuesta de la API al formato de ejercicio de la app (solución en SAN). */
export function toExercise(data: ApiPuzzle): Exercise | null {
  try {
    const p = data.puzzle;
    let fen = p.fen;
    if (!fen) {
      // Respuestas sin FEN: se reconstruye jugando la partida hasta la posición del puzzle
      const game = new Chess();
      const moves = (data.game?.pgn ?? '').split(/\s+/).filter(Boolean);
      for (const m of moves.slice(0, (p.initialPly ?? moves.length - 1) + 1)) game.move(m);
      fen = game.fen();
    }
    const chess = new Chess(fen);
    const solution = p.solution.map((u) => chess.move(uciMove(u)).san);
    const tags = [...new Set(p.themes.map((t) => LICHESS_TO_TAG[t]).filter(Boolean))];
    if (!tags.length) tags.push('ventaja');
    const motif = MOTIF_ORDER.find((m) => tags.includes(m)) ?? 'ventaja';
    return { id: `li-${p.id}`, title: TITLE_BY_TAG[motif] ?? 'Mejor jugada', fen, solution, themes: tags, rating: p.rating, source: `lichess:${p.id}`, moduleId: 'lichess', tags: ['tactica', ...tags] };
  } catch {
    return null;
  }
}

class RateLimited extends Error {}

async function fetchOne(difficulty: Difficulty, angle: string | undefined, signal: AbortSignal): Promise<Exercise | null> {
  const qs = new URLSearchParams({ difficulty });
  if (angle) qs.set('angle', angle);
  const res = await fetch(`${API}?${qs}`, { signal });
  if (res.status === 429) throw new RateLimited();
  if (!res.ok) return null;
  return toExercise((await res.json()) as ApiPuzzle);
}

export interface FetchOptions {
  /** Cuántos ejercicios nuevos quieres */
  count: number;
  rating: number;
  /** Tema de la app (p. ej. «horquilla»); si no, mezcla */
  theme?: string | null;
  /** Ids que no deben repetirse */
  exclude: Set<string>;
  timeoutMs?: number;
}

/**
 * Trae ejercicios nuevos de Lichess que no estén en `exclude`. Devuelve los
 * que alcance a traer (puede ser menos, o ninguno si no hay conexión).
 */
export async function fetchLichessPuzzles({ count, rating, theme, exclude, timeoutMs = 6000 }: FetchOptions): Promise<Exercise[]> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return [];
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const angle = theme ? TAG_TO_ANGLE[theme] : undefined;
  const difficulty = difficultyFor(rating);
  const got = new Map<string, Exercise>();
  let attempts = 0;
  try {
    // Pocas peticiones en paralelo para respetar el límite de la API
    while (got.size < count && attempts < count * 3) {
      const batch = Math.min(3, count - got.size);
      attempts += batch;
      const results = await Promise.all(Array.from({ length: batch }, () => fetchOne(difficulty, angle, ctrl.signal)));
      for (const ex of results) if (ex && !exclude.has(ex.id) && !got.has(ex.id)) got.set(ex.id, ex);
    }
  } catch {
    // sin red, límite de peticiones o tiempo agotado: devolvemos lo que haya
  } finally {
    clearTimeout(timer);
  }
  const list = [...got.values()];
  remember(list);
  return list;
}

// ── Caché local (para repasar ejercicios traídos de Lichess aunque no haya red) ──

function readCache(): Exercise[] {
  try {
    const raw = storage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Exercise[]) : [];
  } catch {
    return [];
  }
}

function remember(list: Exercise[]) {
  if (!list.length) return;
  registerExercises(list);
  const byId = new Map(readCache().map((e) => [e.id, e]));
  for (const e of list) byId.set(e.id, e);
  storage.setItem(CACHE_KEY, JSON.stringify([...byId.values()].slice(-CACHE_MAX)));
}

/** Registra los ejercicios guardados para que el repaso los encuentre. */
export function restoreCachedPuzzles(): Exercise[] {
  const list = readCache();
  registerExercises(list);
  return list;
}
