import type { DailyTask } from '@/services/scheduler/dailyPlan';

export const TASK_META: Record<DailyTask['kind'], { icon: string; label: string }> = {
  review: { icon: 'review', label: 'Repaso' },
  lesson: { icon: 'book-open', label: 'Lección' },
  practice: { icon: 'crosshair', label: 'Ejercicios' },
  opening: { icon: 'books', label: 'Apertura' },
  classic: { icon: 'classic', label: 'Partida clásica' },
  recommendation: { icon: 'hint', label: 'Recomendación' },
};
