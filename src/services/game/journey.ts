/** Trayectoria del alumno: desde cuándo aprende y cuánto ha estudiado. */
import { diffDays } from '@/lib/date';
import type { DayActivity } from './engine';

export interface JourneyData {
  /** Día en que armó su primer plan (quien ya usaba la app no lo tiene) */
  startedAt?: string | null;
  history?: Record<string, number>;
  activityLog?: Record<string, DayActivity>;
}

/** Días transcurridos desde el primer rastro en la app (0 = hoy es el primer día). */
export function daysLearning({ startedAt, history, activityLog }: JourneyData, today: string): number {
  const days = [startedAt, ...Object.keys(history ?? {}), ...Object.keys(activityLog ?? {})].filter((d): d is string => Boolean(d)).sort();
  return days.length ? Math.max(0, diffDays(days[0], today)) : 0;
}

export function studySeconds(activityLog: Record<string, DayActivity> | undefined): number {
  return Object.values(activityLog ?? {}).reduce((total, day) => total + (day.seconds ?? 0), 0);
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** 3 → «3 días», 21 → «3 semanas», 90 → «3 meses», 800 → «2 años». */
export function timeSpan(days: number): string {
  if (days < 14) return plural(days, 'día', 'días');
  if (days < 60) return plural(Math.floor(days / 7), 'semana', 'semanas');
  if (days < 365) return plural(Math.floor(days / 30), 'mes', 'meses');
  return plural(Math.floor(days / 365), 'año', 'años');
}

export function journeyMessage(days: number, fromZero: boolean): string {
  if (days < 1) return 'Hoy empieza tu camino';
  return `Llevas ${timeSpan(days)} ${fromZero ? 'aprendiendo desde cero' : 'entrenando'}`;
}

export function studyLabel(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const rest = minutes % 60;
  return rest ? `${Math.floor(minutes / 60)} h ${rest} min` : `${Math.floor(minutes / 60)} h`;
}
