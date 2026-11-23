import { ACHIEVEMENTS, initialStats, type GameStats } from './achievements';
import type { GameEvent, Reward } from './events';
import { questsForDay, questTemplate, type QuestProgress } from './quests';
import { INITIAL_RATING, updateRating } from './rating';
import { initialStreak, registerActivity, type StreakState } from './streak';
import { XP, levelFromXp, rankForLevel } from './xp';

export interface DailyState {
  date: string;
  quests: QuestProgress[];
  tasksDone: string[];
  xp: number;
  completeRewarded: boolean;
}

/** Contadores por día (para metas del club y rankings semanales). */
export interface DayActivity {
  puzzles: number;
  lessons: number;
  reviews: number;
  /** Segundos de estudio activo (con la app visible y en una pantalla de práctica) */
  seconds?: number;
}

export interface GameState {
  xp: number;
  rating: number;
  ratingGames: number;
  streak: StreakState;
  stats: GameStats;
  achievements: Record<string, string>;
  daily: DailyState;
  /** XP ganada por día (calendario de actividad) */
  history: Record<string, number>;
  /** Ejercicios / lecciones / repasos por día */
  activityLog: Record<string, DayActivity>;
}

export const initialGameState = (today: string): GameState => ({
  xp: 0,
  rating: INITIAL_RATING,
  ratingGames: 0,
  streak: initialStreak,
  stats: initialStats,
  achievements: {},
  daily: freshDaily(today),
  history: {},
  activityLog: {},
});

export const freshDaily = (date: string): DailyState => ({
  date,
  quests: questsForDay(date),
  tasksDone: [],
  xp: 0,
  completeRewarded: false,
});

/** XP base que otorga un evento (sin misiones). */
function baseXp(e: GameEvent): { amount: number; reason: string } {
  switch (e.type) {
    case 'LESSON_COMPLETED':
      return { amount: e.xp + (e.mistakes === 0 ? XP.perfectLessonBonus : 0), reason: e.mistakes === 0 ? 'Lección perfecta' : 'Lección completada' };
    case 'PUZZLE_SOLVED':
      if (!e.success || e.context === 'placement' || e.context === 'rush') return { amount: 0, reason: '' };
      return { amount: XP.puzzleSolved + (e.mistakes === 0 ? XP.puzzleFirstTry : 0), reason: 'Ejercicio resuelto' };
    case 'REVIEW_DONE':
      return { amount: e.success ? XP.reviewCard : 2, reason: 'Repaso' };
    case 'OPENING_TRAINED':
      return { amount: Math.max(5, XP.openingLine - e.mistakes * 5), reason: 'Línea de apertura' };
    case 'GUESS_GAME_FINISHED':
      return { amount: e.correct * XP.guessMove, reason: 'Partida clásica' };
    case 'RUSH_FINISHED':
      return { amount: e.score * XP.rushPerPoint, reason: 'Rush táctico' };
    case 'PLACEMENT_DONE':
      return { amount: XP.placement, reason: 'Test de nivel' };
    case 'CHALLENGE_FINISHED':
      return e.won
        ? { amount: XP.challengePlayed + XP.challengeWon, reason: e.revenge ? '¡Revancha ganada!' : 'Reto ganado' }
        : { amount: XP.challengePlayed, reason: e.won === null ? 'Reto empatado' : 'Reto del club' };
    case 'WEEKLY_CHALLENGE_FINISHED':
      return { amount: Math.max(10, e.solved * XP.weeklyPerPuzzle), reason: 'Desafío semanal' };
    default:
      return { amount: 0, reason: '' };
  }
}

function updateStats(s: GameStats, e: GameEvent): GameStats {
  switch (e.type) {
    case 'LESSON_COMPLETED':
      return { ...s, lessonsCompleted: s.lessonsCompleted + 1, perfectLessons: s.perfectLessons + (e.mistakes === 0 ? 1 : 0) };
    case 'PUZZLE_SOLVED': {
      const themeSolved = { ...s.themeSolved };
      if (e.success) for (const t of e.themes) themeSolved[t] = (themeSolved[t] ?? 0) + 1;
      return {
        ...s,
        puzzlesAttempted: s.puzzlesAttempted + 1,
        puzzlesSolved: s.puzzlesSolved + (e.success ? 1 : 0),
        cleanPuzzles: s.cleanPuzzles + (e.success && e.mistakes === 0 ? 1 : 0),
        mates: s.mates + (e.success && e.themes.includes('mate') ? 1 : 0),
        themeSolved,
      };
    }
    case 'REVIEW_DONE':
      return { ...s, reviewsDone: s.reviewsDone + 1 };
    case 'OPENING_TRAINED':
      return { ...s, openingLines: s.openingLines + 1 };
    case 'GUESS_GAME_FINISHED':
      return { ...s, guessGames: s.guessGames + 1 };
    case 'RUSH_FINISHED':
      return { ...s, rushPlayed: s.rushPlayed + 1, rushBest: Math.max(s.rushBest, e.score) };
    case 'PLACEMENT_DONE':
      return { ...s, placementDone: true };
    case 'MODULE_COMPLETED':
      return s.modulesCompleted.includes(e.moduleId) ? s : { ...s, modulesCompleted: [...s.modulesCompleted, e.moduleId] };
    case 'CHALLENGE_FINISHED':
      return {
        ...s,
        challengesPlayed: (s.challengesPlayed ?? 0) + 1,
        challengesWon: (s.challengesWon ?? 0) + (e.won ? 1 : 0),
        revengeWins: (s.revengeWins ?? 0) + (e.won && e.revenge ? 1 : 0),
      };
    case 'WEEKLY_CHALLENGE_FINISHED':
      return { ...s, weeklyChallenges: (s.weeklyChallenges ?? 0) + 1 };
    default:
      return s;
  }
}

/**
 * Motor de juego puro: (estado, evento, hoy) → (nuevo estado, recompensas).
 * Sin efectos secundarios → fácil de testear y de mover a un backend.
 */
export function applyEvent(prev: GameState, e: GameEvent, today: string, extra?: { dailyTotal?: number; trainingDays?: number[] }): { state: GameState; rewards: Reward[] } {
  const rewards: Reward[] = [];
  let state: GameState = { ...prev, daily: prev.daily.date === today ? prev.daily : freshDaily(today) };
  let gained = 0;

  // 1. XP base
  // El test de nivel solo da XP la primera vez (recalibrar no suma)
  const base = e.type === 'PLACEMENT_DONE' && prev.stats.placementDone ? { amount: 0, reason: '' } : baseXp(e);
  if (base.amount > 0) {
    gained += base.amount;
    rewards.push({ kind: 'xp', amount: base.amount, reason: base.reason });
  }

  // 2. Estadísticas (+ contadores del día)
  state.stats = updateStats(state.stats, e);
  const day = state.activityLog?.[today] ?? { puzzles: 0, lessons: 0, reviews: 0 };
  const dayNext = {
    ...day,
    puzzles: day.puzzles + (e.type === 'PUZZLE_SOLVED' && e.success && e.context !== 'placement' ? 1 : 0),
    lessons: day.lessons + (e.type === 'LESSON_COMPLETED' ? 1 : 0),
    reviews: day.reviews + (e.type === 'REVIEW_DONE' ? 1 : 0),
  };
  state.activityLog = { ...(state.activityLog ?? {}), [today]: dayNext };

  // 3. Rating
  if (e.type === 'PUZZLE_SOLVED' && e.context !== 'placement') {
    // Para el rating solo cuenta resolverlo a la primera, sin pistas (como en Lichess)
    const clean = e.success && e.mistakes === 0 && !e.hintsUsed;
    const { rating, delta } = updateRating(state.rating, e.puzzleRating, clean, state.ratingGames);
    state.rating = rating;
    state.ratingGames += 1;
    rewards.push({ kind: 'rating', delta, rating });
  }
  if (e.type === 'PLACEMENT_DONE') {
    state.rating = e.rating;
    state.ratingGames = 5;
  }

  // 4. Racha (cualquier actividad cuenta)
  const streak = registerActivity(state.streak, today, extra?.trainingDays);
  state.streak = streak.state;
  if (streak.increased) rewards.push({ kind: 'streak', days: streak.state.current });

  // 5. Tareas del plan diario
  if (e.type === 'DAILY_TASK_DONE' && !state.daily.tasksDone.includes(e.taskId)) {
    state.daily = { ...state.daily, tasksDone: [...state.daily.tasksDone, e.taskId] };
    if (extra?.dailyTotal && state.daily.tasksDone.length >= extra.dailyTotal && !state.daily.completeRewarded) {
      state.daily = { ...state.daily, completeRewarded: true };
      state.stats = { ...state.stats, dailyPlansCompleted: state.stats.dailyPlansCompleted + 1 };
      gained += XP.dailyPlanComplete;
      rewards.push({ kind: 'daily-complete' }, { kind: 'xp', amount: XP.dailyPlanComplete, reason: 'Sesión del día completa' });
    }
  }

  // 6. Misiones
  const quests = state.daily.quests.map((q) => {
    if (q.done) return q;
    const tpl = questTemplate(q.id);
    if (!tpl) return q;
    const progress = Math.min(q.target, q.progress + tpl.progress(e, gained));
    const done = progress >= q.target;
    if (done) {
      gained += XP.questReward;
      rewards.push({ kind: 'quest', id: q.id, title: tpl.title, xp: XP.questReward });
    }
    return { ...q, progress, done };
  });
  state.daily = { ...state.daily, quests, xp: state.daily.xp + gained };

  // 7. XP y nivel
  const prevLevel = levelFromXp(state.xp);
  state.xp += gained;
  state.history = { ...state.history, [today]: (state.history[today] ?? 0) + gained };
  const newLevel = levelFromXp(state.xp);
  if (newLevel > prevLevel) {
    const rank = rankForLevel(newLevel);
    rewards.push({ kind: 'level-up', level: newLevel, rankName: rank.name, rankIcon: rank.icon, newRank: rank.id !== rankForLevel(prevLevel).id });
  }

  // 8. Logros
  const ctx = { stats: state.stats, streakBest: state.streak.best, level: newLevel, rating: state.rating };
  const unlocked = { ...state.achievements };
  for (const a of ACHIEVEMENTS) {
    if (!unlocked[a.id] && a.check(ctx)) {
      unlocked[a.id] = today;
      rewards.push({ kind: 'achievement', id: a.id, title: a.title, icon: a.icon });
    }
  }
  state.achievements = unlocked;

  return { state, rewards };
}
