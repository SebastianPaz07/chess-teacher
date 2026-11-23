import type { Module } from '@/content/schema';
import type { GameState } from '@/services/game/engine';
import { levelFromXp } from '@/services/game/xp';
import { moduleCompletion, type ProgressSnapshot } from '@/services/scheduler/progression';
import { addDays } from '@/lib/date';
import type { DailyActivity, MemberStats } from './types';

type GameSlice = Pick<GameState, 'xp' | 'rating' | 'streak' | 'stats' | 'achievements' | 'history' | 'activityLog'>;

/** Estado local del jugador → cifras públicas que ve el club. */
export function toMemberStats(game: GameSlice, progress: ProgressSnapshot, modules: Module[], nowIso: string): MemberStats {
  const mods: Record<string, number> = {};
  for (const m of modules) mods[m.id] = Math.round(moduleCompletion(m, progress) * 100) / 100;
  return {
    xp: game.xp,
    level: levelFromXp(game.xp),
    rating: game.rating,
    streak: game.streak.current,
    bestStreak: game.streak.best,
    lastActive: game.streak.lastActive,
    lessonsCompleted: game.stats.lessonsCompleted,
    puzzlesSolved: game.stats.puzzlesSolved,
    achievements: Object.keys(game.achievements).length,
    modules: mods,
    updatedAt: nowIso,
  };
}

/** Actividad por día de los últimos `days` días (XP del historial + contadores). */
export function toDailyActivity(game: GameSlice, today: string, days = 60): DailyActivity[] {
  const from = addDays(today, -(days - 1));
  const keys = new Set([...Object.keys(game.history), ...Object.keys(game.activityLog ?? {})]);
  return [...keys]
    .filter((d) => d >= from && d <= today)
    .sort()
    .map((day) => {
      const log = game.activityLog?.[day];
      return { day, xp: game.history[day] ?? 0, puzzles: log?.puzzles ?? 0, lessons: log?.lessons ?? 0, reviews: log?.reviews ?? 0, minutes: Math.round((log?.seconds ?? 0) / 60) };
    })
    .filter((a) => a.xp > 0 || a.puzzles > 0 || a.lessons > 0 || a.reviews > 0 || a.minutes > 0);
}
