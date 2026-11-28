/**
 * Tipos de dominio del club. Están pensados para mapear 1:1 con las tablas
 * que tendrá Supabase (profiles, clubs, club_members, player_stats,
 * daily_activity, activity_feed, challenges, challenge_results, nudges,
 * club_weeks, club_week_results).
 */

export interface Session {
  userId: string;
  email: string;
}

export interface Club {
  id: string;
  name: string;
  inviteCode: string;
  createdBy: string;
  createdAt: string;
}

/** owner = organizador del club; manager = colaborador que ayuda a gestionarlo; member = participante. */
export type MemberRole = 'owner' | 'manager' | 'member';

export interface Member {
  id: string;
  name: string;
  /** Icono de pieza del avatar (piece-knight, piece-rook…) */
  avatar: string;
  role: MemberRole;
  joinedAt: string;
  /** Solo en el modo demo: compañero simulado */
  isBot?: boolean;
  /** Frase corta que aparece en su perfil */
  motto?: string;
}

export interface MemberStats {
  xp: number;
  level: number;
  rating: number;
  /** Racha guardada (la visible se calcula con lastActive) */
  streak: number;
  bestStreak: number;
  lastActive: string | null;
  lessonsCompleted: number;
  puzzlesSolved: number;
  achievements: number;
  /** Avance por módulo 0..1 */
  modules: Record<string, number>;
  updatedAt: string;
}

export interface DailyActivity {
  day: string;
  xp: number;
  puzzles: number;
  lessons: number;
  reviews: number;
  /** Minutos de estudio activo */
  minutes: number;
}

export type FeedKind = 'post' | 'joined' | 'lesson' | 'module' | 'achievement' | 'level' | 'streak' | 'rush' | 'challenge' | 'nudge' | 'week-goal' | 'weekly' | 'practice';

export interface FeedItem {
  id: string;
  memberId: string;
  kind: FeedKind;
  icon: string;
  /** Actividad: texto sin el nombre («completó la lección…»). Publicación (`post`): el mensaje */
  text: string;
  createdAt: string;
  /** Reacciones y respuestas (solo si el repositorio tiene muro) */
  likes?: number;
  likedByMe?: boolean;
  commentCount?: number;
  /** Publicación de otra persona que aún no he leído */
  isNew?: boolean;
  /** Respuestas de otras personas que aún no he leído */
  newReplies?: number;
}

/** Respuesta en el hilo de una publicación o de una actividad */
export interface FeedComment {
  id: string;
  feedId: string;
  memberId: string;
  text: string;
  createdAt: string;
  /** Aún no la he leído */
  isNew?: boolean;
}

/** Respuesta de otra persona que me interesa (para la campana) */
export interface WallReply extends FeedComment {
  /** true: la entrada es mía; false: es un hilo en el que participé */
  onMine: boolean;
}

export type ChallengeKind = 'puzzles' | 'rush';
export type ChallengeStatus = 'open' | 'done' | 'declined' | 'expired';

export interface ChallengeResult {
  memberId: string;
  solved: number;
  mistakes: number;
  timeMs: number;
  finishedAt: string;
}

export interface Challenge {
  id: string;
  challengerId: string;
  opponentId: string;
  kind: ChallengeKind;
  puzzleIds: string[];
  status: ChallengeStatus;
  createdAt: string;
  expiresAt: string;
  results: ChallengeResult[];
  /** null = empate; undefined = sin decidir */
  winnerId?: string | null;
  rematchOf?: string;
}

export interface Nudge {
  id: string;
  fromId: string;
  toId: string;
  day: string;
  createdAt: string;
  read: boolean;
}

export type WeekMetric = 'puzzles' | 'minutes' | 'xp' | 'lessons';

export interface WeekResult {
  memberId: string;
  solved: number;
  timeMs: number;
  finishedAt: string;
}

export interface ClubWeek {
  weekStart: string;
  metric: WeekMetric;
  target: number;
  progress: number;
  /** Aporte de cada miembro a la meta */
  contributions: Record<string, number>;
  puzzleIds: string[];
  results: WeekResult[];
  /** Semanas anteriores con la meta cumplida */
  goalsMet: number;
}

export type LeaderPeriod = 'week' | 'all';
export type LeaderMetric = 'puzzles' | 'minutes' | 'xp' | 'rating' | 'streak';

export interface LeaderRow {
  member: Member;
  value: number;
  rank: number;
  /** Puesto de ayer (para la flecha ↑↓) */
  prevRank: number | null;
}

/** Miembro con sus cifras ya calculadas para hoy. */
export interface MemberSummary {
  member: Member;
  stats: MemberStats;
  /** Racha visible hoy (0 si la perdió) */
  streak: number;
  practicedToday: boolean;
  weekXp: number;
  weekPuzzles: number;
  weekMinutes: number;
}

export interface MemberDetail extends MemberSummary {
  activity: DailyActivity[];
}
