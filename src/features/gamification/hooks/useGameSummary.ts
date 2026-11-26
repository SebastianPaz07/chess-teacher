import { useMemo } from 'react';
import { todayKey } from '@/lib/date';
import { consecutiveDays } from '@/services/game/streak';
import { levelProgress, rankForLevel } from '@/services/game/xp';
import { useGameStore } from '@/store/gameStore';

/** Resumen derivado del estado del juego para la UI. */
export function useGameSummary() {
  const xp = useGameStore((s) => s.xp);
  const rating = useGameStore((s) => s.rating);
  const streak = useGameStore((s) => s.streak);
  const daily = useGameStore((s) => s.daily);
  const history = useGameStore((s) => s.history);
  const activityLog = useGameStore((s) => s.activityLog);
  const today = todayKey();
  // Días seguidos jugando (estricto): cada día con actividad suma 1 y uno sin jugar corta la cuenta
  const consecutive = useMemo(() => {
    const days = new Set<string>();
    for (const [d, v] of Object.entries(history ?? {})) if (v > 0) days.add(d);
    for (const [d, a] of Object.entries(activityLog ?? {})) if (a.puzzles || a.lessons || a.reviews || a.seconds) days.add(d);
    if (streak.lastActive) days.add(streak.lastActive);
    return consecutiveDays(days, today);
  }, [history, activityLog, streak.lastActive, today]);
  const lp = levelProgress(xp);
  return {
    xp,
    rating,
    level: lp.level,
    levelRatio: lp.ratio,
    levelCurrent: lp.current,
    levelNeeded: lp.needed,
    rank: rankForLevel(lp.level),
    streak: consecutive,
    streakBest: streak.best,
    freezes: streak.freezes,
    xpToday: daily.date === today ? daily.xp : 0,
  };
}
