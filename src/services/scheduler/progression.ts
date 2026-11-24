import { LEVEL_RANK, type Lesson, type Level, type Module } from '@/content/schema';

export interface LessonRecord {
  stars: number;
  bestMistakes: number;
  completedAt: string;
  times: number;
  /** Marcada como "ya la domino": cuenta como avance pero sin estrellas ni XP */
  skipped?: boolean;
}

export interface MasteryRecord {
  correct: number;
  total: number;
}

export interface ProgressSnapshot {
  lessons: Record<string, LessonRecord>;
  mastery: Record<string, MasteryRecord>;
  placementLevel: Level | null;
}

export const UNLOCK_THRESHOLD = 0.8;

export function moduleCompletion(m: Module, p: ProgressSnapshot): number {
  if (!m.lessons.length) return 0;
  return m.lessons.filter((l) => p.lessons[l.id]).length / m.lessons.length;
}

export function moduleStars(m: Module, p: ProgressSnapshot): number {
  return m.lessons.reduce((acc, l) => acc + (p.lessons[l.id]?.stars ?? 0), 0);
}

/**
 * Un módulo está desbloqueado si sus prerrequisitos están al 80 %,
 * o si el test de nivel ubicó al alumno en un nivel ≥ al del módulo.
 */
export function isModuleUnlocked(m: Module, all: Module[], p: ProgressSnapshot): boolean {
  if (p.placementLevel && LEVEL_RANK[m.level] <= LEVEL_RANK[p.placementLevel]) return true;
  return m.prerequisites.every((id) => {
    const req = all.find((x) => x.id === id);
    return !req || moduleCompletion(req, p) >= UNLOCK_THRESHOLD;
  });
}

/**
 * Un módulo está "dominado" cuando el test de nivel ubicó al alumno por
 * encima del nivel del módulo: no aparece en el plan, pero sigue abierto
 * como repaso opcional.
 */
export function isModuleMastered(m: Module, p: ProgressSnapshot): boolean {
  return Boolean(p.placementLevel && LEVEL_RANK[m.level] < LEVEL_RANK[p.placementLevel]);
}

/** Nivel según rating de entrenamiento. */
export function levelForRating(rating: number): Level {
  return rating > 1600 ? 'avanzado' : rating >= 1100 ? 'intermedio' : 'principiante';
}

/** Dentro de un módulo las lecciones van en orden. */
export function isLessonUnlocked(lesson: Lesson, m: Module, all: Module[], p: ProgressSnapshot): boolean {
  if (!isModuleUnlocked(m, all, p)) return false;
  if (isModuleMastered(m, p)) return true;
  const idx = m.lessons.findIndex((l) => l.id === lesson.id);
  return idx <= 0 || Boolean(p.lessons[m.lessons[idx - 1].id]);
}

export type NodeState = 'locked' | 'available' | 'in-progress' | 'completed' | 'mastered';

export function moduleState(m: Module, all: Module[], p: ProgressSnapshot): NodeState {
  if (!isModuleUnlocked(m, all, p)) return 'locked';
  const c = moduleCompletion(m, p);
  if (c >= 1) return 'completed';
  if (isModuleMastered(m, p)) return 'mastered';
  return c > 0 ? 'in-progress' : 'available';
}

export function masteryRatio(r?: MasteryRecord): number {
  if (!r || r.total === 0) return 0;
  return r.correct / r.total;
}

/** Temas con maestría < 70 % y al menos 2 intentos. */
export function weakTopics(p: ProgressSnapshot, minAttempts = 2): string[] {
  return Object.entries(p.mastery)
    .filter(([, r]) => r.total >= minAttempts && masteryRatio(r) < 0.7)
    .sort((a, b) => masteryRatio(a[1]) - masteryRatio(b[1]))
    .map(([tag]) => tag);
}

/** Siguiente lección pendiente en módulos desbloqueados y no dominados. */
export function nextLessons(all: Module[], p: ProgressSnapshot): Lesson[] {
  const out: Lesson[] = [];
  for (const m of all) {
    if (!isModuleUnlocked(m, all, p) || isModuleMastered(m, p)) continue;
    const pending = m.lessons.find((l) => !p.lessons[l.id]);
    if (pending) out.push(pending);
  }
  return out;
}
