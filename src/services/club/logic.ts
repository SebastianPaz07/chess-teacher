import { addDays, daysBetween, diffDays, weekStart } from '@/lib/date';
import { hashString } from '@/lib/random';
import type { DailyActivity, LeaderMetric, LeaderPeriod, LeaderRow, Member, MemberRole, MemberStats, WeekMetric } from './types';

/** Racha visible hoy: se pierde si pasó más de un día sin practicar. */
export function visibleStreak(stats: Pick<MemberStats, 'streak' | 'lastActive'>, today: string): number {
  if (!stats.lastActive) return 0;
  return diffDays(stats.lastActive, today) <= 1 ? stats.streak : 0;
}

export function sumActivity(activity: DailyActivity[], from: string, to: string, key: keyof Omit<DailyActivity, 'day'>): number {
  return activity.filter((a) => a.day >= from && a.day <= to).reduce((acc, a) => acc + a[key], 0);
}

export interface LeaderInput {
  member: Member;
  stats: MemberStats;
  activity: DailyActivity[];
}

function valueFor(x: LeaderInput, period: LeaderPeriod, metric: LeaderMetric, asOf: string): number {
  const from = period === 'week' ? weekStart(asOf) : '0000-00-00';
  switch (metric) {
    case 'xp':
      // Total: XP actual menos lo ganado después de `asOf` (para el puesto de ayer)
      return period === 'week' ? sumActivity(x.activity, from, asOf, 'xp') : x.stats.xp - sumActivity(x.activity, addDays(asOf, 1), '9999-12-31', 'xp');
    case 'puzzles':
      return period === 'week' ? sumActivity(x.activity, from, asOf, 'puzzles') : x.stats.puzzlesSolved;
    case 'minutes':
      return sumActivity(x.activity, from, asOf, 'minutes');
    case 'rating':
      return x.stats.rating;
    case 'streak':
      return visibleStreak(x.stats, asOf);
  }
}

function rank(inputs: LeaderInput[], period: LeaderPeriod, metric: LeaderMetric, asOf: string) {
  const rows = inputs.map((x) => ({ member: x.member, value: valueFor(x, period, metric, asOf) }));
  rows.sort((a, b) => b.value - a.value || a.member.name.localeCompare(b.member.name));
  const ranks = new Map<string, number>();
  let last = Number.NaN;
  let lastRank = 0;
  rows.forEach((r, i) => {
    const rk = r.value === last ? lastRank : i + 1;
    ranks.set(r.member.id, rk);
    last = r.value;
    lastRank = rk;
  });
  return { rows, ranks };
}

/**
 * Tabla del club. El puesto "de ayer" se calcula con los mismos datos
 * cortados al día anterior (en semana nueva no hay comparación).
 */
export function computeLeaderboard(inputs: LeaderInput[], period: LeaderPeriod, metric: LeaderMetric, today: string): LeaderRow[] {
  const now = rank(inputs, period, metric, today);
  const yesterday = addDays(today, -1);
  const comparable = !(period === 'week' && weekStart(yesterday) !== weekStart(today)) && metric !== 'rating';
  const prev = comparable ? rank(inputs, period, metric, yesterday) : null;
  return now.rows.map((r) => ({ member: r.member, value: r.value, rank: now.ranks.get(r.member.id)!, prevRank: prev?.ranks.get(r.member.id) ?? null }));
}

/** La meta semanal premia el estudio: sobre todo ejercicios y minutos. */
const WEEK_METRICS: WeekMetric[] = ['puzzles', 'minutes', 'puzzles', 'lessons', 'minutes'];
const PER_MEMBER: Record<WeekMetric, number> = { puzzles: 30, minutes: 60, xp: 350, lessons: 3 };

/** Meta colectiva de la semana: rota la métrica y se escala por tamaño del club y la semana anterior. */
export function weeklyGoal(clubId: string, week: string, members: number, lastWeekTotal: number | null): { metric: WeekMetric; target: number } {
  const metric = WEEK_METRICS[hashString(`${clubId}:${week}`) % WEEK_METRICS.length];
  let target = PER_MEMBER[metric] * Math.max(1, members);
  if (lastWeekTotal !== null && lastWeekTotal > 0) target = Math.round((target + lastWeekTotal * 1.1) / 2);
  const step = metric === 'xp' ? 50 : metric === 'puzzles' || metric === 'minutes' ? 5 : 1;
  return { metric, target: Math.max(step, Math.round(target / step) * step) };
}

export const WEEK_METRIC_LABEL: Record<WeekMetric, { label: string; icon: string; verb: string }> = {
  puzzles: { label: 'ejercicios', icon: 'puzzle', verb: 'Resolver' },
  minutes: { label: 'minutos de estudio', icon: 'clock', verb: 'Sumar' },
  xp: { label: 'XP', icon: 'diamond', verb: 'Ganar' },
  lessons: { label: 'lecciones', icon: 'book-open', verb: 'Completar' },
};

export function weekDays(today: string): string[] {
  return daysBetween(weekStart(today), today);
}

/** Organizador y colaboradores pueden gestionar el club (miembros, invitaciones). */
export const canManage = (role: MemberRole | undefined): boolean => role === 'owner' || role === 'manager';

export const ROLE_LABEL: Record<MemberRole, string> = { owner: 'Organizador', manager: 'Colaborador', member: 'Participante' };

/** Máximo de caracteres de una publicación o comentario (igual que `activity_feed.text` en la base) */
export const WALL_TEXT_MAX = 300;

/** Limpia lo escrito en el muro; lanza un error si queda vacío o es demasiado largo. */
export function cleanWallText(text: string): string {
  const clean = text.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!clean) throw new Error('Escribe algo antes de enviar');
  if (clean.length > WALL_TEXT_MAX) throw new Error(`Máximo ${WALL_TEXT_MAX} caracteres`);
  return clean;
}

/** ¿Puede `actor` sacar a `target` del club? Nadie saca al organizador ni a sí mismo. */
export function canRemove(actor: Member | undefined, target: Member): boolean {
  if (!actor || actor.id === target.id || target.role === 'owner') return false;
  if (actor.role === 'owner') return true;
  return actor.role === 'manager' && target.role === 'member';
}
