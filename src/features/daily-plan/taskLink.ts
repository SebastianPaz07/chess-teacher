import type { DailyTask } from '@/services/scheduler/dailyPlan';

/** Ruta que abre cada paso del plan del día (el ?daily= marca el paso como hecho al terminarlo). */
export function taskLink(t: DailyTask): string {
  const daily = `daily=${encodeURIComponent(t.id)}`;
  switch (t.kind) {
    case 'review':
      return `/repaso?${daily}`;
    case 'lesson':
      return `/leccion/${t.lessonId}?${daily}`;
    case 'practice':
      return `/practica?${daily}`;
    case 'opening':
      return `/aperturas/${t.openingId}?line=${t.lineIndex}&${daily}`;
    case 'classic':
      return `/partidas?game=${encodeURIComponent(t.gameId)}&${daily}`;
    case 'recommendation':
      switch (t.subtype) {
        case 'book':
        case 'video':
          return t.url ?? '/biblioteca';
        case 'library':
          return '/biblioteca';
        case 'rush':
          return '/rush';
        case 'resource':
          return `/biblioteca?resource=${t.resourceId}`;
        case 'classic':
          return `/partidas?game=${encodeURIComponent(t.gameId!)}`;
      }
  }
}
