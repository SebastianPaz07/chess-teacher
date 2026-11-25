import { allLessons, modules } from '@/content/registry';
import { addDays, diffDays, toDateKey, weekStart } from '@/lib/date';
import { hashString, seededRandom } from '@/lib/random';
import { levelFromXp } from '@/services/game/xp';
import { BOTS, botMember, botProfile, demoClubName, emptyStats, type BotProfile } from './bots';
import { CHALLENGE_TTL_HOURS, pickChallengePuzzles, pickWeeklyPuzzles, scoreChallenge, simulateRun } from './challenges';
import type { ClubRepository, MyProfile } from './ClubRepository';
import { canRemove, computeLeaderboard, sumActivity, visibleStreak, weeklyGoal, type LeaderInput } from './logic';
import type { Challenge, Club, ClubWeek, DailyActivity, FeedItem, Member, MemberRole, MemberStats, MemberSummary, Nudge, Session, WeekMetric, WeekResult } from './types';

/** Puzzle mínimo que necesita el mock para armar retos. */
export interface PoolPuzzle {
  id: string;
  rating: number;
  solution: string[];
}

interface WeekRecord {
  metric: WeekMetric;
  target: number;
  puzzleIds: string[];
  results: WeekResult[];
  closed?: boolean;
}

type MockChallenge = Challenge & { replyAt?: number };

export interface MockDb {
  version: 1;
  session: Session | null;
  pendingEmail: string | null;
  ownerId: string | null;
  profile: MyProfile | null;
  club: Club | null;
  members: Member[];
  stats: Record<string, MemberStats>;
  activity: Record<string, DailyActivity[]>;
  feed: FeedItem[];
  challenges: MockChallenge[];
  nudges: Nudge[];
  weeks: Record<string, WeekRecord>;
  goalsMet: number;
  /** Último día pasado ya simulado por completo */
  simulatedThrough: string | null;
  /** Primer día simulado (las semanas anteriores están incompletas) */
  seedStart: string | null;
  /** Bots que respondieron a un ánimo: practican hoy sin esperar a su hora */
  forced: Record<string, string>;
  /** Compañeros simulados que el organizador sacó del club */
  removed: string[];
  /** Esta persona canjeó un link para crear un club */
  creatorGrant: boolean;
}

export interface MockDeps {
  load: () => string | null;
  save: (json: string) => void;
  /** Fecha "de juego" (respeta el desfase de días de depuración) */
  now: () => Date;
  /** Reloj real, para los tiempos de respuesta de los bots */
  realNow: () => number;
  pool: () => Promise<PoolPuzzle[]>;
  latencyMs?: number;
  /** Segundos que tarda un bot en jugar tu reto */
  botReplySeconds?: [number, number];
  /** ¿Es admin de la plataforma? (en Supabase será un rol real) */
  isPlatformAdmin?: () => boolean;
}

export const CLUB_FEED_ID = '__club__';
const FEED_LIMIT = 300;

const fresh = (): MockDb => ({
  version: 1,
  session: null,
  pendingEmail: null,
  ownerId: null,
  profile: null,
  club: null,
  members: [],
  stats: {},
  activity: {},
  feed: [],
  challenges: [],
  nudges: [],
  weeks: {},
  goalsMet: 0,
  simulatedThrough: null,
  seedStart: null,
  forced: {},
  removed: [],
  creatorGrant: false,
});

const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randomCode = () => Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');

/** ISO de un día a una hora concreta (para fechar la actividad simulada). */
function isoAt(day: string, hour: number, minute: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, Math.max(0, Math.min(23, hour)), minute).toISOString();
}

const between = (r: () => number, [a, b]: [number, number]) => Math.round(a + r() * (b - a));

export function createMockRepository(deps: MockDeps): ClubRepository & { _db: () => MockDb; _reset: () => void; _advance: () => Promise<void>; _botChallenge: () => Promise<void>; _botsReplyNow: () => Promise<void> } {
  let db: MockDb = (() => {
    try {
      const raw = deps.load();
      return raw ? { ...fresh(), ...(JSON.parse(raw) as MockDb) } : fresh();
    } catch {
      return fresh();
    }
  })();
  const listeners = new Set<() => void>();
  let timer: ReturnType<typeof setInterval> | null = null;

  const persist = () => deps.save(JSON.stringify(db));
  const notify = () => listeners.forEach((l) => l());
  const wait = () => new Promise((r) => setTimeout(r, deps.latencyMs ?? 0));
  const today = () => toDateKey(deps.now());
  const nowIso = () => deps.now().toISOString();
  const me = () => db.session?.userId ?? '';
  const activeBots = () => BOTS.filter((b) => !db.removed.includes(b.id));
  const myRole = (): MemberRole | undefined => db.members.find((m) => m.id === me())?.role;
  const memberName = (id: string) => db.members.find((m) => m.id === id)?.name ?? 'Alguien';

  function requireClub(): Club {
    if (!db.session) throw new Error('Inicia sesión para ver tu club');
    if (!db.club) throw new Error('Aún no perteneces a un club');
    return db.club;
  }

  function pushFeed(memberId: string, kind: FeedItem['kind'], icon: string, text: string, createdAt = nowIso()) {
    db.feed.push({ id: uid('f'), memberId, kind, icon, text, createdAt });
    if (db.feed.length > FEED_LIMIT) db.feed = db.feed.slice(-FEED_LIMIT);
  }

  function addActivity(id: string, a: DailyActivity) {
    const list = db.activity[id] ?? [];
    const i = list.findIndex((x) => x.day === a.day);
    if (i >= 0) list[i] = a;
    else list.push(a);
    list.sort((x, y) => x.day.localeCompare(y.day));
    db.activity[id] = list.slice(-120);
  }

  // ───────────────────────── Simulación de bots ─────────────────────────

  /** Un día de práctica de un bot. Idempotente: si ya practicó ese día no hace nada. */
  function simulateBotDay(b: BotProfile, day: string, pool: PoolPuzzle[], isToday: boolean) {
    if (!db.members.some((m) => m.id === b.id)) return;
    if ((db.activity[b.id] ?? []).some((a) => a.day === day)) return;
    const r = seededRandom(hashString(`${db.club?.id}:${b.id}:${day}`));
    const [y, m, d] = day.split('-').map(Number);
    const dow = new Date(y, m - 1, d).getDay();
    const prob = Math.min(0.98, b.practice * (dow === 0 || dow === 6 ? b.weekend : 1));
    const forced = db.forced[b.id] === day;
    const practices = r() < prob || forced;
    const hour = b.hour + Math.floor(r() * 3) - 1;
    const minute = Math.floor(r() * 60);
    if (!practices) return;
    if (isToday && !forced && hour > deps.now().getHours()) return; // todavía no es su hora

    const s = { ...(db.stats[b.id] ?? emptyStats(nowIso())) };
    const xp = between(r, b.xp);
    const puzzles = between(r, b.puzzles);
    const lessons = r() < b.lessonChance ? 1 : 0;
    const at = forced ? nowIso() : isoAt(day, hour, minute);

    const prevLevel = levelFromXp(s.xp);
    const gap = s.lastActive ? diffDays(s.lastActive, day) : Infinity;
    s.streak = gap === 1 ? s.streak + 1 : gap === 0 ? s.streak : 1;
    s.bestStreak = Math.max(s.bestStreak, s.streak);
    s.lastActive = day;
    s.xp += xp;
    s.level = levelFromXp(s.xp);
    s.puzzlesSolved += puzzles;
    s.lessonsCompleted += lessons;
    s.rating = Math.max(500, Math.round(s.rating + (r() - 0.42) * 18));
    s.updatedAt = at;
    s.modules = botModules(s.lessonsCompleted);
    db.stats[b.id] = s;
    const minutes = Math.round(puzzles * (1.2 + r()) + lessons * 8 + r() * 6);
    addActivity(b.id, { day, xp, puzzles, lessons, reviews: Math.floor(r() * 4), minutes });

    // Feed: solo lo destacable
    if (lessons) {
      const lesson = allLessons[(s.lessonsCompleted - 1) % Math.max(1, allLessons.length)];
      pushFeed(b.id, 'lesson', 'book-open', `completó la lección «${lesson?.title ?? 'nueva'}»`, at);
    } else if (puzzles >= 10) {
      pushFeed(b.id, 'practice', 'puzzle', `resolvió ${puzzles} ejercicios en una sesión`, at);
    }
    if ([3, 7, 14, 21, 30, 50, 100].includes(s.streak)) pushFeed(b.id, 'streak', 'fire', `lleva una racha de ${s.streak} días`, at);
    if (s.level > prevLevel) {
      pushFeed(b.id, 'level', 'crown', `subió al nivel ${s.level}`, at);
      s.achievements += 1;
    }
    if (forced) pushFeed(b.id, 'practice', 'wave', 'respondió al ánimo y ya practicó hoy', at);

    // Desafío semanal: lo juega una vez, algún día de la semana
    const wk = db.weeks[weekStart(day)];
    if (wk && !wk.results.some((x) => x.memberId === b.id) && r() < 0.4) {
      const ratings = wk.puzzleIds.map((id) => pool.find((p) => p.id === id)?.rating ?? s.rating);
      const run = simulateRun(s.rating, ratings, 'puzzles', `${b.id}:week:${weekStart(day)}`);
      wk.results.push({ memberId: b.id, solved: run.solved, timeMs: run.timeMs, finishedAt: at });
      pushFeed(b.id, 'weekly', 'users', `jugó el desafío semanal: ${run.solved}/${wk.puzzleIds.length}`, at);
    }

    // Retos que el bot te lanza (solo días recientes para que no estén vencidos)
    if (db.session && diffDays(day, today()) <= 2 && r() < b.challengeChance) {
      const alreadyOpen = db.challenges.some((c) => c.status === 'open' && c.challengerId === b.id);
      if (!alreadyOpen) botCreatesChallenge(b, pool, at, r() < 0.5 ? 'puzzles' : 'rush');
    }

    // Ánimo para ti si hoy no has practicado
    if (isToday && db.session && hour >= 17 && r() < b.nudgeChance) {
      const myToday = (db.activity[me()] ?? []).some((a) => a.day === day);
      const already = db.nudges.some((n) => n.fromId === b.id && n.toId === me() && n.day === day);
      if (!myToday && !already) db.nudges.push({ id: uid('n'), fromId: b.id, toId: me(), day, createdAt: at, read: false });
    }
  }

  /** Avance por módulo a partir de las lecciones hechas (un curso completo ≈ 40 lecciones de práctica). */
  function botModules(lessonsDone: number): Record<string, number> {
    const out: Record<string, number> = {};
    const total = modules.reduce((a, m) => a + m.lessons.length, 0);
    let left = Math.min(total, Math.round((lessonsDone / 40) * total));
    for (const m of modules) {
      const n = m.lessons.length || 1;
      const done = Math.min(n, left);
      out[m.id] = Math.round((done / n) * 100) / 100;
      left -= done;
    }
    return out;
  }

  function botCreatesChallenge(b: BotProfile, pool: PoolPuzzle[], at: string, kind: 'puzzles' | 'rush') {
    const myRating = db.stats[me()]?.rating ?? 800;
    const botRating = db.stats[b.id]?.rating ?? b.rating;
    const id = uid('c');
    const puzzleIds = pickChallengePuzzles(pool, kind, botRating, myRating, id);
    const ratings = puzzleIds.map((pid) => pool.find((p) => p.id === pid)?.rating ?? botRating);
    const run = simulateRun(botRating, ratings, kind, `${id}:${b.id}`);
    db.challenges.push({
      id,
      challengerId: b.id,
      opponentId: me(),
      kind,
      puzzleIds,
      status: 'open',
      createdAt: at,
      expiresAt: new Date(new Date(at).getTime() + CHALLENGE_TTL_HOURS * 3_600_000).toISOString(),
      results: [{ memberId: b.id, ...run, finishedAt: at }],
    });
  }

  /** Los bots juegan los retos que les mandaste cuando llega su "hora de respuesta". */
  function botReplies(pool: PoolPuzzle[], force = false) {
    for (const c of db.challenges) {
      if (c.status !== 'open') continue;
      const b = botProfile(c.opponentId);
      if (!b || c.results.some((x) => x.memberId === b.id)) continue;
      if (!force && (c.replyAt ?? 0) > deps.realNow()) continue;
      const rating = db.stats[b.id]?.rating ?? b.rating;
      const ratings = c.puzzleIds.map((pid) => pool.find((p) => p.id === pid)?.rating ?? rating);
      const run = simulateRun(rating, ratings, c.kind, `${c.id}:${b.id}`);
      c.results.push({ memberId: b.id, ...run, finishedAt: nowIso() });
      settle(c);
    }
  }

  function settle(c: MockChallenge) {
    if (c.results.length < 2 || c.status !== 'open') return;
    c.status = 'done';
    c.winnerId = scoreChallenge(c.results);
    const [a, b] = c.results;
    const score = `${a.solved}–${b.solved}`;
    if (c.winnerId === null) pushFeed(c.challengerId, 'challenge', 'handshake', `empató un reto con ${memberName(c.opponentId)} (${score})`);
    else {
      const loser = c.winnerId === c.challengerId ? c.opponentId : c.challengerId;
      const w = c.results.find((x) => x.memberId === c.winnerId)!;
      const l = c.results.find((x) => x.memberId === loser)!;
      pushFeed(c.winnerId, 'challenge', 'sword', `le ganó un reto a ${memberName(loser)} (${w.solved}–${l.solved})`);
    }
  }

  function expire() {
    const nowMs = deps.now().getTime();
    for (const c of db.challenges) if (c.status === 'open' && new Date(c.expiresAt).getTime() < nowMs) c.status = 'expired';
  }

  function ensureWeek(pool: PoolPuzzle[], day = today()): WeekRecord {
    const club = db.club!;
    const ws = weekStart(day);
    let wk = db.weeks[ws];
    if (!wk) {
      const prevWs = addDays(ws, -7);
      const prev = db.weeks[prevWs];
      const complete = prev && (!db.seedStart || prevWs >= db.seedStart);
      // La meta se ajusta con lo que el club hizo la semana pasada en esa misma métrica
      const { metric } = weeklyGoal(club.id, ws, db.members.length, null);
      const lastTotal = complete ? weekProgress(prevWs, metric).total : null;
      const goal = weeklyGoal(club.id, ws, db.members.length, lastTotal);
      const ratings = db.members.map((m) => db.stats[m.id]?.rating ?? 1000);
      const avg = Math.round(ratings.reduce((a, b) => a + b, 0) / Math.max(1, ratings.length));
      wk = { ...goal, puzzleIds: pickWeeklyPuzzles(pool, club.id, ws, avg), results: [] };
      db.weeks[ws] = wk;
    }
    return wk;
  }

  function weekProgress(ws: string, metric: WeekMetric) {
    const end = addDays(ws, 6);
    const key = metric;
    const contributions: Record<string, number> = {};
    let total = 0;
    for (const m of db.members) {
      const v = sumActivity(db.activity[m.id] ?? [], ws, end, key);
      contributions[m.id] = v;
      total += v;
    }
    return { total, contributions };
  }

  /** Cierra semanas pasadas: meta cumplida y podio del desafío. */
  function closeWeeks() {
    const current = weekStart(today());
    for (const [ws, wk] of Object.entries(db.weeks)) {
      if (ws >= current || wk.closed) continue;
      wk.closed = true;
      if (db.seedStart && ws < db.seedStart) continue; // semana a medias (antes del historial simulado)
      const { total } = weekProgress(ws, wk.metric);
      const at = isoAt(addDays(ws, 7), 0, 5);
      if (total >= wk.target) {
        db.goalsMet += 1;
        pushFeed(CLUB_FEED_ID, 'week-goal', 'trophy', `¡El club cumplió la meta de la semana! ${total}/${wk.target}`, at);
      } else {
        pushFeed(CLUB_FEED_ID, 'week-goal', 'flag', `La meta de la semana se quedó en ${total}/${wk.target}. ¡A por la siguiente!`, at);
      }
      const best = [...wk.results].sort((a, b) => b.solved - a.solved || a.timeMs - b.timeMs)[0];
      if (best) pushFeed(best.memberId, 'weekly', 'medal', `ganó el desafío semanal con ${best.solved}/${wk.puzzleIds.length}`, at);
    }
  }

  let simulating: Promise<boolean> | null = null;

  /** Pone el club al día: días pasados, hoy hasta la hora actual, respuestas y vencimientos. */
  function simulate(): Promise<boolean> {
    if (!db.club || !db.session) return Promise.resolve(false);
    simulating ??= (async () => {
      const before = JSON.stringify([db.feed.length, db.challenges, db.nudges.length, db.stats]);
      const pool = await deps.pool();
      const t = today();
      const start = db.simulatedThrough ? addDays(db.simulatedThrough, 1) : addDays(t, -30);
      for (let d = start; d < t; d = addDays(d, 1)) {
        ensureWeek(pool, d);
        for (const b of activeBots()) simulateBotDay(b, d, pool, false);
      }
      db.simulatedThrough = addDays(t, -1);
      ensureWeek(pool, t);
      for (const b of activeBots()) simulateBotDay(b, t, pool, true);
      botReplies(pool);
      expire();
      closeWeeks();
      persist();
      return before !== JSON.stringify([db.feed.length, db.challenges, db.nudges.length, db.stats]);
    })().finally(() => {
      simulating = null;
    });
    return simulating;
  }

  function seedClub(club: Club) {
    const t = today();
    db.club = club;
    db.ownerId = me();
    db.members = [];
    db.stats = {};
    db.activity = {};
    db.feed = [];
    db.challenges = [];
    db.nudges = [];
    db.weeks = {};
    db.goalsMet = 0;
    db.forced = {};
    db.removed = [];
    db.simulatedThrough = null;
    const start = addDays(t, -30);
    db.seedStart = start;
    BOTS.forEach((b, i) => {
      const joined = isoAt(addDays(start, -20 + i * 3), 10, 0);
      db.members.push(botMember(b, joined));
      db.stats[b.id] = {
        ...emptyStats(joined),
        xp: b.base.xp,
        level: levelFromXp(b.base.xp),
        rating: b.rating,
        lessonsCompleted: b.base.lessons,
        puzzlesSolved: b.base.puzzles,
        streak: b.base.streak,
        bestStreak: b.base.best,
        lastActive: b.base.streak ? addDays(start, -1) : addDays(start, -6),
        achievements: Math.floor(levelFromXp(b.base.xp) * 1.3),
        modules: botModules(b.base.lessons),
      };
    });
    const mine: Member = { id: me(), name: db.profile?.name ?? 'Yo', avatar: db.profile?.avatar ?? 'piece-knight', role: club.createdBy === me() ? 'owner' : 'member', joinedAt: nowIso() };
    db.members.push(mine);
    db.stats[me()] ??= emptyStats(nowIso());
    pushFeed(me(), 'joined', 'user-plus', club.createdBy === me() ? `fundó el club ${club.name}` : 'se unió al club');
  }

  const repo = {
    isDemo: true,

    async getSession() {
      await wait();
      return db.session;
    },
    async requestMagicLink(email: string) {
      await wait();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) throw new Error('Escribe un correo válido');
      db.pendingEmail = email.trim().toLowerCase();
      persist();
    },
    async confirmMagicLink(email: string) {
      await wait();
      const e = email.trim().toLowerCase();
      const session: Session = { userId: `u-${hashString(e).toString(36)}`, email: e };
      if (db.ownerId && db.ownerId !== session.userId) {
        // Otro usuario en este navegador: empieza limpio
        db = { ...fresh() };
      }
      db.session = session;
      db.pendingEmail = null;
      persist();
      notify();
      return session;
    },
    async signOut() {
      await wait();
      db.session = null;
      persist();
      notify();
    },

    async getMyProfile() {
      await wait();
      return db.session ? db.profile : null;
    },
    async saveMyProfile(p: MyProfile) {
      await wait();
      db.profile = { name: p.name.trim().slice(0, 24) || 'Jugador', avatar: p.avatar };
      const m = db.members.find((x) => x.id === me());
      if (m) Object.assign(m, db.profile);
      persist();
      notify();
    },
    async getMyClub() {
      await wait();
      return db.session ? db.club : null;
    },
    async canCreateClub() {
      await wait();
      return Boolean(db.session) && (Boolean(deps.isPlatformAdmin?.()) || db.creatorGrant);
    },
    async isAdmin() {
      return Boolean(deps.isPlatformAdmin?.());
    },
    async createClubInvite() {
      await wait();
      if (!deps.isPlatformAdmin?.()) throw new Error('Solo el administrador puede invitar a crear clubes');
      // Demo: cualquier token de 8+ caracteres sirve; con Supabase será de un solo uso y con vencimiento
      return `CR${randomCode()}${randomCode()}`;
    },
    async redeemCreatorToken(token: string) {
      await wait();
      if (!db.session || !/^[A-Z0-9]{8,}$/i.test(token.trim())) return false;
      db.creatorGrant = true;
      persist();
      notify();
      return true;
    },
    async createClub(name: string) {
      await wait();
      if (!db.session) throw new Error('Inicia sesión primero');
      if (!deps.isPlatformAdmin?.() && !db.creatorGrant) throw new Error('Solo puedes crear un club con un link de invitación del administrador');
      const clean = name.trim();
      if (clean.length < 3) throw new Error('El nombre del club debe tener al menos 3 letras');
      const club: Club = { id: uid('club'), name: clean.slice(0, 40), inviteCode: randomCode(), createdBy: me(), createdAt: nowIso() };
      db.creatorGrant = false;
      seedClub(club);
      await simulate();
      notify();
      return club;
    },
    async joinClub(code: string) {
      await wait();
      if (!db.session) throw new Error('Inicia sesión primero');
      const c = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (c.length < 4) throw new Error('El código tiene 6 letras o números');
      if (db.club?.inviteCode === c) return db.club;
      // Demo: cualquier código válido abre un club con compañeros simulados
      const club: Club = { id: `club-${c.toLowerCase()}`, name: demoClubName(hashString(c)), inviteCode: c, createdBy: 'bot-ramiro', createdAt: isoAt(addDays(today(), -60), 9, 0) };
      seedClub(club);
      await simulate();
      notify();
      return club;
    },
    async leaveClub() {
      await wait();
      db = { ...fresh(), session: db.session, profile: db.profile, ownerId: db.ownerId, creatorGrant: db.creatorGrant };
      persist();
      notify();
    },
    async setMemberRole(memberId: string, role: 'manager' | 'member') {
      await wait();
      requireClub();
      if (myRole() !== 'owner') throw new Error('Solo el organizador puede nombrar colaboradores');
      const m = db.members.find((x) => x.id === memberId);
      if (!m || m.role === 'owner') throw new Error('No se puede cambiar ese rol');
      m.role = role;
      pushFeed(memberId, 'joined', 'shield', role === 'manager' ? 'ahora es colaborador del club' : 'dejó de ser colaborador');
      persist();
      notify();
    },
    async removeMember(memberId: string) {
      await wait();
      requireClub();
      const actor = db.members.find((x) => x.id === me());
      const target = db.members.find((x) => x.id === memberId);
      if (!target || !canRemove(actor, target)) throw new Error('No puedes sacar a esa persona');
      db.members = db.members.filter((x) => x.id !== memberId);
      if (target.isBot) db.removed.push(memberId);
      db.challenges = db.challenges.filter((c) => c.status !== 'open' || (c.challengerId !== memberId && c.opponentId !== memberId));
      persist();
      notify();
    },

    async getMembers(): Promise<MemberSummary[]> {
      requireClub();
      await simulate();
      await wait();
      const t = today();
      const ws = weekStart(t);
      return db.members.map((member) => {
        const stats = db.stats[member.id] ?? emptyStats(nowIso());
        const act = db.activity[member.id] ?? [];
        return {
          member,
          stats,
          streak: visibleStreak(stats, t),
          practicedToday: stats.lastActive === t || act.some((a) => a.day === t),
          weekXp: sumActivity(act, ws, t, 'xp'),
          weekPuzzles: sumActivity(act, ws, t, 'puzzles'),
          weekMinutes: sumActivity(act, ws, t, 'minutes'),
        };
      });
    },
    async getMember(id: string) {
      const list = await repo.getMembers();
      const s = list.find((x) => x.member.id === id);
      return s ? { ...s, activity: [...(db.activity[id] ?? [])] } : null;
    },
    async getLeaderboard(period: 'week' | 'all', metric: 'xp' | 'rating' | 'streak' | 'puzzles') {
      requireClub();
      await simulate();
      await wait();
      const inputs: LeaderInput[] = db.members.map((member) => ({ member, stats: db.stats[member.id] ?? emptyStats(nowIso()), activity: db.activity[member.id] ?? [] }));
      return computeLeaderboard(inputs, period, metric, today());
    },
    async getFeed(limit = 40) {
      requireClub();
      await simulate();
      await wait();
      const nowMs = deps.now().getTime() + 60_000;
      return [...db.feed]
        .filter((f) => new Date(f.createdAt).getTime() <= nowMs)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit);
    },

    async publishMyProgress(p: { stats: MemberStats; activity: DailyActivity[] }) {
      if (!db.session || !db.club) return;
      db.stats[me()] = p.stats;
      for (const a of p.activity) addActivity(me(), a);
      persist();
      notify();
    },
    async postFeed(item: { kind: FeedItem['kind']; icon: string; text: string }) {
      if (!db.session || !db.club) return;
      pushFeed(me(), item.kind, item.icon, item.text);
      persist();
      notify();
    },

    async sendNudge(toId: string) {
      requireClub();
      await wait();
      const t = today();
      if (db.nudges.some((n) => n.fromId === me() && n.toId === toId && n.day === t)) throw new Error(`Ya animaste a ${memberName(toId)} hoy`);
      db.nudges.push({ id: uid('n'), fromId: me(), toId, day: t, createdAt: nowIso(), read: true });
      pushFeed(me(), 'nudge', 'wave', `animó a ${memberName(toId)} a practicar`);
      const b = botProfile(toId);
      if (b && seededRandom(hashString(`${toId}:${t}:nudge`))() < 0.65) db.forced[toId] = t;
      persist();
      await simulate();
      notify();
    },
    async getNudges() {
      if (!db.session || !db.club) return [];
      await wait();
      return db.nudges.filter((n) => n.toId === me()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async markNudgesRead() {
      for (const n of db.nudges) if (n.toId === me()) n.read = true;
      persist();
      notify();
    },

    async listChallenges() {
      requireClub();
      await simulate();
      await wait();
      return db.challenges
        .filter((c) => c.challengerId === me() || c.opponentId === me())
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(({ replyAt: _r, ...c }) => c);
    },
    async getChallenge(id: string) {
      requireClub();
      await simulate();
      await wait();
      const c = db.challenges.find((x) => x.id === id);
      if (!c) return null;
      const { replyAt: _r, ...rest } = c;
      return rest;
    },
    async createChallenge(opponentId: string, kind: 'puzzles' | 'rush', rematchOf?: string) {
      requireClub();
      await wait();
      if (opponentId === me()) throw new Error('No puedes retarte a ti mismo');
      const open = db.challenges.find((c) => c.status === 'open' && c.challengerId === me() && c.opponentId === opponentId && !c.results.some((r) => r.memberId === me()));
      if (open) return open;
      const pool = await deps.pool();
      const id = uid('c');
      const puzzleIds = pickChallengePuzzles(pool, kind, db.stats[me()]?.rating ?? 800, db.stats[opponentId]?.rating ?? 1000, id);
      if (puzzleIds.length === 0) throw new Error('No hay ejercicios disponibles para el reto');
      const [lo, hi] = deps.botReplySeconds ?? [25, 90];
      const c: MockChallenge = {
        id,
        challengerId: me(),
        opponentId,
        kind,
        puzzleIds,
        status: 'open',
        createdAt: nowIso(),
        expiresAt: new Date(deps.now().getTime() + CHALLENGE_TTL_HOURS * 3_600_000).toISOString(),
        results: [],
        rematchOf,
        replyAt: deps.realNow() + (lo + Math.random() * (hi - lo)) * 1000,
      };
      db.challenges.push(c);
      pushFeed(me(), 'challenge', 'sword', `retó a ${memberName(opponentId)} (${kind === 'rush' ? 'rush de 3 min' : '5 ejercicios'})`);
      persist();
      notify();
      return c;
    },
    async declineChallenge(id: string) {
      await wait();
      const c = db.challenges.find((x) => x.id === id);
      if (c && c.status === 'open') c.status = 'declined';
      persist();
      notify();
    },
    async submitChallengeResult(id: string, r: { solved: number; mistakes: number; timeMs: number }) {
      requireClub();
      await wait();
      const c = db.challenges.find((x) => x.id === id);
      if (!c) throw new Error('El reto ya no existe');
      if (c.status !== 'open') throw new Error('Este reto ya está cerrado');
      if (c.results.some((x) => x.memberId === me())) throw new Error('Ya jugaste este reto');
      c.results.push({ memberId: me(), ...r, finishedAt: nowIso() });
      settle(c);
      persist();
      notify();
      const { replyAt: _r, ...rest } = c;
      return rest;
    },

    async getClubWeek(): Promise<ClubWeek> {
      requireClub();
      await simulate();
      await wait();
      const pool = await deps.pool();
      const wk = ensureWeek(pool);
      const ws = weekStart(today());
      const { total, contributions } = weekProgress(ws, wk.metric);
      return { weekStart: ws, metric: wk.metric, target: wk.target, progress: total, contributions, puzzleIds: wk.puzzleIds, results: [...wk.results], goalsMet: db.goalsMet };
    },
    async submitWeekResult(r: { solved: number; timeMs: number }) {
      requireClub();
      await wait();
      const pool = await deps.pool();
      const wk = ensureWeek(pool);
      if (wk.results.some((x) => x.memberId === me())) throw new Error('Ya jugaste el desafío de esta semana');
      wk.results.push({ memberId: me(), ...r, finishedAt: nowIso() });
      pushFeed(me(), 'weekly', 'users', `jugó el desafío semanal: ${r.solved}/${wk.puzzleIds.length}`);
      persist();
      notify();
      return repo.getClubWeek();
    },

    subscribe(cb: () => void) {
      listeners.add(cb);
      // "Realtime" del modo demo: los bots siguen viviendo mientras la app está abierta
      timer ??= setInterval(() => {
        simulate().then((changed) => changed && notify());
      }, 10_000);
      return () => {
        listeners.delete(cb);
        if (!listeners.size && timer) {
          clearInterval(timer);
          timer = null;
        }
      };
    },

    // ── Herramientas del modo demo (Ajustes) ──
    _db: () => db,
    _reset: () => {
      const keep = { session: db.session, profile: db.profile, ownerId: db.ownerId, creatorGrant: db.creatorGrant };
      const club = db.club;
      db = { ...fresh(), ...keep };
      if (club) seedClub({ ...club, createdAt: nowIso() });
      persist();
      simulate().then(() => notify());
    },
    _advance: async () => {
      await simulate();
      notify();
    },
    _botChallenge: async () => {
      requireClub();
      const pool = await deps.pool();
      const open = new Set(db.challenges.filter((c) => c.status === 'open').map((c) => c.challengerId));
      const bots = activeBots();
      const b = bots.find((x) => !open.has(x.id)) ?? bots[0];
      if (!b) return;
      botCreatesChallenge(b, pool, nowIso(), Math.random() < 0.5 ? 'puzzles' : 'rush');
      pushFeed(b.id, 'challenge', 'sword', `retó a ${memberName(me())}`);
      persist();
      notify();
    },
    _botsReplyNow: async () => {
      const pool = await deps.pool();
      botReplies(pool, true);
      persist();
      notify();
    },
  };
  return repo;
}
