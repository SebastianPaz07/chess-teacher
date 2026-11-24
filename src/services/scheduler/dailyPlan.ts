import { LEVEL_RANK, type ClassicGame, type Exercise, type Lesson, type Level, type Module, type Opening } from '@/content/schema';
import { dayNumber } from '@/lib/date';
import { hashString, seededRandom } from '@/lib/random';
import { pickAdaptive } from '@/services/game/rating';
import { isModuleUnlocked, levelForRating, nextLessons, weakTopics, type ProgressSnapshot } from './progression';
import type { ReviewCard } from './sm2';

export type FocusArea = 'tactica' | 'teoria' | 'finales' | 'medio-juego';

/** Temas de ejercicio que trabaja cada área de refuerzo */
export const FOCUS_TAGS: Record<Exclude<FocusArea, 'teoria'>, string[]> = {
  tactica: ['tactica', 'mate', 'pasillo', 'horquilla', 'clavada', 'ensartada', 'descubierta', 'jaque-doble', 'sacrificio', 'desviacion', 'atraccion', 'despeje', 'interferencia', 'intermedia', 'sobrecarga', 'eliminar-defensor', 'pieza-atrapada', 'captura'],
  finales: ['final', 'final-torres', 'final-peones', 'peon-pasado', 'promocion', 'zugzwang', 'mate-ahogado'],
  'medio-juego': ['medio-juego', 'ataque-al-rey', 'ataque-flanco-dama', 'defensa', 'jugada-tranquila', 'ventaja', 'ventaja-decisiva', 'estrategia'],
};

/**
 * Plan del día: poco pero constante, adaptado al nivel.
 *  - Principiante: repaso · lección · práctica · apertura
 *  - Intermedio:   repaso · lección · cálculo (más ejercicios) · apertura · clásica (días alternos)
 *  - Avanzado:     repaso · cálculo intenso · apertura · clásica · lección solo en días alternos
 */
export type DailyTask =
  | { id: string; kind: 'review'; title: string; cardIds: string[]; minutes: number }
  | { id: string; kind: 'lesson'; title: string; lessonId: string; minutes: number }
  | { id: string; kind: 'practice'; title: string; exerciseIds: string[]; minutes: number }
  | { id: string; kind: 'opening'; title: string; openingId: string; lineIndex: number; minutes: number }
  | { id: string; kind: 'classic'; title: string; gameId: string; minutes: number };

export interface DailyPlanInput {
  date: string;
  modules: Module[];
  progress: ProgressSnapshot;
  dueCards: ReviewCard[];
  rating: number;
  dailyMinutes: number;
  solvedIds: Set<string>;
  trainedLines: Record<string, unknown>;
  /** Pool extra de ejercicios (puzzles importados) que se suma a los de los módulos. */
  puzzlePool?: Exercise[];
  /** Ejercicios inéditos traídos de Lichess: si alcanzan, la práctica del día sale solo de aquí */
  freshPool?: Exercise[];
  /** Áreas que el alumno quiere reforzar */
  focus?: FocusArea[];
  /** Apertura a repasar con más frecuencia y aperturas por conocer */
  favoriteOpening?: string | null;
  exploreOpenings?: string[];
  /** Día de descanso del plan: sesión ligera y opcional */
  restDay?: boolean;
}

/** Nº de ejercicios según el tiempo disponible (10 a 60 min). */
export function practiceCountFor(level: Level, minutes: number): number {
  const [p15, p20, p30] = PRACTICE_COUNT[level];
  if (minutes <= 10) return Math.max(3, p15 - 2);
  if (minutes < 20) return p15;
  if (minutes < 30) return p20;
  if (minutes < 45) return p30;
  if (minutes < 60) return p30 + 4;
  return p30 + 8;
}

/** Nivel efectivo: el mayor entre el test de nivel y el rating actual. */
export function effectiveLevel(progress: ProgressSnapshot, rating: number): Level {
  const byRating = levelForRating(rating);
  const placed = progress.placementLevel;
  if (!placed) return byRating;
  return LEVEL_RANK[placed] >= LEVEL_RANK[byRating] ? placed : byRating;
}

const PRACTICE_COUNT: Record<Level, [number, number, number]> = {
  // [15 min, 20 min, 30 min]
  principiante: [4, 6, 8],
  intermedio: [6, 8, 10],
  avanzado: [8, 10, 14],
};

/** Quita ejercicios muy por debajo del rating si hay material suficiente cerca. */
function nearRating(pool: Exercise[], rating: number, need: number, margin = 300): Exercise[] {
  const near = pool.filter((e) => e.rating >= rating - margin);
  if (near.length >= need) return near;
  // Si no alcanza, los más difíciles disponibles
  return [...pool].sort((a, b) => b.rating - a.rating).slice(0, Math.max(need * 2, near.length));
}

export function generateDailyPlan(input: DailyPlanInput): DailyTask[] {
  const { date, modules, progress, dueCards, rating, solvedIds, puzzlePool, freshPool = [], restDay, focus = [], favoriteOpening, exploreOpenings = [] } = input;
  const dailyMinutes = restDay ? 10 : input.dailyMinutes;
  const rand = seededRandom(hashString(`plan:${date}`));
  const tasks: DailyTask[] = [];
  const level = effectiveLevel(progress, rating);
  const day = dayNumber(date);
  const practiceCount = practiceCountFor(level, dailyMinutes);
  const unlocked = modules.filter((m) => isModuleUnlocked(m, modules, progress));

  // 1. Repaso
  if (dueCards.length) {
    const cards = dueCards.slice(0, Math.max(3, Math.round(dailyMinutes / 4)));
    tasks.push({ id: 'review', kind: 'review', title: `Calentamiento: ${cards.length} repasos`, cardIds: cards.map((c) => c.id), minutes: Math.ceil(cards.length * 0.7) });
  }

  // 2. Lección (los avanzados la tienen en días alternos: priorizamos cálculo)
  const candidates = nextLessons(modules, progress);
  let lesson: Lesson | undefined;
  const lessonToday = !restDay && (dailyMinutes > 10 || day % 2 === 0) && (level !== 'avanzado' || day % 2 === 0 || dailyMinutes >= 30 || focus.includes('teoria'));
  if (candidates.length && lessonToday) {
    lesson = candidates[day % candidates.length];
    tasks.push({ id: `lesson:${lesson.id}`, kind: 'lesson', title: lesson.title, lessonId: lesson.id, minutes: lesson.minutes });
  }

  // 3. Práctica / cálculo adaptativo
  const fresh = freshPool.filter((e) => !solvedIds.has(e.id));
  const basePool: Exercise[] = fresh.length >= practiceCount ? fresh : [...fresh, ...unlocked.flatMap((m) => m.exercises), ...(puzzlePool ?? [])];
  const pool = level === 'principiante' ? basePool : nearRating(basePool, rating, practiceCount);
  const weak = weakTopics(progress);
  const focusTags = new Set([...(lesson?.tags ?? []), ...weak.slice(0, 2)]);
  for (const f of focus) if (f !== 'teoria') FOCUS_TAGS[f].forEach((t) => focusTags.add(t));
  const chosenShare = focus.some((f) => f !== 'teoria') ? 0.7 : 0.5;
  const focused = pool.filter((e) => e.tags.some((t) => focusTags.has(t)));
  // Mitad enfocada en temas débiles / lección, mitad libre (para no sesgar el rating)
  const focusN = Math.min(focused.length, Math.ceil(practiceCount * chosenShare));
  const first = focusN ? pickAdaptive(focused, rating, focusN, solvedIds, rand) : [];
  const taken = new Set(first.map((e) => e.id));
  const rest = pickAdaptive(
    pool.filter((e) => !taken.has(e.id)),
    rating,
    practiceCount - first.length,
    solvedIds,
    rand,
  );
  const exercises = [...first, ...rest];
  if (exercises.length) {
    const label = level === 'principiante' ? `${exercises.length} ejercicios tácticos` : `${exercises.length} posiciones de tu nivel`;
    const title = weak.length ? `${label} · refuerza ${weak[0].replace(/-/g, ' ')}` : label;
    tasks.push({ id: 'practice', kind: 'practice', title, exerciseIds: exercises.map((e) => e.id), minutes: Math.ceil(exercises.length * (level === 'avanzado' ? 2 : 1.5)) });
  }

  // 4. Apertura del día (de módulos desbloqueados)
  const openings: Opening[] = unlocked.flatMap((m) => m.openings);
  if (openings.length && !restDay && dailyMinutes > 10) {
    // La apertura elegida sale ~2 de cada 3 días; las demás rotan (las «por conocer» primero)
    const byId = (id?: string | null) => (id ? modules.flatMap((m) => m.openings).find((x) => x.id === id) : undefined);
    const fav = byId(favoriteOpening);
    const explore = exploreOpenings.map(byId).filter((x): x is Opening => Boolean(x));
    let o = openings[Math.floor(rand() * openings.length)];
    let prefix = 'Apertura del día';
    if (fav && day % 3 !== 2) {
      o = fav;
      prefix = 'Repasa tu apertura';
    } else if (explore.length && (day % 3 === 2 || !fav)) {
      o = explore[day % explore.length];
      prefix = 'Conoce esta apertura';
    }
    const lineIndex = fav && o.id === fav.id ? day % o.lines.length : Math.floor(rand() * o.lines.length);
    tasks.push({ id: `opening:${o.id}#${lineIndex}`, kind: 'opening', title: `${prefix}: ${o.name}`, openingId: o.id, lineIndex, minutes: focus.includes('teoria') ? 5 : 3 });
  }

  // 5. Partida clásica: "adivina la jugada" (cálculo y comprensión estratégica)
  const games: ClassicGame[] = unlocked.flatMap((m) => m.games);
  const classicToday = level === 'avanzado' || (level === 'intermedio' && day % 2 === 1);
  if (games.length && classicToday && !restDay && dailyMinutes >= 20) {
    const g = games[day % games.length];
    tasks.push({ id: `classic:${g.id}`, kind: 'classic', title: `Adivina la jugada: ${g.white} – ${g.black}`, gameId: g.id, minutes: 6 });
  }

  return tasks;
}
