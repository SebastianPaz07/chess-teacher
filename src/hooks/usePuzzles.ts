import { useEffect, useState } from 'react';
import { loadedPuzzles, loadExercises, loadPuzzles, missingExercises } from '@/content/puzzles';
import type { Exercise } from '@/content/schema';
import { useGameStore } from '@/store/gameStore';

/**
 * Pool de puzzles importados. `ready` es true cuando terminó la carga
 * (también si falló: en ese caso `puzzles` es [] y se usa el contenido local).
 */
export function usePuzzles(): { puzzles: Exercise[]; ready: boolean } {
  const [puzzles, setPuzzles] = useState<Exercise[] | null>(loadedPuzzles);
  useEffect(() => {
    if (puzzles) return;
    let alive = true;
    loadPuzzles()
      .then((p) => alive && setPuzzles(p))
      .catch(() => alive && setPuzzles([]));
    return () => {
      alive = false;
    };
  }, [puzzles]);
  return { puzzles: puzzles ?? [], ready: puzzles !== null };
}

/**
 * true cuando los ejercicios pedidos ya se pueden leer con `getExercise` (o ya
 * se intentó cargarlos). Si todos están disponibles no se descarga nada.
 */
export function useExercisesReady(ids: string[] | undefined): boolean {
  const rating = useGameStore((s) => s.rating);
  const key = ids?.join(',');
  const missing = Boolean(ids && missingExercises(ids));
  const [tried, setTried] = useState<string>();
  useEffect(() => {
    if (!ids || !missing) return;
    let alive = true;
    loadExercises(ids, rating)
      .catch(() => undefined)
      .then(() => alive && setTried(key));
    return () => {
      alive = false;
    };
    // Solo cuando cambia la lista pedida
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return ids !== undefined && (!missing || tried === key);
}
