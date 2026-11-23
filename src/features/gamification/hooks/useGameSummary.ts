import { todayKey } from '@/lib/date';
import { displayStreak } from '@/services/game/streak';
import { levelProgress, rankForLevel } from '@/services/game/xp';
import { useGameStore } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';

/** Resumen derivado del estado del juego para la UI. */
export function useGameSummary() {
  const xp = useGameStore((s) => s.xp);
  const rating = useGameStore((s) => s.rating);
  const streak = useGameStore((s) => s.streak);
  const daily = useGameStore((s) => s.daily);
  const trainingDays = useSettingsStore((s) => s.trainingDays);
  const today = todayKey();
  const lp = levelProgress(xp);
  return {
    xp,
    rating,
    level: lp.level,
    levelRatio: lp.ratio,
    levelCurrent: lp.current,
    levelNeeded: lp.needed,
    rank: rankForLevel(lp.level),
    streak: displayStreak(streak, today, trainingDays),
    streakBest: streak.best,
    freezes: streak.freezes,
    xpToday: daily.date === today ? daily.xp : 0,
  };
}
