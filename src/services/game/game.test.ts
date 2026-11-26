import { describe, expect, it } from 'vitest';
import { addDays } from '@/lib/date';
import { applyEvent, initialGameState } from './engine';
import { questsForDay } from './quests';
import { expectedScore, updateRating } from './rating';
import { consecutiveDays, displayStreak, initialStreak, registerActivity } from './streak';
import { comboMultiplier, levelFromXp, levelProgress, rankForLevel, xpForLevel } from './xp';

const D = '2026-11-22';

describe('xp', () => {
  it('curva de niveles', () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(100);
    expect(xpForLevel(3)).toBe(300);
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(99)).toBe(1);
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(300)).toBe(3);
    expect(levelProgress(150)).toMatchObject({ level: 2, current: 50, needed: 200 });
  });
  it('rangos y combo', () => {
    expect(rankForLevel(1).name).toBe('Peón');
    expect(rankForLevel(3).name).toBe('Caballo');
    expect(rankForLevel(25).name).toBe('Maestro');
    expect(comboMultiplier(1)).toBe(1);
    expect(comboMultiplier(4)).toBe(2);
    expect(comboMultiplier(9)).toBe(3);
  });
});

describe('rating', () => {
  it('sube al acertar y baja al fallar', () => {
    expect(expectedScore(1000, 1000)).toBeCloseTo(0.5);
    expect(updateRating(1000, 1000, true, 50).delta).toBeGreaterThan(0);
    expect(updateRating(1000, 1000, false, 50).delta).toBeLessThan(0);
    // Resolver uno muy fácil da poco
    expect(updateRating(1500, 600, true, 50).delta).toBeLessThanOrEqual(1);
  });
  it('las pérdidas se suavizan y tienen tope', () => {
    expect(updateRating(1000, 1000, false, 5).delta).toBeGreaterThanOrEqual(-8);
    // fallar uno muy fácil nunca resta más de 8
    expect(updateRating(1000, 400, false, 5).delta).toBe(-8);
    expect(Math.abs(updateRating(1000, 1000, false, 50).delta)).toBeLessThan(updateRating(1000, 1000, true, 50).delta + 1);
    // resolver con ayuda (0.5) pierde menos que fallar
    expect(updateRating(1000, 1000, 0.5, 50).delta).toBeGreaterThan(updateRating(1000, 1000, false, 50).delta);
  });
});

describe('racha', () => {
  it('cuenta días consecutivos', () => {
    let s = registerActivity(initialStreak, D).state;
    expect(s.current).toBe(1);
    s = registerActivity(s, D).state;
    expect(s.current).toBe(1);
    s = registerActivity(s, addDays(D, 1)).state;
    expect(s.current).toBe(2);
    s = registerActivity(s, addDays(D, 5)).state;
    expect(s.current).toBe(1);
    expect(s.best).toBe(2);
  });
  it('protector de racha a los 7 días y se consume si saltas un día', () => {
    let s = initialStreak;
    for (let i = 0; i < 7; i++) s = registerActivity(s, addDays(D, i)).state;
    expect(s.current).toBe(7);
    expect(s.freezes).toBe(1);
    const r = registerActivity(s, addDays(D, 8));
    expect(r.usedFreeze).toBe(true);
    expect(r.state.current).toBe(8);
    expect(displayStreak(r.state, addDays(D, 8))).toBe(8);
    expect(displayStreak(r.state, addDays(D, 12))).toBe(0);
  });
});

describe('misiones', () => {
  it('son deterministas por día e incluyen una lección', () => {
    expect(questsForDay(D)).toEqual(questsForDay(D));
    expect(questsForDay(D).map((q) => q.id)).toContain('lesson-1');
    expect(questsForDay(D)).toHaveLength(3);
  });
});

describe('motor de juego', () => {
  it('lección perfecta da XP, racha, misión y logro', () => {
    const { state, rewards } = applyEvent(initialGameState(D), { type: 'LESSON_COMPLETED', lessonId: 'x', moduleId: 'm', mistakes: 0, graded: 3, xp: 50, tags: [] }, D);
    expect(state.xp).toBeGreaterThanOrEqual(75 + 40);
    expect(state.streak.current).toBe(1);
    expect(state.achievements['first-step']).toBe(D);
    expect(rewards.some((r) => r.kind === 'quest')).toBe(true);
    expect(rewards.some((r) => r.kind === 'level-up')).toBe(true);
    expect(state.history[D]).toBe(state.xp);
  });
  it('ejercicio fallado baja rating y no da XP base', () => {
    const s0 = initialGameState(D);
    const { state } = applyEvent(s0, { type: 'PUZZLE_SOLVED', exerciseId: 'e', themes: ['mate'], success: false, mistakes: 1, puzzleRating: 800, context: 'practice' }, D);
    // El rating no cambia en pleno ejercicio: queda pendiente hasta el fin de la sesión
    expect(state.rating).toBe(s0.rating);
    expect(state.pendingLoss).toBeGreaterThan(0);
    const flushed = applyEvent(state, { type: 'RATING_FLUSH' }, D);
    expect(flushed.state.rating).toBeLessThan(s0.rating);
    expect(flushed.state.pendingLoss).toBe(0);
    expect(state.stats.puzzlesAttempted).toBe(1);
    expect(state.stats.mates).toBe(0);
  });
  it('completar todas las tareas del día da bonus una sola vez', () => {
    let s = initialGameState(D);
    s = applyEvent(s, { type: 'DAILY_TASK_DONE', taskId: 'a' }, D, { dailyTotal: 2 }).state;
    expect(s.daily.completeRewarded).toBe(false);
    const r = applyEvent(s, { type: 'DAILY_TASK_DONE', taskId: 'b' }, D, { dailyTotal: 2 });
    expect(r.state.daily.completeRewarded).toBe(true);
    expect(r.rewards.some((x) => x.kind === 'daily-complete')).toBe(true);
    const again = applyEvent(r.state, { type: 'DAILY_TASK_DONE', taskId: 'b' }, D, { dailyTotal: 2 });
    expect(again.rewards.some((x) => x.kind === 'daily-complete')).toBe(false);
  });
  it('un nuevo día reinicia misiones y tareas', () => {
    let s = applyEvent(initialGameState(D), { type: 'DAILY_TASK_DONE', taskId: 'a' }, D, { dailyTotal: 3 }).state;
    s = applyEvent(s, { type: 'REVIEW_DONE', cardId: 'c', success: true }, addDays(D, 1)).state;
    expect(s.daily.date).toBe(addDays(D, 1));
    expect(s.daily.tasksDone).toEqual([]);
    expect(s.streak.current).toBe(2);
  });
});

describe('ajustes de exigencia y plan', () => {
  it('el rating se aplica al final: suma lo ganado y resta lo perdido', async () => {
    const { applyEvent, initialGameState } = await import('./engine');
    const s0 = initialGameState('2026-11-23');
    const base = { type: 'PUZZLE_SOLVED' as const, exerciseId: 'x', themes: [], success: true, puzzleRating: 800, context: 'practice' as const };
    const flush = (evs: Parameters<typeof applyEvent>[1][]) => {
      let st = s0;
      for (const ev of evs) st = applyEvent(st, ev, '2026-11-23').state;
      expect(st.rating).toBe(s0.rating); // sin cambios durante la sesión
      return applyEvent(st, { type: 'RATING_FLUSH' }, '2026-11-23');
    };
    const clean = flush([{ ...base, mistakes: 0 }]);
    expect(clean.state.rating).toBeGreaterThan(s0.rating);
    expect(clean.state.rating - s0.rating).toBeLessThanOrEqual(12);
    // Con pistas / errores ya no suma
    expect(flush([{ ...base, mistakes: 0, hintsUsed: 1 }]).state.rating).toBeLessThanOrEqual(s0.rating);
    // Un acierto y un fallo: informa ganado, perdido y neto
    const mixed = flush([{ ...base, mistakes: 0 }, { ...base, success: false, mistakes: 1 }]);
    const r = mixed.rewards.find((x) => x.kind === 'rating');
    expect(r && r.kind === 'rating' && r.gain > 0 && r.loss > 0 && r.delta === r.gain - r.loss).toBe(true);
    expect(mixed.state.pendingGain).toBe(0);
  });

  it('los días de descanso no rompen la racha', async () => {
    const { registerActivity, displayStreak } = await import('./streak');
    const weekdays = [1, 2, 3, 4, 5];
    // viernes 2026-11-27 → lunes 2026-11-30 (sábado y domingo de descanso)
    let s = registerActivity(initialStreak, '2026-11-27', weekdays).state;
    expect(displayStreak(s, '2026-11-30', weekdays)).toBe(1);
    s = registerActivity(s, '2026-11-30', weekdays).state;
    expect(s.current).toBe(2);
    // Sin días de descanso, saltarse el fin de semana sí la rompe
    const t = registerActivity(registerActivity(initialStreak, '2026-11-27').state, '2026-11-30').state;
    expect(t.current).toBe(1);
  });

  it('más minutos al día → más ejercicios', async () => {
    const { practiceCountFor } = await import('@/services/scheduler/dailyPlan');
    expect(practiceCountFor('intermedio', 10)).toBeLessThan(practiceCountFor('intermedio', 20));
    expect(practiceCountFor('intermedio', 60)).toBeGreaterThan(practiceCountFor('intermedio', 30));
  });
});

describe('días seguidos jugando', () => {
  const days = (...d: string[]) => new Set(d);
  it('cuenta los días consecutivos hasta hoy', () => {
    expect(consecutiveDays(days('2026-11-23', '2026-11-24', '2026-11-25'), '2026-11-25')).toBe(3);
  });
  it('si hoy aún no jugaste, la racha de ayer sigue viva', () => {
    expect(consecutiveDays(days('2026-11-23', '2026-11-24'), '2026-11-25')).toBe(2);
  });
  it('un día sin jugar corta la cuenta', () => {
    expect(consecutiveDays(days('2026-11-20', '2026-11-21', '2026-11-25'), '2026-11-25')).toBe(1);
    expect(consecutiveDays(days('2026-11-22', '2026-11-23'), '2026-11-25')).toBe(0);
  });
});
