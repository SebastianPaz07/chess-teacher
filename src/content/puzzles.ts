import { z } from 'zod';
import index from './puzzles/index.json';
import { getExercise, registerExercises } from './registry';
import { ExerciseSchema, type Exercise } from './schema';

/**
 * Puzzles importados de la base abierta de Lichess (CC0) con
 * `npm run import:puzzles`. Se cargan de forma diferida (un chunk por
 * tramo de rating) para no inflar el bundle inicial.
 */
const bandFiles = import.meta.glob<unknown>('./puzzles/band-*.json', { import: 'default' });

/** Resumen de cada tramo (cuántos puzzles hay por tema), sin cargar los puzzles */
const bands = index.bands as unknown as { from: number; to: number; file: string; count: number; themes: Record<string, number> }[];

export const puzzleTotal = bands.reduce((acc, b) => acc + b.count, 0);

export const puzzleThemeCounts: Record<string, number> = {};
for (const b of bands) for (const [t, n] of Object.entries(b.themes)) puzzleThemeCounts[t] = (puzzleThemeCounts[t] ?? 0) + n;

let cache: Exercise[] | null = null;
const bandCache = new Map<string, Promise<Exercise[]>>();

function toExercise(raw: z.infer<typeof ExerciseSchema>): Exercise {
  return { ...raw, moduleId: 'lichess', tags: ['tactica', ...raw.themes] };
}

/** Un tramo se descarga y valida una sola vez */
function loadBand(path: string): Promise<Exercise[]> {
  let band = bandCache.get(path);
  if (!band) {
    band = bandFiles[path]().then((data) => {
      const list = z.array(ExerciseSchema).parse(data).map(toExercise);
      registerExercises(list);
      return list;
    });
    bandCache.set(path, band);
    band.catch(() => bandCache.delete(path));
  }
  return band;
}

/** Todos los puzzles */
export function loadPuzzles(): Promise<Exercise[]> {
  if (cache) return Promise.resolve(cache);
  return Promise.all(Object.keys(bandFiles).map(loadBand)).then((lists) => (cache ??= lists.flat()));
}

/** Puzzles sin ver que bastan para elegir una ronda con variedad */
const ENOUGH = 40;
const BATCH = 3;

/**
 * Solo lo necesario para practicar: los tramos más cercanos al nivel que tengan
 * el tema, de tres en tres, hasta juntar suficientes ejercicios sin ver.
 */
export async function loadPuzzlesFor(rating: number, theme: string | null, seen: Set<string> = new Set()): Promise<Exercise[]> {
  const distance = (b: { from: number; to: number }) => Math.abs((b.from + b.to) / 2 - (rating + 50));
  const near = bands.filter((b) => !theme || b.themes[theme]).sort((a, b) => distance(a) - distance(b));
  const found: Exercise[] = [];
  for (let i = 0; i < near.length && found.filter((e) => !seen.has(e.id)).length < ENOUGH; i += BATCH) {
    const lists = await Promise.all(near.slice(i, i + BATCH).map((b) => loadBand(`./puzzles/${b.file}`)));
    found.push(...lists.flat().filter((e) => !theme || e.themes.includes(theme)));
  }
  return found;
}

/** Tramos alrededor del nivel que bastan para armar un plan */
const NEAR_BANDS = 7;

/** Puzzles de todos los temas cercanos a un nivel (≈ ±350 puntos). */
export async function loadPuzzlesNear(rating: number): Promise<Exercise[]> {
  const distance = (b: { from: number; to: number }) => Math.abs((b.from + b.to) / 2 - (rating + 50));
  const near = [...bands].sort((a, b) => distance(a) - distance(b)).slice(0, NEAR_BANDS);
  const lists = await Promise.all(near.sort((a, b) => a.from - b.from).map((b) => loadBand(`./puzzles/${b.file}`)));
  return lists.flat();
}

export const missingExercises = (ids: string[]) => ids.some((id) => !getExercise(id));

/** Hace disponibles unos ejercicios concretos: primero busca cerca del nivel y solo si faltan carga el resto. */
export async function loadExercises(ids: string[], rating: number): Promise<void> {
  if (missingExercises(ids)) await loadPuzzlesNear(rating);
  if (missingExercises(ids)) await loadPuzzles();
}

export const loadedPuzzles = () => cache;
