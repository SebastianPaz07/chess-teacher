import { describe, expect, it } from 'vitest';
import { addDays } from '@/lib/date';
import { applyEvent, initialGameState } from './engine';
import { daysLearning, journeyMessage, studyLabel, studySeconds, timeSpan } from './journey';

const D = '2026-11-22';
const day = (seconds: number) => ({ puzzles: 0, lessons: 0, reviews: 0, seconds });

describe('trayectoria', () => {
  it('cuenta desde el rastro más antiguo', () => {
    expect(daysLearning({}, D)).toBe(0);
    expect(daysLearning({ startedAt: addDays(D, -3) }, D)).toBe(3);
    expect(daysLearning({ startedAt: addDays(D, -3), history: { [addDays(D, -10)]: 5 }, activityLog: { [D]: day(60) } }, D)).toBe(10);
    // Un reloj atrasado no da días negativos
    expect(daysLearning({ startedAt: addDays(D, 2) }, D)).toBe(0);
  });

  it('expresa el tiempo en la unidad que mejor se lee', () => {
    expect(timeSpan(1)).toBe('1 día');
    expect(timeSpan(13)).toBe('13 días');
    expect(timeSpan(21)).toBe('3 semanas');
    expect(timeSpan(60)).toBe('2 meses');
    expect(timeSpan(365)).toBe('1 año');
  });

  it('distingue a quien empezó desde cero', () => {
    expect(journeyMessage(0, true)).toBe('Hoy empieza tu camino');
    expect(journeyMessage(21, true)).toBe('Llevas 3 semanas aprendiendo desde cero');
    expect(journeyMessage(21, false)).toBe('Llevas 3 semanas entrenando');
  });

  it('suma el tiempo de estudio', () => {
    expect(studySeconds({ a: day(90), b: day(30) })).toBe(120);
    expect(studyLabel(120)).toBe('2 min');
    expect(studyLabel(3600)).toBe('1 h');
    expect(studyLabel(3900)).toBe('1 h 5 min');
  });

  it('entrega las medallas de constancia con la siguiente actividad', () => {
    const prev = { ...initialGameState(D), activityLog: { [addDays(D, -1)]: day(3600) } };
    const { state, rewards } = applyEvent(prev, { type: 'REVIEW_DONE', cardId: 'c', success: true }, D, { startedAt: addDays(D, -7) });
    expect(state.achievements['week-1']).toBe(D);
    expect(state.achievements['hours-1']).toBe(D);
    expect(state.achievements['month-1']).toBeUndefined();
    expect(rewards).toContainEqual(expect.objectContaining({ kind: 'achievement', id: 'week-1', tier: 'bronce' }));
  });
});
