import { hashString, seededRandom, shuffle } from '@/lib/random';
import type { GameEvent } from './events';

/** Misiones diarias: plantillas → se eligen 3 por día de forma determinista. */
export interface QuestTemplate {
  id: string;
  title: string;
  icon: string;
  target: number;
  /** Cuánto avanza la misión con este evento */
  progress: (e: GameEvent, xpGained: number) => number;
}

export interface QuestProgress {
  id: string;
  progress: number;
  target: number;
  done: boolean;
}

export const QUEST_TEMPLATES: QuestTemplate[] = [
  { id: 'solve-5', title: 'Resuelve 5 ejercicios', icon: 'puzzle', target: 5, progress: (e) => (e.type === 'PUZZLE_SOLVED' && e.success ? 1 : 0) },
  { id: 'solve-3-clean', title: 'Resuelve 3 ejercicios sin fallar', icon: 'target', target: 3, progress: (e) => (e.type === 'PUZZLE_SOLVED' && e.success && e.mistakes === 0 ? 1 : 0) },
  { id: 'lesson-1', title: 'Completa una lección', icon: 'book-open', target: 1, progress: (e) => (e.type === 'LESSON_COMPLETED' ? 1 : 0) },
  { id: 'perfect-lesson', title: 'Termina una lección sin errores', icon: 'star', target: 1, progress: (e) => (e.type === 'LESSON_COMPLETED' && e.mistakes === 0 ? 1 : 0) },
  { id: 'review-3', title: 'Repasa 3 tarjetas', icon: 'review', target: 3, progress: (e) => (e.type === 'REVIEW_DONE' ? 1 : 0) },
  { id: 'opening-1', title: 'Entrena una línea de apertura', icon: 'books', target: 1, progress: (e) => (e.type === 'OPENING_TRAINED' ? 1 : 0) },
  { id: 'mate-2', title: 'Da 2 jaques mate en ejercicios', icon: 'piece-king', target: 2, progress: (e) => (e.type === 'PUZZLE_SOLVED' && e.success && e.themes.includes('mate') ? 1 : 0) },
  { id: 'rush-5', title: 'Consigue 5+ puntos en Rush táctico', icon: 'lightning', target: 1, progress: (e) => (e.type === 'RUSH_FINISHED' && e.score >= 5 ? 1 : 0) },
  { id: 'xp-150', title: 'Gana 150 XP hoy', icon: 'diamond', target: 150, progress: (_e, xp) => xp },
  { id: 'guess-game', title: 'Practica una partida clásica', icon: 'classic', target: 1, progress: (e) => (e.type === 'GUESS_GAME_FINISHED' ? 1 : 0) },
];

export function questsForDay(dateKey: string, count = 3): QuestProgress[] {
  const rand = seededRandom(hashString(dateKey));
  // Siempre al menos una misión "de estudio" (lección) + 2 aleatorias.
  const [study, ...rest] = [
    QUEST_TEMPLATES.find((q) => q.id === 'lesson-1')!,
    ...shuffle(QUEST_TEMPLATES.filter((q) => q.id !== 'lesson-1'), rand),
  ];
  return [study, ...rest.slice(0, count - 1)].map((q) => ({ id: q.id, progress: 0, target: q.target, done: false }));
}

export const questTemplate = (id: string) => QUEST_TEMPLATES.find((q) => q.id === id);
