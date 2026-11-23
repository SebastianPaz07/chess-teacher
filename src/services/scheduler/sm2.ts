import { addDays } from '@/lib/date';

/** Repetición espaciada SM-2 (SuperMemo 2), versión simplificada. */
export interface ReviewCard {
  id: string;
  kind: 'exercise' | 'opening-line';
  /** exerciseId, o `${openingId}#${lineIndex}` */
  ref: string;
  ease: number;
  interval: number;
  reps: number;
  due: string;
  lapses: number;
}

/** quality: 0-5 (5 = perfecto, 3 = con errores, <3 = fallado) */
export type Quality = 0 | 1 | 2 | 3 | 4 | 5;

export function newCard(kind: ReviewCard['kind'], ref: string, today: string): ReviewCard {
  return { id: `${kind}:${ref}`, kind, ref, ease: 2.5, interval: 0, reps: 0, due: addDays(today, 1), lapses: 0 };
}

export function review(card: ReviewCard, quality: Quality, today: string): ReviewCard {
  let { ease, interval, reps, lapses } = card;
  if (quality < 3) {
    reps = 0;
    interval = 1;
    lapses += 1;
  } else {
    reps += 1;
    interval = reps === 1 ? 1 : reps === 2 ? 3 : Math.round(interval * ease);
  }
  ease = Math.max(1.3, ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  return { ...card, ease: Number(ease.toFixed(2)), interval, reps, lapses, due: addDays(today, interval) };
}

export const isDue = (card: ReviewCard, today: string) => card.due <= today;

/** Calidad a partir del desempeño en un ejercicio. */
export function qualityFromResult(success: boolean, mistakes: number, hintsUsed = 0): Quality {
  if (!success) return 1;
  if (mistakes === 0 && hintsUsed === 0) return 5;
  if (mistakes <= 1) return 4;
  return 3;
}
