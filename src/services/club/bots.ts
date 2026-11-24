import type { Member, MemberStats } from './types';

/** Perfil de comportamiento de un compañero simulado (modo demo). */
export interface BotProfile {
  id: string;
  name: string;
  avatar: string;
  motto: string;
  rating: number;
  /** Probabilidad de practicar un día cualquiera */
  practice: number;
  /** Multiplicador de probabilidad en fin de semana */
  weekend: number;
  /** Hora habitual de práctica (0-23) */
  hour: number;
  xp: [number, number];
  puzzles: [number, number];
  lessonChance: number;
  /** Probabilidad diaria de retarte */
  challengeChance: number;
  /** Probabilidad de animarte si no has practicado por la tarde */
  nudgeChance: number;
  base: { xp: number; lessons: number; puzzles: number; streak: number; best: number };
}

export const BOTS: BotProfile[] = [
  {
    id: 'bot-valentina', name: 'Valentina', avatar: 'piece-queen', motto: 'Un poquito cada mañana.',
    rating: 1080, practice: 0.9, weekend: 0.8, hour: 7, xp: [60, 140], puzzles: [3, 8], lessonChance: 0.35, challengeChance: 0.08, nudgeChance: 0.3,
    base: { xp: 2600, lessons: 16, puzzles: 190, streak: 6, best: 21 },
  },
  {
    id: 'bot-mateo', name: 'Mateo', avatar: 'piece-knight', motto: 'Rétame si te atreves.',
    rating: 1340, practice: 0.7, weekend: 1, hour: 20, xp: [100, 260], puzzles: [6, 15], lessonChance: 0.15, challengeChance: 0.3, nudgeChance: 0.1,
    base: { xp: 3900, lessons: 12, puzzles: 420, streak: 2, best: 11 },
  },
  {
    id: 'bot-sofia', name: 'Sofía', avatar: 'piece-bishop', motto: 'No rompo la racha por nada.',
    rating: 920, practice: 0.97, weekend: 1, hour: 12, xp: [40, 90], puzzles: [2, 5], lessonChance: 0.4, challengeChance: 0.05, nudgeChance: 0.45,
    base: { xp: 1900, lessons: 14, puzzles: 120, streak: 24, best: 24 },
  },
  {
    id: 'bot-andres', name: 'Andrés', avatar: 'piece-rook', motto: 'Los sábados son de ajedrez.',
    rating: 1210, practice: 0.25, weekend: 3.2, hour: 16, xp: [150, 320], puzzles: [8, 18], lessonChance: 0.3, challengeChance: 0.12, nudgeChance: 0.05,
    base: { xp: 2100, lessons: 9, puzzles: 230, streak: 0, best: 5 },
  },
  {
    id: 'bot-camila', name: 'Camila', avatar: 'piece-pawn', motto: 'Empecé hace poco, ¡voy por todo!',
    rating: 760, practice: 0.75, weekend: 0.9, hour: 18, xp: [50, 130], puzzles: [2, 6], lessonChance: 0.7, challengeChance: 0.1, nudgeChance: 0.25,
    base: { xp: 650, lessons: 6, puzzles: 35, streak: 3, best: 4 },
  },
  {
    id: 'bot-ramiro', name: 'Profe Ramiro', avatar: 'piece-king', motto: 'Táctica, táctica y más táctica.',
    rating: 1720, practice: 0.5, weekend: 0.6, hour: 9, xp: [70, 150], puzzles: [4, 10], lessonChance: 0.05, challengeChance: 0.07, nudgeChance: 0.35,
    base: { xp: 5200, lessons: 30, puzzles: 900, streak: 1, best: 40 },
  },
];

/** Nombres de clubes simulados: así un club que te invitan no se llama como su código. */
const DEMO_CLUB_NAMES = ['Club de los jueves', 'Enroque Largo', 'Peones al Poder', 'Los Alfiles', 'Jaque Mate Café', 'Torre y Caballo', 'Gambito del Barrio', 'Zugzwang Social'];
export const demoClubName = (hash: number) => DEMO_CLUB_NAMES[hash % DEMO_CLUB_NAMES.length];

export const botProfile = (id: string) => BOTS.find((b) => b.id === id);

export function botMember(b: BotProfile, joinedAt: string): Member {
  return { id: b.id, name: b.name, avatar: b.avatar, role: b.id === 'bot-ramiro' ? 'owner' : b.id === 'bot-sofia' ? 'manager' : 'member', joinedAt, isBot: true, motto: b.motto };
}

export function emptyStats(nowIso: string): MemberStats {
  return { xp: 0, level: 1, rating: 800, streak: 0, bestStreak: 0, lastActive: null, lessonsCompleted: 0, puzzlesSolved: 0, achievements: 0, modules: {}, updatedAt: nowIso };
}
