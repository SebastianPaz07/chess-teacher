import type {
  Challenge,
  ChallengeKind,
  ChallengeResult,
  Club,
  ClubWeek,
  DailyActivity,
  FeedComment,
  FeedItem,
  FeedKind,
  LeaderMetric,
  LeaderPeriod,
  LeaderRow,
  Member,
  MemberDetail,
  MemberRole,
  MemberStats,
  MemberSummary,
  Nudge,
  Session,
  WallReply,
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
  /** ¿Puede esta persona crear clubes? Solo el admin de la plataforma o quien llegó por un link de creación. */
  canCreateClub(): Promise<boolean>;
  /** ¿Es administrador de la plataforma? (puede generar links para que otros creen clubes) */
  isAdmin(): Promise<boolean>;
  /** Admin: genera el token del link `/crear-club/:token` para que otra persona cree un club. */
  createClubInvite(): Promise<string>;
  /** Canjea el token de un link de creación; devuelve si es válido. */
  redeemCreatorToken(token: string): Promise<boolean>;
  createClub(name: string): Promise<Club>;
  /** Devuelve el club o lanza un error si el código no existe */
  joinClub(code: string): Promise<Club>;
  leaveClub(): Promise<void>;
  /** Solo el organizador: nombra o quita colaboradores. */
  setMemberRole(memberId: string, role: Exclude<MemberRole, 'owner'>): Promise<void>;
  /** Organizador y colaboradores (estos solo a participantes). */
  removeMember(memberId: string): Promise<void>;

  // Datos del club
  /** Solo nombre, avatar y rol: mucho más ligero que `getMembers` */
  getRoster(): Promise<Member[]>;
  getMembers(): Promise<MemberSummary[]>;
  getMember(id: string): Promise<MemberDetail | null>;
  getLeaderboard(period: LeaderPeriod, metric: LeaderMetric): Promise<LeaderRow[]>;
  getFeed(limit?: number): Promise<FeedItem[]>;

  // Muro: publicaciones, comentarios y «me gusta»
  /** false: el muro es de solo lectura (aún sin tablas en el backend) */
  readonly hasWall: boolean;
  getFeedItem(id: string): Promise<FeedItem | null>;
  createPost(text: string): Promise<FeedItem>;
  /** Solo publicaciones: la propia, o la de otra persona si puedo moderar */
  deletePost(id: string): Promise<void>;
  toggleLike(feedId: string): Promise<void>;
  /** De la más antigua a la más reciente */
  getComments(feedId: string): Promise<FeedComment[]>;
  addComment(feedId: string, text: string): Promise<FeedComment>;
  deleteComment(id: string): Promise<void>;
  /**
   * Marca como leída una entrada con sus respuestas (sin `feedId`, todo el muro).
   * Devuelve true si algo cambió. Opcional: el modo demo no guarda lecturas.
   */
  markWallRead?(feedId?: string): Promise<boolean>;
  /** Respuestas de otras personas en mis entradas o en hilos donde comenté */
  getWallReplies(limit?: number): Promise<WallReply[]>;

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
