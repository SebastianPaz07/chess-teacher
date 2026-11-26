import type { Level } from '@/content/schema';

export interface CoachInput {
  level: Level;
  rating: number;
  stretch: number;
  solved: number;
  attempted: number;
  weak: string[];
  streak: number;
  dailyMinutes: number;
  studiedToday: number;
  stepsDone: number;
  stepsTotal: number;
  restDay: boolean;
  /** Minutos estudiados por día en los últimos 7 días (más viejo → hoy) */
  week: number[];
  trainingDaysPerWeek: number;
}

export interface CoachNote {
  headline: string;
  points: string[];
  /** Próxima meta de rating y cuánto falta */
  goal: { target: number; missing: number; progress: number };
  weekMinutes: number;
  weekGoal: number;
}

const LEVEL_LABEL: Record<Level, string> = { principiante: 'principiante', intermedio: 'intermedio', avanzado: 'avanzado' };

/** Próxima meta: la siguiente centena de rating. */
export function nextGoal(rating: number) {
  const target = Math.floor(rating / 100) * 100 + 100;
  const base = target - 100;
  return { target, missing: target - rating, progress: (rating - base) / 100 };
}

/** Mensaje del entrenador: qué hacer hoy, por qué, y cómo vas. Texto puro, sin efectos. */
export function coachNote(i: CoachInput): CoachNote {
  const points: string[] = [];
  const acc = i.attempted ? Math.round((i.solved / i.attempted) * 100) : null;
  const weekMinutes = i.week.reduce((a, b) => a + b, 0);
  const weekGoal = i.dailyMinutes * Math.max(1, i.trainingDaysPerWeek);

  let headline: string;
  if (i.restDay) headline = 'Hoy toca descanso: si quieres, haz la sesión ligera. Tu racha está a salvo.';
  else if (i.stepsTotal > 0 && i.stepsDone === i.stepsTotal) headline = '¡Sesión completa! Descansa la mente; mañana seguimos.';
  else if (i.stepsDone > 0) headline = `Vas ${i.stepsDone} de ${i.stepsTotal}. Un paso más y terminas la sesión.`;
  else headline = `Hoy son ${i.dailyMinutes} minutos. Empieza por el primer paso; yo te voy guiando.`;

  // Por qué este plan
  if (acc === null || i.attempted < 10) {
    points.push('Estoy midiendo tu nivel: resuelve unos ejercicios y ajusto la dificultad con calma.');
  } else if (i.stretch > 0) {
    points.push(`Aciertas el ${acc} %: subo la dificultad poco a poco (+${i.stretch} puntos) para que sigas creciendo.`);
  } else if (i.stretch < 0) {
    points.push(`Aciertas el ${acc} %: bajo un poco la dificultad para que consolides antes de subir.`);
  } else {
    points.push(`Aciertas el ${acc} %: te mantengo en tu nivel (${LEVEL_LABEL[i.level]}) hasta que lo domines.`);
  }

  if (i.weak.length) points.push(`Tu punto a reforzar: ${i.weak[0].replace(/-/g, ' ')}. Lo verás repetido en tus ejercicios.`);

  if (weekGoal > 0) {
    const pct = Math.min(100, Math.round((weekMinutes / weekGoal) * 100));
    points.push(`Esta semana llevas ${weekMinutes} de ${weekGoal} min (${pct} %).`);
  }

  if (i.streak >= 3) points.push(`${i.streak} días seguidos: la constancia es lo que más rápido te mejora.`);
  if (i.studiedToday > 0 && i.studiedToday < i.dailyMinutes && !i.restDay) points.push(`Hoy llevas ${i.studiedToday} min de estudio activo.`);

  return { headline, points, goal: nextGoal(i.rating), weekMinutes, weekGoal };
}
