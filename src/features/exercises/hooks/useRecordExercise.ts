import { useCallback } from 'react';
import type { Exercise } from '@/content/schema';
import type { PuzzleResult } from '@/components/chess';
import type { GameEvent, Reward } from '@/services/game/events';
import { useGameStore } from '@/store/gameStore';
import { useProgressStore } from '@/store/progressStore';
import { useReviewStore } from '@/store/reviewStore';

type Context = Extract<GameEvent, { type: 'PUZZLE_SOLVED' }>['context'];

/**
 * Registra el resultado de un ejercicio en todos los sistemas:
 * maestría por tema, tarjeta de repaso SM-2 y motor de juego (XP/rating).
 */
export function useRecordExercise() {
  const recordAttempt = useProgressStore((s) => s.recordAttempt);
  const addCard = useReviewStore((s) => s.addCard);
  const dispatch = useGameStore((s) => s.dispatch);

  return useCallback(
    (ex: Exercise, r: PuzzleResult, context: Context): Reward[] => {
      recordAttempt(ex.id, ex.tags, r.success);
      if (context !== 'review' && context !== 'rush') addCard('exercise', ex.id);
      return dispatch({
        type: 'PUZZLE_SOLVED',
        exerciseId: ex.id,
        themes: ex.themes,
        success: r.success,
        mistakes: r.mistakes,
        puzzleRating: ex.rating,
        context,
        hintsUsed: r.hintsUsed,
      });
    },
    [recordAttempt, addCard, dispatch],
  );
}
