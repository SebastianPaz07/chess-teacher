import type { Lesson, Step } from '@/content/schema';

/** Si lo que quedaría para otro día es tan poco, se incluye hoy. */
const LEFTOVER_MIN = 2;

/** Minutos de un paso: los videos duran lo que dura el video; el resto se reparte los demás minutos. */
export function stepMinutes(lesson: Lesson, step: Step): number {
  if (step.type === 'video') return step.minutes;
  let videos = 0;
  let others = 0;
  for (const s of lesson.steps) {
    if (s.type === 'video') videos += s.minutes;
    else others++;
  }
  return Math.max(0.5, (lesson.minutes - videos) / Math.max(1, others));
}

export interface LessonPart {
  /** Pasos [from, to) que tocan hoy */
  from: number;
  to: number;
  minutes: number;
  /** Minutos de video dentro de esos pasos */
  videoMinutes: number;
}

/**
 * La parte de la lección que cabe en `budget` minutos, empezando donde quedaste.
 * Un video no se corta: si no cabe, la parte termina antes; si es lo siguiente, va entero.
 */
export function lessonPart(lesson: Lesson, from: number, budget: number): LessonPart {
  const cost = lesson.steps.map((s) => stepMinutes(lesson, s));
  let to = from;
  let minutes = 0;
  while (to < lesson.steps.length && (to === from || minutes + cost[to] <= budget + 0.01)) minutes += cost[to++];
  const rest = cost.slice(to).reduce((a, m) => a + m, 0);
  if (rest > 0 && rest <= LEFTOVER_MIN) {
    to = lesson.steps.length;
    minutes += rest;
  }
  const videoMinutes = lesson.steps.slice(from, to).reduce((a, s) => a + (s.type === 'video' ? s.minutes : 0), 0);
  return { from, to, minutes: Math.max(1, Math.round(minutes)), videoMinutes };
}
