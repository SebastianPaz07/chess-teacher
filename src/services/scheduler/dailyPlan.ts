import { pickBook, pickOpeningStudy } from '@/content/readings';
import { LEVEL_RANK, type ClassicGame, type Exercise, type Lesson, type Level, type Module, type Opening } from '@/content/schema';
import { dayNumber } from '@/lib/date';
import { hashString, seededRandom } from '@/lib/random';
import { pickVaried } from '@/services/game/rating';
import { motifOf } from '@/services/lichess/themes';
import { lessonPart } from './lessonPart';
import { isModuleUnlocked, levelForRating, nextLessons, weakTopics, type ProgressSnapshot } from './progression';
import type { ReviewCard } from './sm2';
import { THEMES, type ThemeId } from './weekPlan';

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
  /** `minutes`: lo de hoy (pasos `fromStep` a `toStep`, sin incluir este); `totalMinutes`: la lección entera */
  | { id: string; kind: 'lesson'; title: string; lessonId: string; minutes: number; totalMinutes: number; fromStep: number; toStep: number; videoMinutes: number }
  | { id: string; kind: 'practice'; title: string; exerciseIds: string[]; minutes: number }
  | { id: string; kind: 'opening'; title: string; openingId: string; lineIndex: number; minutes: number }
  | { id: string; kind: 'classic'; title: string; gameId: string; minutes: number }
  | { id: string; kind: 'recommendation'; title: string; subtype: 'library' | 'classic' | 'rush' | 'book' | 'video'; resourceId?: string; gameId?: string; note?: string; minutes: number };

/** Las recomendaciones son opcionales (ratos libres): no cuentan como pasos del plan. */
export const isCoreTask = (t: DailyTask) => t.kind !== 'recommendation';

/**
 * Cuánto subir la dificultad sobre el rating actual según tu puntería reciente:
 * si te va bien, los ejercicios se ponen un poco más difíciles (de 25 en 25);
 * si te cuesta, se afloja. Cambios pequeños para que el avance sea muy gradual.
 */
export function difficultyStretch(solved: number, attempted: number): number {
  if (attempted < 10) return 0;
  const acc = solved / attempted;
  if (acc >= 0.85) return 100;
  if (acc >= 0.75) return 60;
  if (acc >= 0.6) return 25;
  if (acc >= 0.45) return 0;
  return -50;
}

export interface DailyPlanInput {
  date: string;
  modules: Module[];
  progress: ProgressSnapshot;
  dueCards: ReviewCard[];
  rating: number;
  dailyMinutes: number;
  solvedIds: Set<string>;
  trainedLines: Record<string, unknown>;
  /** Lecciones a medias: en qué paso quedó cada una */
  lessonDrafts?: Record<string, { index: number }>;
  /** Pool extra de ejercicios (puzzles importados) que se suma a los de los módulos. */
  puzzlePool?: Exercise[];
  /** Ejercicios inéditos traídos de Lichess: se mezclan con el resto del material */
  freshPool?: Exercise[];
  /** Áreas que el alumno quiere reforzar */
  focus?: FocusArea[];
  /** Apertura a repasar con más frecuencia y aperturas por conocer */
  favoriteOpening?: string | null;
  exploreOpenings?: string[];
  /** Día de descanso del plan: sesión ligera y opcional */
  restDay?: boolean;
  /** false = principiante absoluto: solo lecciones de fundamentos, sin ejercicios */
  learnedBasics?: boolean;
  /** Ajuste de dificultad sobre el rating (ver difficultyStretch) */
  stretch?: number;
  /** Tema del día según el plan semanal */
  theme?: ThemeId | null;
}

/** Minutos del día que se reservan para la lección: las largas se avanzan por partes. */
export const lessonBudget = (dailyMinutes: number) => Math.max(5, Math.round(dailyMinutes * 0.3));

/** Minutos que se estiman por ejercicio. */
export const MINUTES_PER_EXERCISE: Record<Level, number> = { principiante: 1.5, intermedio: 1.5, avanzado: 2 };

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

function generateRecommendations(input: {
  date: string;
  level: Level;
  dailyMinutes: number;
  day: number;
  favoriteOpening?: string | null;
  exploreOpenings?: string[];
  modules: Module[];
  focus?: FocusArea[];
  weak?: string[];
}): DailyTask[] {
  const { day, level, dailyMinutes, modules } = input;
  const recs: DailyTask[] = [];
  const rotation = day % 7;

  // Temas que más te conviene leer: lo que elegiste reforzar + tus puntos débiles
  const wanted = new Set<string>(input.focus ?? []);
  for (const w of input.weak ?? []) {
    for (const [area, tags] of Object.entries(FOCUS_TAGS)) if (tags.includes(w)) wanted.add(area);
  }
  const wantedTags = [...wanted];

  // 0. Material de estudio de una apertura que elegiste (video de clase o libro)
  const chosen = [input.favoriteOpening, ...(input.exploreOpenings ?? [])]
    .map((id) => modules.flatMap((m) => m.openings).find((o) => o.id === id))
    .filter((o): o is Opening => Boolean(o));
  const study = pickOpeningStudy(chosen, day);
  if (study) {
    const video = study.resource.type === 'video';
    recs.push({
      id: `rec:opening-study:${study.resource.id}:${day}`,
      kind: 'recommendation',
      title: `${video ? 'Mira' : 'Lee'}: ${study.title}`,
      subtype: video ? 'video' : 'book',
      resourceId: study.resource.id,
      note: study.why,
      minutes: 0,
    });
  }

  // Un libro de la biblioteca para tus ratos libres (siempre hay uno)
  const book = pickBook(level, wantedTags, day);
  if (book) {
    recs.push({
      id: `rec:book:${book.resource.id}:${day}`,
      kind: 'recommendation',
      title: `Lee: ${book.title}`,
      subtype: 'book',
      resourceId: book.resource.id,
      note: book.why,
      minutes: 0,
    });
  }

  // 1. Biblioteca (cada 3 días)
  if (rotation % 3 === 0) {
    recs.push({
      id: `rec:library:${day}`,
      kind: 'recommendation',
      title: 'Visita la Biblioteca para consultar libros y ver clases grabadas',
      subtype: 'library',
      minutes: 0,
    });
  }

  // 2. Rush mode (intermedio/avanzado, 2x por semana)
  if ((level === 'intermedio' || level === 'avanzado') && (rotation % 3 === 1)) {
    recs.push({
      id: `rec:rush:${day}`,
      kind: 'recommendation',
      title: 'Prueba el modo Rush: 3 minutos de táctica intensa',
      subtype: 'rush',
      minutes: 0,
    });
  }

  // 3. Partida clásica (en planes cortos que no tienen classic game)
  if (rotation % 5 === 3 && dailyMinutes < 20) {
    const games = modules.flatMap(m => m.games);
    if (games.length > 0) {
      const game = games[day % games.length];
      recs.push({
        id: `rec:classic:${game.id}:${day}`,
        kind: 'recommendation',
        title: `Ve esta partida clásica: ${game.white} – ${game.black}`,
        subtype: 'classic',
        gameId: game.id,
        minutes: 0,
      });
    }
  }

  return recs.slice(0, 4); // Máximo 4 recomendaciones (el material de estudio va primero)
}

export function generateDailyPlan(input: DailyPlanInput): DailyTask[] {
  const { date, modules, progress, dueCards, rating, solvedIds, puzzlePool, freshPool = [], restDay, focus = [], favoriteOpening, exploreOpenings = [] } = input;
  const basicsFirst = input.learnedBasics === false;
  const dailyMinutes = restDay ? 10 : input.dailyMinutes;
  const rand = seededRandom(hashString(`plan:${date}`));
  const tasks: DailyTask[] = [];
  const level = effectiveLevel(progress, rating);
  const day = dayNumber(date);
  const theme = !restDay && input.theme ? THEMES[input.theme] : undefined;
  const themeTags = new Set(theme?.tags ?? []);
  const practiceCount = practiceCountFor(level, dailyMinutes);
  const unlocked = modules.filter((m) => isModuleUnlocked(m, modules, progress));

  // 1. Repaso
  if (dueCards.length && !basicsFirst) {
    const cards = dueCards.slice(0, Math.max(3, Math.round(dailyMinutes / 4)));
    tasks.push({ id: 'review', kind: 'review', title: `Calentamiento: ${cards.length} repasos`, cardIds: cards.map((c) => c.id), minutes: Math.ceil(cards.length * 0.7) });
  }

  // 2. Lección (los avanzados la tienen en días alternos: priorizamos cálculo).
  // Primero la que encaja con el tema del día; si no hay, la siguiente del índice.
  const candidates = nextLessons(modules, progress);
  let lesson: Lesson | undefined;
  const lessonToday = basicsFirst || !restDay && (dailyMinutes > 10 || day % 2 === 0) && (level !== 'avanzado' || day % 2 === 0 || dailyMinutes >= 30 || focus.includes('teoria'));
  if (candidates.length && lessonToday) {
    const drafts = input.lessonDrafts ?? {};
    // Lo que dejaste a medias va antes que el tema del día
    lesson = basicsFirst
      ? candidates[0]
      : (candidates.find((l) => drafts[l.id]) ?? candidates.find((l) => l.tags.some((t) => themeTags.has(t))) ?? (theme ? candidates[0] : candidates[day % candidates.length]));
    const from = Math.min(drafts[lesson.id]?.index ?? 0, lesson.steps.length - 1);
    const part = lessonPart(lesson, from, basicsFirst ? Infinity : lessonBudget(dailyMinutes));
    const partial = part.from > 0 || part.to < lesson.steps.length;
    tasks.push({
      id: `lesson:${lesson.id}`,
      kind: 'lesson',
      title: partial ? `Avanza en: ${lesson.title}` : lesson.title,
      lessonId: lesson.id,
      minutes: part.minutes,
      totalMinutes: lesson.minutes,
      fromStep: part.from,
      toStep: part.to,
      videoMinutes: part.videoMinutes,
    });
  }

  // Principiante absoluto: primero aprende a mover las piezas, sin ejercicios
  if (basicsFirst) return tasks;

  // Presupuesto de tiempo: el plan respeta los minutos que elegiste.
  // Repaso y lección van primero; apertura y partida clásica solo entran si caben
  // dejando al menos unos ejercicios; el resto del tiempo es práctica.
  const perExercise = MINUTES_PER_EXERCISE[level];
  let remaining = dailyMinutes - tasks.reduce((a, t) => a + t.minutes, 0);
  const minPractice = Math.ceil(3 * perExercise);

  const openingPick = pickOpening();
  // Una línea que nunca has entrenado lleva más tiempo: primero se estudia y luego se practica
  const openingIsNew = Boolean(openingPick) && !(`${openingPick!.opening.id}#${openingPick!.lineIndex}` in (input.trainedLines ?? {}));
  const openingMinutes = focus.includes('teoria') || openingIsNew || theme?.id === 'apertura' ? 5 : 3;
  const wantOpening = Boolean(openingPick) && remaining - openingMinutes >= minPractice;
  if (wantOpening) remaining -= openingMinutes;

  const games: ClassicGame[] = unlocked.flatMap((m) => m.games);
  const classicToday = theme ? theme.id === 'maestros' || (level === 'avanzado' && day % 2 === 0) : level === 'avanzado' || (level === 'intermedio' && day % 2 === 1);
  const CLASSIC_MINUTES = 6;
  const wantClassic = games.length > 0 && classicToday && !restDay && dailyMinutes >= 20 && remaining - CLASSIC_MINUTES >= minPractice;
  if (wantClassic) remaining -= CLASSIC_MINUTES;

  const practiceTarget = Math.max(2, Math.min(practiceCount, Math.floor(remaining / perExercise)));
  // La dificultad sube poco a poco si te va bien (ver difficultyStretch)
  const target = rating + (input.stretch ?? 0);

  // 3. Práctica / cálculo adaptativo
  const fresh = freshPool.filter((x) => !solvedIds.has(x.id));
  const basePool: Exercise[] = [...fresh, ...unlocked.flatMap((m) => m.exercises), ...(puzzlePool ?? [])];
  const pool = level === 'principiante' ? basePool : nearRating(basePool, target, practiceTarget);
  const weak = weakTopics(progress);
  const focusTags = new Set([...(lesson?.tags ?? []), ...weak.slice(0, 2)]);
  for (const f of focus) if (f !== 'teoria') FOCUS_TAGS[f].forEach((t) => focusTags.add(t));
  const chosen: Exercise[] = [];
  const add = (from: Exercise[], n: number, maxPerKind: number) => {
    if (n > 0 && from.length) chosen.push(...pickVaried(from, target, n, solvedIds, rand, motifOf, maxPerKind, chosen));
  };
  // Primero el tema del día, luego tus puntos a reforzar y el resto bien variado
  const matching = (tags: Set<string>) => pool.filter((x) => x.themes.some((t) => tags.has(t)));
  if (theme) add(matching(themeTags), Math.ceil(practiceTarget * 0.6), Math.max(1, Math.ceil(practiceTarget / 4)));
  const chosenShare = theme ? 0.2 : focus.some((f) => f !== 'teoria') ? 0.7 : 0.5;
  add(matching(focusTags), Math.min(practiceTarget - chosen.length, Math.ceil(practiceTarget * chosenShare)), Math.max(1, Math.ceil(practiceTarget / 4)));
  // Resto libre (para no sesgar el rating)
  add(pool, practiceTarget - chosen.length, 1);
  if (chosen.length) {
    const label = level === 'principiante' ? `${chosen.length} ejercicios tácticos` : `${chosen.length} posiciones de tu nivel`;
    const title = theme ? `${chosen.length} ejercicios · ${theme.title}` : weak.length ? `${label} · refuerza ${weak[0].replace(/-/g, ' ')}` : label;
    // De menor a mayor dificultad
    const exerciseIds = [...chosen].sort((x, y) => x.rating - y.rating).map((x) => x.id);
    tasks.push({ id: 'practice', kind: 'practice', title, exerciseIds, minutes: Math.ceil(chosen.length * perExercise) });
  }

  // 4. Apertura del día (de módulos desbloqueados)
  if (wantOpening && openingPick) {
    const { opening: o, lineIndex } = openingPick;
    const prefix = openingIsNew ? 'Estudia y practica la apertura' : openingPick.prefix;
    tasks.push({ id: `opening:${o.id}#${lineIndex}`, kind: 'opening', title: `${prefix}: ${o.name}`, openingId: o.id, lineIndex, minutes: openingMinutes });
  }

  // 5. Partida clásica: verla completa y practicar sus jugadas (cálculo y comprensión estratégica)
  if (wantClassic) {
    const g = games[day % games.length];
    tasks.push({ id: `classic:${g.id}`, kind: 'classic', title: `Estudia y practica: ${g.white} – ${g.black}`, gameId: g.id, minutes: CLASSIC_MINUTES });
  }

  // 6. Recomendaciones para los ratos libres (no cuentan como pasos del plan)
  const recommendations = generateRecommendations({ date, level, dailyMinutes, day, favoriteOpening, exploreOpenings, modules, focus, weak });
  tasks.push(...recommendations);

  return tasks;

  /** Apertura del día: la elegida sale ~2 de cada 3 días; las demás rotan (las «por conocer» primero). */
  function pickOpening(): { opening: Opening; prefix: string; lineIndex: number } | null {
    const openings: Opening[] = unlocked.flatMap((m) => m.openings);
    if (!openings.length || restDay || dailyMinutes <= 10) return null;
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
    // Se avanza por las líneas que aún no has entrenado; cuando ya las viste todas, rotan
    const untrained = o.lines.findIndex((_, i) => !(`${o.id}#${i}` in (input.trainedLines ?? {})));
    const lineIndex = untrained >= 0 ? untrained : day % o.lines.length;
    return { opening: o, prefix, lineIndex };
  }
}
