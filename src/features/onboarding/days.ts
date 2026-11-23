/** Días de la semana (0 = domingo), en el orden en que se muestran: lunes primero. */
export const WEEK_DAYS = [
  { value: 1, short: 'L', long: 'lunes' },
  { value: 2, short: 'M', long: 'martes' },
  { value: 3, short: 'X', long: 'miércoles' },
  { value: 4, short: 'J', long: 'jueves' },
  { value: 5, short: 'V', long: 'viernes' },
  { value: 6, short: 'S', long: 'sábado' },
  { value: 0, short: 'D', long: 'domingo' },
];

export function formatDays(days: number[]): string {
  if (days.length === 7) return 'todos los días';
  if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))) return 'de lunes a viernes';
  return WEEK_DAYS.filter((d) => days.includes(d.value))
    .map((d) => d.short)
    .join(' · ');
}

export const isTrainingDay = (days: number[], date: Date) => days.length === 0 || days.includes(date.getDay());
