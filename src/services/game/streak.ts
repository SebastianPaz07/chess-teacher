import { addDays, diffDays } from '@/lib/date';

export interface StreakState {
  current: number;
  best: number;
  lastActive: string | null;
  freezes: number;
}

export const initialStreak: StreakState = { current: 0, best: 0, lastActive: null, freezes: 0 };
export const MAX_FREEZES = 2;

const dow = (dateKey: string) => {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
};

/**
 * Días de entrenamiento que se saltaron entre `from` y `to` (ambos excluidos).
 * Los días de descanso del plan no rompen la racha.
 */
export function missedTrainingDays(from: string, to: string, trainingDays?: number[]): number {
  const gap = diffDays(from, to);
  if (gap <= 1) return 0;
  if (!trainingDays || trainingDays.length === 0 || trainingDays.length === 7) return gap - 1;
  let missed = 0;
  for (let i = 1; i < gap; i++) if (trainingDays.includes(dow(addDays(from, i)))) missed++;
  return missed;
}

/**
 * Registra actividad hoy. Si se saltó exactamente un día y hay protector,
 * se consume y la racha sigue. Cada 7 días de racha se gana un protector.
 */
export function registerActivity(s: StreakState, today: string, trainingDays?: number[]): { state: StreakState; increased: boolean; usedFreeze: boolean } {
  if (s.lastActive === today) return { state: s, increased: false, usedFreeze: false };
  const missed = s.lastActive ? missedTrainingDays(s.lastActive, today, trainingDays) : Infinity;
  let current = 1;
  let freezes = s.freezes;
  let usedFreeze = false;
  if (missed === 0) current = s.current + 1;
  else if (missed === 1 && freezes > 0) {
    current = s.current + 1;
    freezes -= 1;
    usedFreeze = true;
  }
  if (current > 0 && current % 7 === 0) freezes = Math.min(MAX_FREEZES, freezes + 1);
  return {
    state: { current, best: Math.max(s.best, current), lastActive: today, freezes },
    increased: true,
    usedFreeze,
  };
}

/** Racha "visible": si pasaron 2+ días sin actividad (y sin protector), se muestra en 0. */
export function displayStreak(s: StreakState, today: string, trainingDays?: number[]): number {
  if (!s.lastActive) return 0;
  const missed = missedTrainingDays(s.lastActive, today, trainingDays);
  if (missed === 0) return s.current;
  if (missed === 1 && s.freezes > 0) return s.current;
  return 0;
}
