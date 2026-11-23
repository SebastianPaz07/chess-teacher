/**
 * Fechas "de juego" en formato YYYY-MM-DD (hora local).
 * `setDayOffset` permite simular días futuros en modo depuración (Ajustes).
 */
let dayOffset = 0;

export function setDayOffset(days: number) {
  dayOffset = days;
}

export function getDayOffset() {
  return dayOffset;
}

export function now(): Date {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  return d;
}

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayKey(): string {
  return toDateKey(now());
}

export function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

/** Días transcurridos de `a` a `b` (b - a). */
export function diffDays(a: string, b: string): number {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((t2 - t1) / 86_400_000);
}

/** Número de día estable (para rotaciones deterministas). */
export function dayNumber(dateKey: string): number {
  return diffDays('2024-01-01', dateKey);
}

/** Lunes (YYYY-MM-DD) de la semana ISO que contiene `dateKey`. */
export function weekStart(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay(); // 0 = domingo
  return addDays(dateKey, -((dow + 6) % 7));
}

/** Días de la semana (lunes → hoy) incluidos en el rango. */
export function daysBetween(from: string, to: string): string[] {
  const n = diffDays(from, to);
  return n < 0 ? [] : Array.from({ length: n + 1 }, (_, i) => addDays(from, i));
}
