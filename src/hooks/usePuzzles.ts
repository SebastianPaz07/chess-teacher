import { useEffect, useState } from 'react';
import { loadedPuzzles, loadPuzzles } from '@/content/puzzles';
import type { Exercise } from '@/content/schema';

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
