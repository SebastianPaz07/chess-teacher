/** Niveles, rangos y recompensas de XP. */

export interface Rank {
  id: string;
  name: string;
  icon: string;
  minLevel: number;
}

export const RANKS: Rank[] = [
  { id: 'peon', name: 'Peón', icon: 'piece-pawn', minLevel: 1 },
  { id: 'caballo', name: 'Caballo', icon: 'piece-knight', minLevel: 3 },
  { id: 'alfil', name: 'Alfil', icon: 'piece-bishop', minLevel: 5 },
  { id: 'torre', name: 'Torre', icon: 'piece-rook', minLevel: 8 },
  { id: 'dama', name: 'Dama', icon: 'piece-queen', minLevel: 11 },
  { id: 'rey', name: 'Rey', icon: 'piece-king', minLevel: 15 },
  { id: 'maestro', name: 'Maestro', icon: 'crown', minLevel: 20 },
];

/** XP total necesaria para alcanzar el nivel L: 50·L·(L−1) → 0, 100, 300, 600, 1000… */
export const xpForLevel = (level: number) => 50 * level * (level - 1);

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}

export function levelProgress(xp: number) {
  const level = levelFromXp(xp);
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, current: xp - base, needed: next - base, ratio: (xp - base) / (next - base) };
}

export function rankForLevel(level: number): Rank {
  return [...RANKS].reverse().find((r) => level >= r.minLevel) ?? RANKS[0];
}

export const XP = {
  lessonBase: 50,
  perfectLessonBonus: 25,
  puzzleSolved: 15,
  puzzleFirstTry: 10,
  reviewCard: 8,
  openingLine: 20,
  guessMove: 5,
  rushPerPoint: 4,
  questReward: 40,
  dailyPlanComplete: 60,
  placement: 100,
  challengePlayed: 30,
  challengeWon: 50,
  weeklyPerPuzzle: 10,
} as const;

/** Multiplicador por combo de aciertos seguidos. */
export function comboMultiplier(combo: number): number {
  if (combo >= 8) return 3;
  if (combo >= 4) return 2;
  return 1;
}
