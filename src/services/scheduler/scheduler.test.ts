import { describe, expect, it } from 'vitest';
import { getResource, modules } from '@/content/registry';
import { BOOKS } from '@/content/readings';
import { THEMES, weekThemes } from './weekPlan';
import { addDays, weekStart } from '@/lib/date';
import { difficultyStretch, generateDailyPlan, isCoreTask } from './dailyPlan';
import { isLessonUnlocked, isModuleMastered, isModuleUnlocked, moduleState, nextLessons, weakTopics, type ProgressSnapshot } from './progression';
import { lessonPart } from './lessonPart';
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
    expect(plan.filter(isCoreTask).map((t) => t.kind).slice(0, 2)).toEqual(['lesson', 'practice']);
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

describe('lecciones por partes', () => {
  const lesson = allLessons.find((l) => l.steps.some((s) => s.type === 'video'))!;
  const video = lesson.steps.findIndex((s) => s.type === 'video');
  const length = (i: number) => {
    const s = lesson.steps[i];
    return s.type === 'video' ? s.minutes : 0;
  };

  it('un video no se corta: la parte acaba antes y al día siguiente va entero', () => {
    const first = lessonPart(lesson, 0, 3);
    expect(first.to).toBeLessThanOrEqual(video);
    expect(first.videoMinutes).toBe(0);
    const withVideo = lessonPart(lesson, video, 3);
    expect(withVideo.videoMinutes).toBeGreaterThanOrEqual(length(video));
    expect(withVideo.minutes).toBeGreaterThanOrEqual(length(video));
  });

  it('con tiempo de sobra entra la lección entera con sus minutos reales', () => {
    expect(lessonPart(lesson, 0, 999)).toMatchObject({ from: 0, to: lesson.steps.length, minutes: lesson.minutes });
  });

  it('ninguna lección dice durar menos que sus videos', () => {
    for (const l of allLessons) expect(l.minutes, l.id).toBeGreaterThanOrEqual(l.steps.reduce((a, s) => a + (s.type === 'video' ? s.minutes : 0), 0));
  });

  it('el plan retoma la lección a medias desde donde quedó', () => {
    const base = { modules, progress: empty, dueCards: [], rating: 800, dailyMinutes: 15, solvedIds: new Set<string>(), trainedLines: {} };
    const task = generateDailyPlan({ ...base, date: D, lessonDrafts: { 'fund-01-tablero': { index: 2 } } }).find((t) => t.kind === 'lesson');
    expect(task).toMatchObject({ lessonId: 'fund-01-tablero', fromStep: 2 });
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
    }
  });

  it('el plan respeta el tiempo elegido (nunca lo supera más que un par de minutos)', () => {
    for (const dailyMinutes of [10, 15, 20, 30, 45, 60]) {
      for (let i = 0; i < 14; i++) {
        for (const lvl of [{ rating: 800, placementLevel: null }, { rating: 1300, placementLevel: 'intermedio' as const }, { rating: 1909, placementLevel: 'avanzado' as const }]) {
          const plan = generateDailyPlan({ ...advanced, rating: lvl.rating, progress: { ...empty, placementLevel: lvl.placementLevel }, dailyMinutes, date: addDays(D, i) });
          const total = plan.filter(isCoreTask).reduce((a, t) => a + t.minutes, 0);
          expect(total).toBeLessThanOrEqual(dailyMinutes + 3);
        }
      }
    }
  });

  it('las recomendaciones no cuentan como pasos y siempre hay una lectura o video', () => {
    const plan = generateDailyPlan({ ...advanced, date: D });
    const recs = plan.filter((t) => !isCoreTask(t));
    expect(recs.some((t) => t.kind === 'recommendation' && t.subtype === 'book' && getResource(t.resourceId!)?.type === 'pdf')).toBe(true);
    expect(recs.every((t) => t.minutes === 0)).toBe(true);
  });

  it('la dificultad sube poco a poco si te va bien y baja si te cuesta', () => {
    expect(difficultyStretch(3, 5)).toBe(0); // pocos datos
    expect(difficultyStretch(18, 20)).toBeGreaterThan(difficultyStretch(14, 20));
    expect(difficultyStretch(14, 20)).toBeGreaterThan(difficultyStretch(9, 20));
    expect(difficultyStretch(6, 20)).toBeLessThan(0);
  });

  it('con stretch positivo los ejercicios elegidos son más difíciles', () => {
    const pool = Array.from({ length: 60 }, (_, i) => ({ id: `s${i}`, fen: 'start', solution: ['e4'], themes: ['horquilla'], rating: 1000 + i * 20, moduleId: 'x', tags: ['horquilla'] }));
    const avg = (stretch: number) => {
      const plan = generateDailyPlan({ ...advanced, rating: 1300, progress: { ...empty, placementLevel: 'intermedio' }, date: D, puzzlePool: pool, stretch });
      const practice = plan.find((t) => t.kind === 'practice');
      if (practice?.kind !== 'practice') return 0;
      const all = [...pool, ...modules.flatMap((m) => m.exercises)];
      const r = practice.exerciseIds.map((id) => all.find((p) => p.id === id)!.rating);
      return r.reduce((a, b) => a + b, 0) / r.length;
    };
    expect(avg(100)).toBeGreaterThan(avg(-50));
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

describe('plan semanal', () => {
  const input = { weekStart: '2026-11-23', level: 'intermedio' as const, trainingDays: [1, 2, 3, 4, 5], focus: [], weak: [], hasOpening: true };
  it('la semana empieza en lunes', () => {
    expect(weekStart('2026-11-26')).toBe('2026-11-23');
    expect(weekStart('2026-11-23')).toBe('2026-11-23');
    expect(weekStart('2026-11-29')).toBe('2026-11-23');
  });
  it('un tema distinto cada día de entrenamiento y descanso el fin de semana', () => {
    const themes = Object.values(weekThemes(input));
    const training = themes.filter(Boolean);
    expect(themes.slice(5)).toEqual([null, null]);
    expect(training).toHaveLength(5);
    expect(new Set(training).size).toBe(5);
    expect(weekThemes(input)).toEqual(weekThemes(input));
  });
  it('lo que pides reforzar y tus aperturas entran en la semana', () => {
    const themes = Object.values(weekThemes({ ...input, trainingDays: [1, 3], focus: ['finales'] }));
    expect(themes).toContain('finales');
    expect(themes).toContain('apertura');
  });
  it('el tema del día manda en los ejercicios, con motivos variados', () => {
    const pool = ['final-torres', 'final-peones', 'horquilla', 'clavada', 'mate', 'defensa'].flatMap((t, k) =>
      Array.from({ length: 10 }, (_, i) => ({ id: `${t}${i}`, fen: 'start', solution: ['e4'], themes: [t], rating: 1250 + i * 10 + k, moduleId: 'x', tags: [t] })),
    );
    const plan = generateDailyPlan({ date: D, modules: [], progress: empty, dueCards: [], rating: 1300, dailyMinutes: 30, solvedIds: new Set<string>(), trainedLines: {}, puzzlePool: pool, theme: 'finales' });
    const practice = plan.find((t) => t.kind === 'practice');
    if (practice?.kind !== 'practice') throw new Error('sin práctica');
    const themes = practice.exerciseIds.map((id) => pool.find((p) => p.id === id)!.themes[0]);
    expect(themes.filter((t) => THEMES.finales.tags.includes(t)).length).toBeGreaterThanOrEqual(themes.length / 2);
    expect(new Set(themes).size).toBeGreaterThanOrEqual(3);
  });
  it('todos los libros recomendados son PDF de la biblioteca', () => {
    for (const b of BOOKS) expect(getResource(b.resourceId)?.type, b.title).toBe('pdf');
  });
  it('recomienda estudiar la apertura elegida con material de la biblioteca', () => {
    const plan = generateDailyPlan({ date: D, modules, progress: empty, dueCards: [], rating: 1300, dailyMinutes: 20, solvedIds: new Set<string>(), trainedLines: {}, favoriteOpening: 'francesa' });
    const rec = plan.find((t) => t.kind === 'recommendation' && t.subtype === 'video');
    expect(rec && rec.kind === 'recommendation' && getResource(rec.resourceId!)?.tags).toContain('francesa');
  });
});
