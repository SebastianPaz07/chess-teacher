import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import { resolveFen, trySan } from '@/services/chess/chessUtils';
import { isIconName } from '@/components/ui/Icon';
import { THEMES } from '@/services/scheduler/weekPlan';
import { allExercises, allGames, allLessons, allOpenings, getExercise, getResource, modules } from './registry';

/** Aplica jugadas SAN y devuelve la posición final (falla si alguna es ilegal). */
function play(fen: string, moves: string[], label: string) {
  let c: Chess;
  try {
    c = new Chess(resolveFen(fen));
  } catch (e) {
    throw new Error(`${label}: FEN inválido "${fen}" (${(e as Error).message})`);
  }
  moves.forEach((san, i) => {
    const m = trySan(c, san);
    if (!m) throw new Error(`${label}: jugada ilegal #${i + 1} "${san}" en ${c.fen()}`);
  });
  return c;
}

describe('contenido', () => {
  it('carga los módulos con lecciones', () => {
    expect(modules.length).toBeGreaterThanOrEqual(6);
    for (const m of modules) expect(m.lessons.length, m.id).toBeGreaterThan(0);
  });

  it('ids únicos', () => {
    const ids = [...allLessons.map((l) => l.id), ...allExercises.map((e) => e.id), ...allOpenings.map((o) => o.id), ...allGames.map((g) => g.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('prerrequisitos existen', () => {
    for (const m of modules) for (const p of m.prerequisites) expect(modules.some((x) => x.id === p), `${m.id} → ${p}`).toBe(true);
  });

  it('ejercicios de práctica referenciados existen', () => {
    for (const l of allLessons) for (const id of l.practice) expect(getExercise(id), `${l.id} → ${id}`).toBeTruthy();
  });

  it.each(allExercises.map((e) => [e.id, e] as const))('ejercicio %s es legal y coherente', (_id, ex) => {
    const c = play(ex.fen, ex.solution, ex.id);
    const last = ex.solution[ex.solution.length - 1];
    if (last.includes('#')) expect(c.isCheckmate(), `${ex.id} debería terminar en mate`).toBe(true);
    if (ex.themes.includes('mate')) expect(c.isCheckmate(), `${ex.id} tiene tema mate`).toBe(true);
    expect(ex.solution.length % 2, `${ex.id}: la solución debe terminar con jugada del alumno`).toBe(1);
  });

  it('pasos de lecciones son legales', () => {
    for (const l of allLessons) {
      l.steps.forEach((s, i) => {
        const label = `${l.id} paso ${i + 1}`;
        if (s.type === 'make-move') {
          const c = play(s.fen, s.solution, label);
          if (s.solution[s.solution.length - 1].includes('#')) expect(c.isCheckmate(), label).toBe(true);
          expect(s.solution.length % 2, label).toBe(1);
        }
        if (s.type === 'board-demo') play(s.fen, s.moves, label);
        if ((s.type === 'text' || s.type === 'quiz') && s.fen) play(s.fen, [], label);
        if (s.type === 'quiz') expect(s.answer, label).toBeLessThan(s.options.length);
      });
    }
  });

  it('líneas de apertura son legales', () => {
    for (const o of allOpenings) o.lines.forEach((l) => play('start', l.moves, `${o.id}: ${l.name}`));
  });

  it('partidas clásicas son legales', () => {
    for (const g of allGames) {
      const c = play('start', g.moves, g.id);
      if (g.moves[g.moves.length - 1].includes('#')) expect(c.isCheckmate(), g.id).toBe(true);
    }
  });
});

describe('puzzles importados (Lichess)', () => {
  it('cargan, son legales y cubren todos los tramos', async () => {
    const { loadPuzzles } = await import('./puzzles');
    const puzzles = await loadPuzzles();
    expect(puzzles.length).toBeGreaterThan(1000);
    const ids = new Set<string>();
    for (const p of puzzles) {
      expect(ids.has(p.id), `duplicado ${p.id}`).toBe(false);
      ids.add(p.id);
      const c = play(p.fen, p.solution, p.id);
      expect(p.solution.length % 2, `${p.id}: termina con jugada del alumno`).toBe(1);
      if (p.solution[p.solution.length - 1].includes('#')) expect(c.isCheckmate(), p.id).toBe(true);
      expect(getExercise(p.id)).toBe(p);
    }
    for (const band of [800, 1400, 1900, 2300]) {
      expect(puzzles.filter((p) => p.rating >= band && p.rating < band + 100).length, `tramo ${band}`).toBeGreaterThanOrEqual(50);
    }
  }, 30_000);
});

describe('carga de puzzles por tema', () => {
  it('el resumen por tema coincide con los puzzles', async () => {
    const { loadPuzzles, puzzleThemeCounts, puzzleTotal } = await import('./puzzles');
    const puzzles = await loadPuzzles();
    const count: Record<string, number> = {};
    for (const p of puzzles) for (const t of p.themes) count[t] = (count[t] ?? 0) + 1;
    expect(puzzleThemeCounts).toEqual(count);
    expect(puzzleTotal).toBe(puzzles.length);
  });

  it('trae solo ejercicios del tema, cerca del nivel', async () => {
    const { loadPuzzlesFor, puzzleTotal } = await import('./puzzles');
    const forks = await loadPuzzlesFor(1200, 'horquilla');
    expect(forks.length).toBeGreaterThanOrEqual(40);
    expect(forks.every((p) => p.themes.includes('horquilla'))).toBe(true);
    const mix = await loadPuzzlesFor(1200, null);
    expect(mix.length).toBeLessThan(puzzleTotal / 2);
    expect(mix.every((p) => Math.abs(p.rating - 1250) < 250)).toBe(true);
  });
});

describe('carga de puzzles por nivel', () => {
  it('trae solo los tramos cercanos', async () => {
    const { loadPuzzlesNear, puzzleTotal } = await import('./puzzles');
    for (const rating of [600, 1200, 2600]) {
      const near = await loadPuzzlesNear(rating);
      expect(near.length).toBeGreaterThan(500);
      expect(near.length).toBeLessThan(puzzleTotal / 2);
    }
    expect((await loadPuzzlesNear(1200)).every((p) => p.rating >= 900 && p.rating < 1700)).toBe(true);
  });

  it('hace disponible un ejercicio de cualquier nivel', async () => {
    const { loadExercises, loadPuzzles, missingExercises } = await import('./puzzles');
    const all = await loadPuzzles();
    const far = all[all.length - 1].id;
    await loadExercises([far], 800);
    expect(missingExercises([far])).toBe(false);
  });
});

describe('lecciones con video', () => {
  it('apuntan a videos que existen en la biblioteca', () => {
    for (const l of allLessons) for (const st of l.steps) if (st.type === 'video') expect(getResource(st.resourceId)?.type, l.id).toBe('video');
  });
  it('los iconos del contenido existen', () => {
    for (const m of modules) for (const name of [m.icon, ...m.lessons.map((l) => l.icon)]) expect(isIconName(name), `${m.id}: ${name}`).toBe(true);
    for (const t of Object.values(THEMES)) expect(isIconName(t.icon), t.icon).toBe(true);
    for (const o of allOpenings) expect(isIconName(o.icon), `${o.id}: ${o.icon}`).toBe(true);
    expect(new Set(allOpenings.map((o) => o.icon)).size).toBe(allOpenings.length);
  });
});
