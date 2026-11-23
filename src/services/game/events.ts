/**
 * Eventos que emiten las features. El motor de juego (engine.ts) los
 * traduce en XP, racha, misiones y logros. Añadir un evento nuevo no
 * obliga a tocar las features existentes.
 */
export type GameEvent =
  | { type: 'LESSON_COMPLETED'; lessonId: string; moduleId: string; mistakes: number; graded: number; xp: number; tags: string[] }
  | { type: 'PUZZLE_SOLVED'; exerciseId: string; themes: string[]; success: boolean; mistakes: number; puzzleRating: number; context: 'practice' | 'review' | 'daily' | 'rush' | 'placement'; hintsUsed?: number }
  | { type: 'REVIEW_DONE'; cardId: string; success: boolean }
  | { type: 'OPENING_TRAINED'; openingId: string; lineIndex: number; mistakes: number }
  | { type: 'GUESS_GAME_FINISHED'; gameId: string; correct: number; total: number }
  | { type: 'RUSH_FINISHED'; score: number }
  | { type: 'PLACEMENT_DONE'; rating: number; level: string }
  | { type: 'DAILY_TASK_DONE'; taskId: string }
  | { type: 'MODULE_COMPLETED'; moduleId: string }
  /** Reto 1 vs 1 del club ya decidido. `won` es null en empate. */
  | { type: 'CHALLENGE_FINISHED'; challengeId: string; won: boolean | null; solved: number; revenge: boolean }
  /** Desafío semanal del club jugado (mismos puzzles para todos). */
  | { type: 'WEEKLY_CHALLENGE_FINISHED'; weekStart: string; solved: number; total: number };

export type GameEventType = GameEvent['type'];

/** Recompensas que la UI muestra (toasts, modal de nivel, confeti). */
export type Reward =
  | { kind: 'xp'; amount: number; reason: string }
  | { kind: 'level-up'; level: number; rankName: string; rankIcon: string; newRank: boolean }
  | { kind: 'achievement'; id: string; title: string; icon: string }
  | { kind: 'quest'; id: string; title: string; xp: number }
  | { kind: 'streak'; days: number }
  | { kind: 'rating'; delta: number; rating: number }
  | { kind: 'daily-complete' };
