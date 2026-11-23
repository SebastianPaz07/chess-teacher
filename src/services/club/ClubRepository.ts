import type {
  Challenge,
  ChallengeKind,
  ChallengeResult,
  Club,
  ClubWeek,
  DailyActivity,
  FeedItem,
  FeedKind,
  LeaderMetric,
  LeaderPeriod,
  LeaderRow,
  MemberDetail,
  MemberStats,
  MemberSummary,
  Nudge,
  Session,
  WeekResult,
} from './types';

export interface MyProfile {
  name: string;
  avatar: string;
}

/**
 * Contrato entre la UI social y el backend. Hoy lo implementa un mock en
 * localStorage (compañeros simulados); mañana `supabaseRepository`.
 * Todo es asíncrono para que el cambio no toque la UI.
 */
export interface ClubRepository {
  /** Modo demo (compañeros simulados) */
  readonly isDemo: boolean;

  // Sesión
  getSession(): Promise<Session | null>;
  /** Envía el enlace mágico. En el mock, la sesión queda lista al confirmar. */
  requestMagicLink(email: string): Promise<void>;
  confirmMagicLink(email: string): Promise<Session>;
  signOut(): Promise<void>;

  // Perfil y club
  getMyProfile(): Promise<MyProfile | null>;
  saveMyProfile(p: MyProfile): Promise<void>;
  getMyClub(): Promise<Club | null>;
  createClub(name: string): Promise<Club>;
  /** Devuelve el club o lanza un error si el código no existe */
  joinClub(code: string): Promise<Club>;
  leaveClub(): Promise<void>;

  // Datos del club
  getMembers(): Promise<MemberSummary[]>;
  getMember(id: string): Promise<MemberDetail | null>;
  getLeaderboard(period: LeaderPeriod, metric: LeaderMetric): Promise<LeaderRow[]>;
  getFeed(limit?: number): Promise<FeedItem[]>;

  // Publicar mi progreso
  publishMyProgress(p: { stats: MemberStats; activity: DailyActivity[] }): Promise<void>;
  postFeed(item: { kind: FeedKind; icon: string; text: string }): Promise<void>;

  // Ánimos
  sendNudge(toId: string): Promise<void>;
  getNudges(): Promise<Nudge[]>;
  markNudgesRead(): Promise<void>;

  // Retos
  listChallenges(): Promise<Challenge[]>;
  getChallenge(id: string): Promise<Challenge | null>;
  createChallenge(opponentId: string, kind: ChallengeKind, rematchOf?: string): Promise<Challenge>;
  declineChallenge(id: string): Promise<void>;
  submitChallengeResult(id: string, r: Omit<ChallengeResult, 'memberId' | 'finishedAt'>): Promise<Challenge>;

  // Semana del club
  getClubWeek(): Promise<ClubWeek>;
  submitWeekResult(r: Omit<WeekResult, 'memberId' | 'finishedAt'>): Promise<ClubWeek>;

  /** Cambios en los datos (feed nuevo, reto respondido…). Supabase: realtime. */
  subscribe(cb: () => void): () => void;
}
