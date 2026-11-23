import { z } from 'zod';
import { registerExercises } from './registry';
import { ExerciseSchema, type Exercise } from './schema';

/**
 * Puzzles importados de la base abierta de Lichess (CC0) con
 * `npm run import:puzzles`. Se cargan de forma diferida (un chunk por
 * tramo de rating) para no inflar el bundle inicial.
 */
const bandFiles = import.meta.glob('./puzzles/band-*.json', { import: 'default' });

let cache: Exercise[] | null = null;
let pending: Promise<Exercise[]> | null = null;

function toExercise(raw: z.infer<typeof ExerciseSchema>): Exercise {
  return { ...raw, moduleId: 'lichess', tags: ['tactica', ...raw.themes] };
}

export function loadPuzzles(): Promise<Exercise[]> {
  if (cache) return Promise.resolve(cache);
  pending ??= Promise.all(Object.values(bandFiles).map((load) => load()))
    .then((bands) => {
      const list = bands.flatMap((b) => z.array(ExerciseSchema).parse(b).map(toExercise));
      registerExercises(list);
      cache = list;
      return list;
    })
    .catch((e) => {
      pending = null;
      throw e;
    });
  return pending;
}

export const loadedPuzzles = () => cache;
