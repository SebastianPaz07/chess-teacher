import { describe, expect, it } from 'vitest';
import { modules } from '@/content/registry';
import { addDays } from '@/lib/date';
import { generateDailyPlan } from './dailyPlan';
import { isLessonUnlocked, isModuleMastered, isModuleUnlocked, moduleState, nextLessons, weakTopics, type ProgressSnapshot } from './progression';
import { estimatePlacement, nextTarget, ratingFromElo } from './placement';
import { allLessons } from '@/content/registry';
import { isDue, newCard, qualityFromResult, review } from './sm2';

const D = '2026-11-22';
const empty: ProgressSnapshot = { lessons: {}, mastery: {}, placementLevel: null };
const get = (id: string) => modules.find((m) => m.id === id)!;

describe('SM-2', () => {
  it('intervalos crecientes al acertar y reinicio al fallar', () => {
    let c = newCard('exercise', 'x', D);
    expect(c.due).toBe(addDays(D, 1));
    c = review(c, 5, D);
    expect(c.interval).toBe(1);
    c = review(c, 5, D);
    expect(c.interval).toBe(3);
    c = review(c, 5, D);
    expect(c.interval).toBeGreaterThanOrEqual(7);
    c = review(c, 1, D);
    expect(c.interval).toBe(1);
    expect(c.lapses).toBe(1);
    expect(isDue(c, addDays(D, 1))).toBe(true);
    expect(qualityFromResult(false, 0)).toBe(1);
    expect(qualityFromResult(true, 0)).toBe(5);
  });
});

describe('progresión', () => {
  it('al inicio solo fundamentos está desbloqueado', () => {
    expect(isModuleUnlocked(get('fundamentos'), modules, empty)).toBe(true);
    expect(isModuleUnlocked(get('tactica'), modules, empty)).toBe(false);
    expect(isModuleUnlocked(get('clasicos'), modules, empty)).toBe(false);
  });
  it('completar fundamentos desbloquea táctica y aperturas', () => {
    const lessons = Object.fromEntries(get('fundamentos').lessons.map((l) => [l.id, { stars: 3, bestMistakes: 0, completedAt: D, times: 1 }]));
    const p = { ...empty, lessons };
    expect(isModuleUnlocked(get('tactica'), modules, p)).toBe(true);
    expect(isModuleUnlocked(get('aperturas-blancas'), modules, p)).toBe(true);
    expect(isModuleUnlocked(get('estrategia'), modules, p)).toBe(false);
  });
  it('las lecciones van en orden', () => {
    const m = get('fundamentos');
    expect(isLessonUnlocked(m.lessons[0], m, modules, empty)).toBe(true);
    expect(isLessonUnlocked(m.lessons[1], m, modules, empty)).toBe(false);
  });
  it('el test de nivel desbloquea por nivel', () => {
    const p = { ...empty, placementLevel: 'intermedio' as const };
    expect(isModuleUnlocked(get('estrategia'), modules, p)).toBe(true);
    expect(isModuleUnlocked(get('clasicos'), modules, p)).toBe(false);
    expect(nextLessons(modules, p).length).toBeGreaterThanOrEqual(3);
  });
  it('un jugador avanzado no recibe lecciones de módulos básicos', () => {
    const p = { ...empty, placementLevel: 'avanzado' as const };
    const ids = nextLessons(modules, p).map((l) => l.moduleId);
    expect(ids).not.toContain('fundamentos');
    expect(ids).not.toContain('tactica');
    expect(isModuleMastered(get('fundamentos'), p)).toBe(true);
    expect(moduleState(get('fundamentos'), modules, p)).toBe('mastered');
    expect(isLessonUnlocked(get('fundamentos').lessons[2], get('fundamentos'), modules, p)).toBe(true);
  });
  it('detecta temas débiles', () => {
    expect(weakTopics({ ...empty, mastery: { mate: { correct: 1, total: 4 }, horquilla: { correct: 4, total: 4 } } })).toEqual(['mate']);
  });
});

describe('plan diario', () => {
  const base = { modules, progress: empty, dueCards: [], rating: 800, dailyMinutes: 15, solvedIds: new Set<string>(), trainedLines: {} };
  it('alumno nuevo: lección + práctica', () => {
    const plan = generateDailyPlan({ ...base, date: D });
    expect(plan.map((t) => t.kind)).toEqual(['lesson', 'practice']);
    const lesson = plan[0];
    expect(lesson.kind === 'lesson' && lesson.lessonId).toBe('fund-01-tablero');
  });
  it('es determinista y añade repaso si hay tarjetas vencidas', () => {
    const due = [newCard('exercise', 'fund-ex-pastor', addDays(D, -3))];
    const a = generateDailyPlan({ ...base, date: D, dueCards: due });
    const b = generateDailyPlan({ ...base, date: D, dueCards: due });
    expect(a).toEqual(b);
    expect(a[0].kind).toBe('review');
  });
  it('con aperturas desbloqueadas incluye apertura del día', () => {
    const plan = generateDailyPlan({ ...base, date: D, progress: { ...empty, placementLevel: 'intermedio' }, dailyMinutes: 30 });
    expect(plan.some((t) => t.kind === 'opening')).toBe(true);
    const practice = plan.find((t) => t.kind === 'practice');
    expect(practice && practice.kind === 'practice' && practice.exerciseIds.length).toBe(10);
  });
});

describe('plan diario por nivel', () => {
  const lessonModule = (id: string) => allLessons.find((l) => l.id === id)?.moduleId;
  const advanced = { modules, progress: { ...empty, placementLevel: 'avanzado' as const }, dueCards: [], rating: 1909, dailyMinutes: 20, solvedIds: new Set<string>(), trainedLines: {} };

  it('avanzado (1909): ni fundamentos ni táctica básica en varios días', () => {
    for (let i = 0; i < 14; i++) {
      const plan = generateDailyPlan({ ...advanced, date: addDays(D, i) });
      for (const t of plan) {
        if (t.kind === 'lesson') expect(['fundamentos', 'tactica']).not.toContain(lessonModule(t.lessonId));
      }
      expect(plan.some((t) => t.kind === 'practice')).toBe(true);
      expect(plan.some((t) => t.kind === 'classic')).toBe(true);
    }
  });

  it('avanzado: la práctica usa los ejercicios más cercanos a su rating', () => {
    const pool = Array.from({ length: 40 }, (_, i) => ({ id: `p${i}`, fen: 'start', solution: ['e4'], themes: ['horquilla'], rating: 1000 + i * 40, moduleId: 'x', tags: ['horquilla'] }));
    const plan = generateDailyPlan({ ...advanced, date: D, puzzlePool: pool });
    const practice = plan.find((t) => t.kind === 'practice');
    expect(practice?.kind).toBe('practice');
    if (practice?.kind !== 'practice') return;
    const all = [...pool, ...modules.flatMap((m) => m.exercises)];
    const ratings = practice.exerciseIds.map((id) => all.find((p) => p.id === id)!.rating);
    expect(Math.min(...ratings)).toBeGreaterThanOrEqual(1909 - 300);
  });
});

describe('test de nivel', () => {
  it('la escalera sube con aciertos y baja con fallos', () => {
    expect(nextTarget(1200, 0, true)).toBe(1500);
    expect(nextTarget(1200, 0, false)).toBe(900);
  });
  it('acertar todo ubica en avanzado', () => {
    let t = 1200;
    const answers = [];
    for (let i = 0; i < 10; i++) {
      answers.push({ rating: t, success: true });
      t = nextTarget(t, i, true);
    }
    expect(estimatePlacement(answers, t).level).toBe('avanzado');
  });
  it('convierte Elo externo', () => {
    expect(ratingFromElo(1909, 'lichess')).toEqual({ rating: 1909, level: 'avanzado' });
    expect(ratingFromElo(900, 'chesscom').level).toBe('principiante');
  });
});
