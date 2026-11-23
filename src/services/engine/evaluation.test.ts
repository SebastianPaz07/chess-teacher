import { describe, expect, it } from 'vitest';
import { flip, isAcceptableAlternative, scoreValue } from './evaluation';

describe('regla de solución alternativa', () => {
  it('mates', () => {
    expect(isAcceptableAlternative({ mate: 2 }, { mate: 2 })).toBe(true);
    expect(isAcceptableAlternative({ mate: 3 }, { mate: 1 })).toBe(true);
    expect(isAcceptableAlternative({ mate: 2 }, { mate: 4 })).toBe(false);
    expect(isAcceptableAlternative({ mate: 2 }, { cp: 900 })).toBe(false);
    expect(isAcceptableAlternative({ cp: 400 }, { mate: 5 })).toBe(true);
    expect(isAcceptableAlternative({ cp: 400 }, { mate: -3 })).toBe(false);
    // La del libro ya es mate: una jugada que solo amenaza mate no vale
    expect(isAcceptableAlternative(flip({ mate: 0 }), { mate: 1 })).toBe(false);
    expect(isAcceptableAlternative(flip({ mate: 0 }), flip({ mate: 0 }))).toBe(true);
  });
  it('ventaja: igual o mejor se acepta, peor no', () => {
    expect(isAcceptableAlternative({ cp: 350 }, { cp: 420 })).toBe(true);
    expect(isAcceptableAlternative({ cp: 350 }, { cp: 300 })).toBe(true);
    expect(isAcceptableAlternative({ cp: 350 }, { cp: 200 })).toBe(false);
    expect(isAcceptableAlternative({ cp: 900 }, { cp: 820 })).toBe(true);
    expect(isAcceptableAlternative({ cp: 200 }, { cp: 120 })).toBe(false);
  });
  it('defensa / igualdad', () => {
    expect(isAcceptableAlternative({ cp: 0 }, { cp: -30 })).toBe(true);
    expect(isAcceptableAlternative({ cp: 0 }, { cp: -150 })).toBe(false);
  });
  it('utilidades', () => {
    expect(flip({ mate: 3 })).toEqual({ mate: -3 });
    expect(Object.is(flip({ mate: 0 }).mate, 0)).toBe(true);
    expect(scoreValue({ mate: 1 })).toBeGreaterThan(scoreValue({ cp: 5000 }));
  });
});
