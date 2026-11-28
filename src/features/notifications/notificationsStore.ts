import { create } from 'zustand';
import { clubRepo, type Challenge, type FeedItem, type MemberSummary, type WallReply } from '@/services/club';

/** Una notificación del club, ya redactada. */
export interface Notice {
  id: string;
  icon: string;
  title: string;
  detail?: string;
  at: string;
  to: string;
  /** Pide una acción tuya (p. ej. un reto por jugar) */
  action?: boolean;
}

const SEEN_KEY = 'profe-ajedrez:notif-seen';
const TOP_KEY = 'profe-ajedrez:notif-podium';
const RANK_KEY = 'profe-ajedrez:notif-myrank';
const EVENTS_KEY = 'profe-ajedrez:notif-rank-events';
const TTL_MS = 90_000;
const WEEK_MS = 7 * 86_400_000;
/** Texto que publica el club al terminar un reto (ver ChallengePage) */
const RESULT_TEXT = /^(le ganó a|perdió contra|empató con) /;

function read<T>(k: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(k: string, v: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* sin almacenamiento */
  }
}

interface BoardRow {
  member: { id: string; name: string };
  rank: number;
}

interface State {
  notices: Notice[];
  seenAt: string;
  loadedAt: number;
  loading: boolean;
  load: (meId: string, force?: boolean) => Promise<void>;
  markSeen: () => void;
}

/** Redacta los avisos a partir de datos que el club ya tiene (sin tablas nuevas). */
function build(meId: string, members: MemberSummary[], challenges: Challenge[], nudges: { id: string; fromId: string; createdAt: string }[], feed: FeedItem[], board: BoardRow[], replies: WallReply[]): Notice[] {
  const names = new Map(members.map((m) => [m.member.id, m.member.name]));
  const who = (id: string) => names.get(id) ?? 'Un compañero';
  const out: Notice[] = [];
  const cutoff = Date.now() - WEEK_MS;

  for (const c of challenges) {
    const rivalId = c.challengerId === meId ? c.opponentId : c.challengerId;
    const mine = c.results.find((r) => r.memberId === meId);
    const kind = c.kind === 'rush' ? 'Rush de 3 min' : `${c.puzzleIds.length} ejercicios`;
    if (c.status === 'open' && c.opponentId === meId && !mine) {
      out.push({ id: `ch-new-${c.id}`, icon: 'sword', title: `${who(rivalId)} te retó`, detail: `${kind} · por jugar`, at: c.createdAt, to: `/club/reto/${c.id}`, action: true });
    } else if (c.status === 'done' && mine) {
      const at = c.results.reduce((a, r) => (r.finishedAt > a ? r.finishedAt : a), c.createdAt);
      if (new Date(at).getTime() < cutoff) continue;
      const won = c.winnerId === meId;
      const draw = c.winnerId === null;
      out.push({
        id: `ch-done-${c.id}`,
        icon: won ? 'trophy' : draw ? 'handshake' : 'sword',
        title: won ? `Le ganaste a ${who(rivalId)}` : draw ? `Empataste con ${who(rivalId)}` : `${who(rivalId)} ganó el reto`,
        detail: won ? 'Reto ganado' : 'Pide la revancha',
        at,
        to: `/club/reto/${c.id}`,
      });
    }
  }
  for (const n of nudges) out.push({ id: `nudge-${n.id}`, icon: 'wave', title: `${who(n.fromId)} te anima a practicar`, at: n.createdAt, to: '/club' });
  for (const r of replies) {
    if (new Date(r.createdAt).getTime() < cutoff) continue;
    out.push({
      id: `reply-${r.id}`,
      icon: 'comment',
      title: r.onMine ? `${who(r.memberId)} te comentó` : `${who(r.memberId)} respondió en un hilo donde comentaste`,
      detail: r.text.length > 70 ? `${r.text.slice(0, 70).trimEnd()}…` : r.text,
      at: r.createdAt,
      to: `/club?post=${encodeURIComponent(r.feedId)}`,
    });
  }
  // Del club solo lo general: resultados de retos entre compañeros (no logros, niveles ni rachas).
  // Los que me involucran ya salen arriba con más detalle.
  const myName = names.get(meId);
  for (const f of feed) {
    if (f.memberId === meId || f.kind !== 'challenge' || !RESULT_TEXT.test(f.text)) continue;
    if (myName && f.text.includes(myName)) continue;
    out.push({ id: `feed-${f.id}`, icon: 'trophy', title: `${who(f.memberId)} ${f.text}`, at: f.createdAt, to: '/club?tab=retos' });
    if (out.filter((n) => n.id.startsWith('feed-')).length >= 5) break;
  }

  // Podio y puesto: se comparan con la última vez que se miró el ranking
  const nowIso = new Date().toISOString();
  const top3 = board.filter((r) => r.rank <= 3).map((r) => r.member.id);
  const prevTop = read<string[] | null>(TOP_KEY, null);
  const events = read<Notice[]>(EVENTS_KEY, []);
  const fresh: Notice[] = [];
  if (prevTop) {
    for (const r of board.filter((x) => x.rank <= 3 && !prevTop.includes(x.member.id))) {
      fresh.push({
        id: `podium-${r.member.id}-${r.rank}-${nowIso.slice(0, 10)}`,
        icon: 'ranking',
        title: r.member.id === meId ? `¡Entraste al podio! Vas ${r.rank}º` : `${r.member.name} subió al podio (${r.rank}º)`,
        at: nowIso,
        to: '/club?tab=ranking',
      });
    }
  }
  write(TOP_KEY, top3);
  const mine = board.find((r) => r.member.id === meId);
  const prevRank = read<number | null>(RANK_KEY, null);
  if (mine) {
    if (prevRank !== null && mine.rank < prevRank) {
      const n = prevRank - mine.rank;
      fresh.push({ id: `up-${nowIso.slice(0, 13)}-${mine.rank}`, icon: 'rocket', title: `Subiste ${n} ${n === 1 ? 'puesto' : 'puestos'}`, detail: `Ahora vas ${mine.rank}º en el ranking`, at: nowIso, to: '/club?tab=ranking' });
    }
    if (prevRank !== null && mine.rank > prevRank) {
      const passer = board.find((r) => r.rank === mine.rank - 1 && r.member.id !== meId);
      fresh.push({
        id: `down-${nowIso.slice(0, 13)}-${mine.rank}`,
        icon: 'chart',
        title: passer ? `${passer.member.name} te superó en el ranking` : `Bajaste ${mine.rank - prevRank} puestos`,
        detail: `Ahora vas ${mine.rank}º: ¡a recuperarlo!`,
        at: nowIso,
        to: '/club?tab=ranking',
      });
    }
    write(RANK_KEY, mine.rank);
  }
  const keep = [...fresh, ...events].filter((e, i, a) => a.findIndex((x) => x.id === e.id) === i && new Date(e.at).getTime() > cutoff).slice(0, 12);
  write(EVENTS_KEY, keep);
  out.push(...keep);

  return out.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 25);
}

export const useNotificationsStore = create<State>()((set, get) => ({
  notices: [],
  seenAt: read<string>(SEEN_KEY, new Date(0).toISOString()),
  loadedAt: 0,
  loading: false,

  load: async (meId, force = false) => {
    const s = get();
    if (s.loading || !meId || (!force && Date.now() - s.loadedAt < TTL_MS)) return;
    set({ loading: true });
    try {
      const [members, challenges, nudges, feed, board, replies] = await Promise.all([
        clubRepo.getMembers(),
        clubRepo.listChallenges(),
        clubRepo.getNudges(),
        clubRepo.getFeed(30),
        clubRepo.getLeaderboard('week', 'puzzles'),
        clubRepo.getWallReplies(),
      ]);
      set({ notices: build(meId, members, challenges, nudges, feed, board, replies), loadedAt: Date.now() });
    } catch {
      set({ loadedAt: Date.now() });
    } finally {
      set({ loading: false });
    }
  },

  markSeen: () => {
    const seenAt = new Date().toISOString();
    write(SEEN_KEY, seenAt);
    set({ seenAt });
  },
}));

/** Avisos sin ver, más los retos que esperan que los juegues. */
export const unreadCount = (notices: Notice[], seenAt: string) => notices.filter((n) => n.at > seenAt || n.action).length;
