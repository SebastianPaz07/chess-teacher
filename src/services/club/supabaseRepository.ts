import type { SupabaseClient } from '@supabase/supabase-js';
import { addDays, toDateKey, weekStart } from '@/lib/date';
import { storage } from '@/services/storage/localStorageAdapter';
import { emptyStats } from './bots';
import { pickChallengePuzzles, pickWeeklyPuzzles } from './challenges';
import type { ClubRepository, MyProfile } from './ClubRepository';
import { cleanWallText, computeLeaderboard, sumActivity, visibleStreak, weeklyGoal, type LeaderInput } from './logic';
import { createRequestCache } from './requestCache';
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
  Member,
  MemberDetail,
  MemberRole,
  MemberStats,
  MemberSummary,
  Nudge,
  Session,
  WallReply,
  WeekMetric,
  WeekResult,
} from './types';

/** Puzzle mínimo para armar retos (igual que en el mock) */
export interface PoolPuzzle {
  id: string;
  rating: number;
  solution: string[];
}

export interface SupabaseDeps {
  client: SupabaseClient;
  /** Fecha "de juego" (respeta el desfase de días de depuración) */
  now: () => Date;
  pool: () => Promise<PoolPuzzle[]>;
}

const CHALLENGE_TTL_HOURS = 72;
const ACTIVITY_DAYS = 60;
/** Huella del último progreso enviado: si no cambió, no se vuelve a escribir */
const PUBLISHED_KEY = 'chess-cache:published';

/** Cuánto se reutiliza cada lectura. Un cambio propio o un aviso en vivo la descartan antes. */
const TTL = {
  club: 5 * 60_000,
  profile: 5 * 60_000,
  admin: 10 * 60_000,
  roster: 5 * 60_000,
  inputs: 2 * 60_000,
  week: 2 * 60_000,
  feed: 60_000,
  comments: 60_000,
  replies: 60_000,
  challenges: 60_000,
  nudges: 60_000,
};

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

// Cliente sin tipos generados: las filas se leen como `Row` y se mapean a los tipos de dominio.
function unwrap(r: { data: unknown; error: { message: string } | null }): any { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (r.error) throw new Error(r.error.message);
  return r.data;
}

const toClub = (r: Row): Club => ({ id: r.id, name: r.name, inviteCode: r.invite_code, createdBy: r.created_by, createdAt: r.created_at });

const toStats = (r: Row | undefined, nowIso: string): MemberStats =>
  r
    ? {
        xp: r.xp,
        level: r.level,
        rating: r.rating,
        streak: r.streak,
        bestStreak: r.best_streak,
        lastActive: r.last_active,
        lessonsCompleted: r.lessons_completed,
        puzzlesSolved: r.puzzles_solved,
        achievements: r.achievements,
        modules: r.modules ?? {},
        updatedAt: r.updated_at,
      }
    : emptyStats(nowIso);

const toActivity = (r: Row): DailyActivity => ({ day: r.day, xp: r.xp, puzzles: r.puzzles, lessons: r.lessons, reviews: r.reviews, minutes: r.minutes });

const toFeedItem = (r: Row): FeedItem => ({ id: r.id, memberId: r.user_id, kind: r.kind, icon: r.icon, text: r.text, createdAt: r.created_at });
const toComment = (r: Row): FeedComment => ({ id: r.id, feedId: r.feed_id, memberId: r.user_id, text: r.text, createdAt: r.created_at });

/** La tabla o función no existe: falta ejecutar la migración del muro */
const notInstalled = (error: { code?: string } | null) => ['PGRST202', 'PGRST205', '42883', '42P01'].includes(error?.code ?? '');

export function createSupabaseRepository(deps: SupabaseDeps): ClubRepository {
  const sb = deps.client;
  const today = () => toDateKey(deps.now());
  const nowIso = () => deps.now().toISOString();
  const listeners = new Set<() => void>();
  const cache = createRequestCache();
  /** Tras un cambio propio: se descarta lo guardado y se avisa a las pantallas */
  const notify = () => {
    cache.invalidate();
    listeners.forEach((cb) => cb());
  };

  /** Un cambio en el muro no obliga a volver a pedir miembros, retos, etc. */
  const wallChanged = () => {
    cache.invalidate('feed', 'comments', 'replies');
    listeners.forEach((cb) => cb());
  };
  /** false si la base de datos aún no tiene las tablas del muro: se muestra solo la actividad */
  let wallInstalled = true;

  async function me(): Promise<string> {
    const { data } = await sb.auth.getSession();
    const id = data.session?.user.id;
    if (!id) throw new Error('Inicia sesión primero');
    return id;
  }

  /** Mi club (o null). Se descarta todo al crear, unirse o salir de un club. */
  const forgetClub = () => cache.invalidate();
  async function myClubRow(): Promise<Row | null> {
    const id = await me();
    return cache.get(`club:${id}`, TTL.club, async () => {
      const m = unwrap(await sb.from('club_members').select('club_id').eq('user_id', id).maybeSingle());
      if (!m) return null;
      return unwrap(await sb.from('clubs').select('*').eq('id', m.club_id).maybeSingle()) as Row | null;
    });
  }

  async function requireClub(): Promise<Club> {
    const row = await myClubRow();
    if (!row) throw new Error('Primero únete a un club');
    return toClub(row);
  }

  async function loadMembers(clubId: string): Promise<Member[]> {
    const ms = unwrap(await sb.from('club_members').select('user_id, role, joined_at').eq('club_id', clubId)) as Row[];
    const ids = ms.map((m) => m.user_id);
    const profiles = ids.length ? (unwrap(await sb.from('profiles').select('id, name, avatar, motto').in('id', ids)) as Row[]) : [];
    const byId = new Map(profiles.map((p) => [p.id as string, p]));
    return ms.map((m) => {
      const p = byId.get(m.user_id);
      return { id: m.user_id, name: p?.name ?? 'Jugador', avatar: p?.avatar ?? 'piece-knight', role: m.role as MemberRole, joinedAt: m.joined_at, motto: p?.motto ?? undefined };
    });
  }

  const loadRoster = (clubId: string) => cache.get(`roster:${clubId}`, TTL.roster, () => loadMembers(clubId));

  const loadInputs = (clubId: string) => cache.get(`inputs:${clubId}:${today()}`, TTL.inputs, () => fetchInputs(clubId));

  async function fetchInputs(clubId: string): Promise<LeaderInput[]> {
    const members = await loadRoster(clubId);
    const ids = members.map((m) => m.id);
    const from = addDays(today(), -ACTIVITY_DAYS);
    const [stats, acts] = await Promise.all([
      sb.from('player_stats').select('*').in('user_id', ids),
      sb.from('daily_activity').select('*').in('user_id', ids).gte('day', from),
    ]);
    const statRows = unwrap(stats) as Row[];
    const actRows = unwrap(acts) as Row[];
    return members.map((member) => ({
      member,
      stats: toStats(
        statRows.find((s) => s.user_id === member.id),
        nowIso(),
      ),
      activity: actRows.filter((a) => a.user_id === member.id).map(toActivity),
    }));
  }

  function summarize(x: LeaderInput): MemberSummary {
    const t = today();
    const ws = weekStart(t);
    return {
      member: x.member,
      stats: x.stats,
      streak: visibleStreak(x.stats, t),
      practicedToday: x.stats.lastActive === t || x.activity.some((a) => a.day === t),
      weekXp: sumActivity(x.activity, ws, t, 'xp'),
      weekPuzzles: sumActivity(x.activity, ws, t, 'puzzles'),
      weekMinutes: sumActivity(x.activity, ws, t, 'minutes'),
    };
  }

  async function postFeedRow(clubId: string, userId: string, kind: FeedKind, icon: string, text: string) {
    unwrap(await sb.from('activity_feed').insert({ club_id: clubId, user_id: userId, kind, icon, text }));
  }

  /** Añade «me gusta», respuestas y lo no leído a las entradas (una sola consulta) */
  async function withSocial(items: FeedItem[]): Promise<FeedItem[]> {
    if (!items.length) return items;
    const res = await sb.rpc('wall_social', { p_ids: items.map((f) => f.id) });
    wallInstalled = !notInstalled(res.error);
    if (!wallInstalled) return items.filter((f) => f.kind !== 'post');
    const social = new Map((unwrap(res) as Row[]).map((s) => [s.feed_id as string, s]));
    return items.map((f) => {
      const s = social.get(f.id);
      return { ...f, likes: s?.likes ?? 0, likedByMe: s?.liked_by_me ?? false, commentCount: s?.comment_count ?? 0, isNew: s?.is_new ?? false, newReplies: s?.new_replies ?? 0 };
    });
  }

  async function memberName(id: string): Promise<string> {
    const p = unwrap(await sb.from('profiles').select('name').eq('id', id).maybeSingle());
    return p?.name ?? 'tu compañero';
  }

  function toChallenge(r: Row, results: Row[]): Challenge {
    const done = r.status === 'done';
    const expired = r.status === 'open' && new Date(r.expires_at).getTime() < deps.now().getTime();
    return {
      id: r.id,
      challengerId: r.challenger_id,
      opponentId: r.opponent_id,
      kind: r.kind,
      puzzleIds: r.puzzle_ids ?? [],
      status: expired ? 'expired' : r.status,
      createdAt: r.created_at,
      expiresAt: r.expires_at,
      results: results.map((x): ChallengeResult => ({ memberId: x.user_id, solved: x.solved, mistakes: x.mistakes, timeMs: x.time_ms, finishedAt: x.finished_at })),
      winnerId: done ? (r.winner_id ?? null) : undefined,
      rematchOf: r.rematch_of ?? undefined,
    };
  }

  async function fetchChallenges(filter: (q: ReturnType<typeof baseQuery>) => ReturnType<typeof baseQuery>): Promise<Challenge[]> {
    const rows = unwrap(await filter(baseQuery())) as Row[];
    if (!rows.length) return [];
    const res = unwrap(await sb.from('challenge_results').select('*').in('challenge_id', rows.map((r) => r.id))) as Row[];
    return rows.map((r) => toChallenge(r, res.filter((x) => x.challenge_id === r.id)));
  }
  const baseQuery = () => sb.from('challenges').select('*').order('created_at', { ascending: false });

  /** La semana actual: la primera persona que entra la crea (meta + ejercicios fijos para todo el club) */
  async function ensureWeek(club: Club): Promise<Row> {
    const ws = weekStart(today());
    const existing = unwrap(await sb.from('club_weeks').select('*').eq('club_id', club.id).eq('week_start', ws).maybeSingle());
    if (existing) return existing;
    const inputs = await loadInputs(club.id);
    const prevWs = addDays(ws, -7);
    const prev = unwrap(await sb.from('club_weeks').select('*').eq('club_id', club.id).eq('week_start', prevWs).maybeSingle());
    const { metric } = weeklyGoal(club.id, ws, inputs.length, null);
    const lastTotal = prev ? inputs.reduce((acc, x) => acc + sumActivity(x.activity, prevWs, addDays(prevWs, 6), metric), 0) : null;
    const goal = weeklyGoal(club.id, ws, inputs.length, lastTotal);
    const avg = Math.round(inputs.reduce((a, x) => a + x.stats.rating, 0) / Math.max(1, inputs.length));
    const pool = await deps.pool();
    await sb
      .from('club_weeks')
      .upsert({ club_id: club.id, week_start: ws, metric: goal.metric, target: goal.target, puzzle_ids: pickWeeklyPuzzles(pool, club.id, ws, avg) }, { onConflict: 'club_id,week_start', ignoreDuplicates: true });
    return unwrap(await sb.from('club_weeks').select('*').eq('club_id', club.id).eq('week_start', ws).single());
  }

  async function fetchWeek(club: Club): Promise<ClubWeek> {
    const wk = await ensureWeek(club);
    const ws = wk.week_start as string;
    const metric = wk.metric as WeekMetric;
    const [inputs, results, past] = await Promise.all([
      loadInputs(club.id),
      sb.from('club_week_results').select('*').eq('club_id', club.id).eq('week_start', ws),
      sb.from('club_weeks').select('week_start, metric, target').eq('club_id', club.id).lt('week_start', ws),
    ]);
    const contributions: Record<string, number> = {};
    let progress = 0;
    for (const x of inputs) {
      const v = sumActivity(x.activity, ws, addDays(ws, 6), metric);
      contributions[x.member.id] = v;
      progress += v;
    }
    // Semanas anteriores con la meta cumplida (con la actividad guardada de los miembros actuales)
    const goalsMet = (unwrap(past) as Row[]).filter((w) => inputs.reduce((acc, x) => acc + sumActivity(x.activity, w.week_start, addDays(w.week_start, 6), w.metric), 0) >= w.target).length;
    return {
      weekStart: ws,
      metric,
      target: wk.target,
      progress,
      contributions,
      puzzleIds: wk.puzzle_ids ?? [],
      results: (unwrap(results) as Row[]).map((x): WeekResult => ({ memberId: x.user_id, solved: x.solved, timeMs: x.time_ms, finishedAt: x.finished_at })),
      goalsMet,
    };
  }

  // Otra cuenta = otros datos. Renovar el token o volver a la pestaña no descarta nada.
  let userId: string | null | undefined;
  sb.auth.onAuthStateChange((_event, session) => {
    const id = session?.user.id ?? null;
    if (userId !== undefined && id !== userId) cache.invalidate();
    userId = id;
  });

  const repo: ClubRepository = {
    isDemo: false,
    get hasWall() {
      return wallInstalled;
    },

    // ── Sesión ──
    async getSession(): Promise<Session | null> {
      const { data } = await sb.auth.getSession();
      const u = data.session?.user;
      return u ? { userId: u.id, email: u.email ?? '' } : null;
    },
    async requestMagicLink(email) {
      const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/entrar` } });
      if (error) throw new Error(error.message);
    },
    async confirmMagicLink() {
      // Con Supabase la sesión llega sola al abrir el enlace del correo (detectSessionInUrl)
      const s = await repo.getSession();
      if (!s) throw new Error('Abre el enlace que te enviamos al correo.');
      return s;
    },
    async signOut() {
      await sb.auth.signOut();
      notify();
    },

    // ── Perfil y club ──
    async getMyProfile(): Promise<MyProfile | null> {
      const id = await me();
      return cache.get(`profile:${id}`, TTL.profile, async () => {
        const p = unwrap(await sb.from('profiles').select('name, avatar').eq('id', id).maybeSingle());
        return p ? { name: p.name as string, avatar: p.avatar as string } : null;
      });
    },
    async saveMyProfile(p) {
      const id = await me();
      unwrap(await sb.from('profiles').upsert({ id, name: p.name.trim(), avatar: p.avatar }));
      notify();
    },
    async getMyClub() {
      const row = await myClubRow();
      return row ? toClub(row) : null;
    },
    async canCreateClub() {
      const { data, error } = await sb.rpc('can_create_club');
      return !error && data === true;
    },
    async isAdmin() {
      const id = await me();
      return cache.get(`admin:${id}`, TTL.admin, async () => unwrap(await sb.rpc('is_platform_admin')) === true).catch(() => false);
    },
    async createClubInvite() {
      return unwrap(await sb.rpc('create_club_invite')) as string;
    },
    async redeemCreatorToken(token) {
      const { data, error } = await sb.rpc('redeem_creator_token', { p_token: token });
      if (error) throw new Error(error.message);
      return data === true;
    },
    async createClub(name) {
      forgetClub();
      const club = toClub(unwrap(await sb.rpc('create_club', { p_name: name })) as Row);
      await postFeedRow(club.id, club.createdBy, 'joined', 'user-plus', `fundó el club ${club.name}`);
      notify();
      return club;
    },
    async joinClub(code) {
      forgetClub();
      const { data, error } = await sb.rpc('join_club', { p_code: code });
      if (error) throw new Error(error.message);
      const club = toClub(data as Row);
      await postFeedRow(club.id, await me(), 'joined', 'user-plus', 'se unió al club');
      notify();
      return club;
    },
    async leaveClub() {
      forgetClub();
      unwrap(await sb.rpc('leave_club'));
      forgetClub();
      notify();
    },
    async setMemberRole(memberId, role) {
      const club = await requireClub();
      unwrap(await sb.rpc('set_member_role', { p_member: memberId, p_role: role }));
      const name = await memberName(memberId);
      await postFeedRow(club.id, await me(), 'joined', 'shield', role === 'manager' ? `nombró colaborador a ${name}` : `dejó a ${name} como participante`);
      notify();
    },
    async removeMember(memberId) {
      unwrap(await sb.rpc('remove_member', { p_member: memberId }));
      notify();
    },

    // ── Datos del club ──
    async getRoster() {
      return loadRoster((await requireClub()).id);
    },
    async getMembers() {
      const club = await requireClub();
      return (await loadInputs(club.id)).map(summarize);
    },
    async getMember(id): Promise<MemberDetail | null> {
      const club = await requireClub();
      const x = (await loadInputs(club.id)).find((i) => i.member.id === id);
      return x ? { ...summarize(x), activity: x.activity } : null;
    },
    async getLeaderboard(period: LeaderPeriod, metric: LeaderMetric) {
      const club = await requireClub();
      return computeLeaderboard(await loadInputs(club.id), period, metric, today());
    },
    async getFeed(limit = 40): Promise<FeedItem[]> {
      const club = await requireClub();
      return cache.get(`feed:${club.id}:${limit}`, TTL.feed, async () => {
        const rows = unwrap(await sb.from('activity_feed').select('*').eq('club_id', club.id).order('created_at', { ascending: false }).limit(limit)) as Row[];
        return withSocial(rows.map(toFeedItem));
      });
    },

    // ── Muro (tablas de la migración `wall`) ──
    async getFeedItem(id) {
      const club = await requireClub();
      const res = await sb.from('activity_feed').select('*').eq('club_id', club.id).eq('id', id).maybeSingle();
      // 22P02: el enlace trae un id que no es válido
      if (res.error?.code === '22P02') return null;
      const row = unwrap(res) as Row | null;
      return row ? ((await withSocial([toFeedItem(row)]))[0] ?? null) : null;
    },
    async createPost(text) {
      const clean = cleanWallText(text);
      const club = await requireClub();
      const id = await me();
      const row = unwrap(await sb.from('activity_feed').insert({ club_id: club.id, user_id: id, kind: 'post', icon: 'comment', text: clean }).select('*').single()) as Row;
      wallChanged();
      return { ...toFeedItem(row), likes: 0, likedByMe: false, commentCount: 0, isNew: false, newReplies: 0 };
    },
    async deletePost(id) {
      const rows = unwrap(await sb.from('activity_feed').delete().eq('id', id).eq('kind', 'post').select('id')) as Row[];
      // Sin permiso la base de datos no falla: simplemente no borra nada
      if (!rows.length) throw new Error('No puedes borrar esa publicación');
      wallChanged();
    },
    async toggleLike(feedId) {
      const id = await me();
      const removed = unwrap(await sb.from('feed_likes').delete().eq('feed_id', feedId).eq('user_id', id).select('feed_id')) as Row[];
      if (!removed.length) {
        const { error } = await sb.from('feed_likes').insert({ feed_id: feedId, user_id: id });
        // 23505: ya estaba puesto (doble pulsación)
        if (error && error.code !== '23505') throw new Error(error.message);
      }
      wallChanged();
    },
    async getComments(feedId) {
      const id = await me();
      return cache.get(`comments:${id}:${feedId}`, TTL.comments, async () => {
        const res = await sb.rpc('wall_comments', { p_feed: feedId });
        if (notInstalled(res.error)) return [];
        return (unwrap(res) as Row[]).map((c): FeedComment => ({ ...toComment(c), isNew: c.is_new }));
      });
    },
    async addComment(feedId, text) {
      const clean = cleanWallText(text);
      const id = await me();
      const res = await sb.from('feed_comments').insert({ feed_id: feedId, user_id: id, text: clean }).select('*').single();
      // La publicación se borró, o ya no es de mi club
      if (res.error?.code === '23503' || res.error?.code === '42501') throw new Error('Esa publicación ya no existe');
      const comment = toComment(unwrap(res) as Row);
      wallChanged();
      return comment;
    },
    async deleteComment(commentId) {
      const rows = unwrap(await sb.from('feed_comments').delete().eq('id', commentId).select('id')) as Row[];
      if (!rows.length) throw new Error('No puedes borrar ese comentario');
      wallChanged();
    },
    async markWallRead(feedId) {
      const res = await sb.rpc('mark_wall_read', { p_feed: feedId ?? null });
      if (notInstalled(res.error)) return false;
      const changed = unwrap(res) === true;
      // Quien llama recarga las pantallas
      if (changed) cache.invalidate('feed', 'comments');
      return changed;
    },
    async getWallReplies(limit = 10) {
      const id = await me();
      return cache.get(`replies:${id}:${limit}`, TTL.replies, async () => {
        const res = await sb.rpc('wall_replies', { p_limit: limit });
        if (notInstalled(res.error)) return [];
        return (unwrap(res) as Row[]).map((c): WallReply => ({ ...toComment(c), onMine: c.on_mine }));
      });
    },

    // ── Publicar mi progreso ──
    async publishMyProgress({ stats, activity }) {
      const id = await me();
      const club = await myClubRow();
      if (!club) return;
      const signature = JSON.stringify([id, club.id, today(), { ...stats, updatedAt: '' }, activity]);
      if (storage.getItem(PUBLISHED_KEY) === signature) return;
      // Se anota antes de enviar para que dos llamadas seguidas no escriban dos veces
      storage.setItem(PUBLISHED_KEY, signature);
      const forget = (e: unknown) => {
        storage.removeItem(PUBLISHED_KEY);
        throw e;
      };
      const saved = await sb.from('player_stats').upsert({
          user_id: id,
          xp: stats.xp,
          level: stats.level,
          rating: stats.rating,
          streak: stats.streak,
          best_streak: stats.bestStreak,
          last_active: stats.lastActive,
          lessons_completed: stats.lessonsCompleted,
          puzzles_solved: stats.puzzlesSolved,
          achievements: stats.achievements,
          modules: stats.modules,
          updated_at: stats.updatedAt,
      });
      if (saved.error) forget(new Error(saved.error.message));
      if (activity.length) {
        const sent = await sb.from('daily_activity').upsert(activity.map((a) => ({ user_id: id, day: a.day, xp: a.xp, puzzles: a.puzzles, lessons: a.lessons, reviews: a.reviews, minutes: a.minutes })));
        if (sent.error) forget(new Error(sent.error.message));
      }
      cache.invalidate('inputs', 'week');
    },
    async postFeed(item) {
      const club = await myClubRow();
      if (!club) return;
      await postFeedRow(club.id, await me(), item.kind, item.icon, item.text);
      cache.invalidate('feed');
    },

    // ── Ánimos ──
    async sendNudge(toId) {
      const club = await requireClub();
      const id = await me();
      const { error } = await sb.from('nudges').insert({ club_id: club.id, from_id: id, to_id: toId, day: today() });
      if (error) {
        if (error.code === '23505') throw new Error(`Ya animaste a ${await memberName(toId)} hoy`);
        throw new Error(error.message);
      }
      await postFeedRow(club.id, id, 'nudge', 'wave', `animó a ${await memberName(toId)} a practicar`);
      notify();
    },
    async getNudges(): Promise<Nudge[]> {
      const id = await me();
      return cache.get(`nudges:${id}`, TTL.nudges, async () => {
        const rows = unwrap(await sb.from('nudges').select('*').eq('to_id', id).order('created_at', { ascending: false })) as Row[];
        return rows.map((r): Nudge => ({ id: r.id, fromId: r.from_id, toId: r.to_id, day: r.day, createdAt: r.created_at, read: r.read }));
      });
    },
    async markNudgesRead() {
      const id = await me();
      unwrap(await sb.from('nudges').update({ read: true }).eq('to_id', id).eq('read', false));
      notify();
    },

    // ── Retos ──
    async listChallenges() {
      const id = await me();
      return cache.get(`challenges:${id}`, TTL.challenges, () => fetchChallenges((q) => q.or(`challenger_id.eq.${id},opponent_id.eq.${id}`)));
    },
    async getChallenge(id) {
      return (await fetchChallenges((q) => q.eq('id', id)))[0] ?? null;
    },
    async createChallenge(opponentId, kind: ChallengeKind, rematchOf) {
      const club = await requireClub();
      const id = await me();
      if (opponentId === id) throw new Error('No puedes retarte a ti mismo');
      const mine = await fetchChallenges((q) => q.eq('challenger_id', id).eq('opponent_id', opponentId).eq('status', 'open'));
      const dup = mine.find((c) => c.status === 'open' && !c.results.some((r) => r.memberId === id));
      if (dup) return dup;
      const ratings = unwrap(await sb.from('player_stats').select('user_id, rating').in('user_id', [id, opponentId])) as Row[];
      const rating = (u: string, fallback: number) => ratings.find((r) => r.user_id === u)?.rating ?? fallback;
      const pool = await deps.pool();
      const challengeId = crypto.randomUUID();
      const puzzleIds = pickChallengePuzzles(pool, kind, rating(id, 800), rating(opponentId, 1000), challengeId);
      if (puzzleIds.length === 0) throw new Error('No hay ejercicios disponibles para el reto');
      const expires = new Date(deps.now().getTime() + CHALLENGE_TTL_HOURS * 3_600_000).toISOString();
      const row = unwrap(
        await sb
          .from('challenges')
          .insert({ id: challengeId, club_id: club.id, challenger_id: id, opponent_id: opponentId, kind, puzzle_ids: puzzleIds, rematch_of: rematchOf ?? null, expires_at: expires })
          .select('*')
          .single(),
      );
      await postFeedRow(club.id, id, 'challenge', 'sword', `retó a ${await memberName(opponentId)} (${kind === 'rush' ? 'rush de 3 min' : '5 ejercicios'})`);
      notify();
      return toChallenge(row, []);
    },
    async declineChallenge(id) {
      unwrap(await sb.rpc('decline_challenge', { p_id: id }));
      notify();
    },
    async submitChallengeResult(id, r) {
      unwrap(await sb.rpc('submit_challenge_result', { p_id: id, p_solved: r.solved, p_mistakes: r.mistakes, p_time_ms: r.timeMs }));
      const c = await repo.getChallenge(id);
      if (!c) throw new Error('El reto ya no existe');
      notify();
      return c;
    },

    // ── Semana del club ──
    async getClubWeek(): Promise<ClubWeek> {
      const club = await requireClub();
      return cache.get(`week:${club.id}:${weekStart(today())}`, TTL.week, () => fetchWeek(club));
    },
    async submitWeekResult(r) {
      const club = await requireClub();
      const id = await me();
      const wk = await ensureWeek(club);
      const { error } = await sb.from('club_week_results').insert({ club_id: club.id, week_start: wk.week_start, user_id: id, solved: r.solved, time_ms: r.timeMs });
      if (error) throw new Error(error.code === '23505' ? 'Ya jugaste el desafío de esta semana' : error.message);
      await postFeedRow(club.id, id, 'weekly', 'users', `jugó el desafío semanal: ${r.solved}/${(wk.puzzle_ids ?? []).length}`);
      notify();
      return repo.getClubWeek();
    },

    // ── Tiempo real ──
    subscribe(cb) {
      listeners.add(cb);
      // Cada aviso en vivo descarta solo lo que cambió; el resto sigue guardado
      const changed = (...groups: string[]) => () => {
        cache.invalidate(...groups);
        cb();
      };
      const on = (table: string) => ({ event: '*' as const, schema: 'public', table });
      const channel = sb
        .channel(`club-${Math.random().toString(36).slice(2, 8)}`)
        .on('postgres_changes', on('activity_feed'), changed('feed', 'replies'))
        .on('postgres_changes', on('challenges'), changed('challenges'))
        .on('postgres_changes', on('challenge_results'), changed('challenges'))
        .on('postgres_changes', on('nudges'), changed('nudges'))
        .on('postgres_changes', on('club_members'), changed('club', 'roster', 'inputs', 'week'))
        .subscribe();
      // En un canal aparte: si faltan estas tablas, el resto de avisos sigue funcionando
      const wallChannel = sb
        .channel(`wall-${Math.random().toString(36).slice(2, 8)}`)
        .on('postgres_changes', on('feed_comments'), changed('feed', 'comments', 'replies'))
        .on('postgres_changes', on('feed_likes'), changed('feed'))
        .subscribe();
      return () => {
        listeners.delete(cb);
        void sb.removeChannel(channel);
        void sb.removeChannel(wallChannel);
      };
    },
  };
  return repo;
}
