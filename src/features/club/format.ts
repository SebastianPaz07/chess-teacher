import { now } from '@/lib/date';

const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

/** «hace 5 min», «ayer», «hace 3 días». */
export function timeAgo(iso: string): string {
  const secs = Math.round((new Date(iso).getTime() - now().getTime()) / 1000);
  const abs = Math.abs(secs);
  if (abs < 60) return 'ahora';
  if (abs < 3600) return rtf.format(Math.round(secs / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(secs / 3600), 'hour');
  return rtf.format(Math.round(secs / 86400), 'day');
}

/** «quedan 2 d», «quedan 5 h». */
export function timeLeft(iso: string): string {
  const ms = new Date(iso).getTime() - now().getTime();
  if (ms <= 0) return 'vencido';
  const h = Math.floor(ms / 3_600_000);
  return h >= 24 ? `quedan ${Math.floor(h / 24)} d` : h >= 1 ? `quedan ${h} h` : `quedan ${Math.max(1, Math.round(ms / 60000))} min`;
}

export function formatMs(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
