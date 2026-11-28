import { describe, expect, it } from 'vitest';
import { taskLink } from '@/features/daily-plan/taskLink';
import { isSectionRoot, sectionOf } from './navigation';

describe('navegación', () => {
  it('marca la sección de cada pantalla', () => {
    const expected: Record<string, string[]> = {
      Hoy: ['/', '/semana'],
      Práctica: ['/practica', '/practica/ejercicios','/repaso', '/rush'],
      Club: ['/club', '/club/semana', '/club/reto/1', '/unirse/ABC', '/crear-club/x'],
      Índice: ['/mapa', '/mapa/capitulos', '/leccion/fund-01-tablero', '/aperturas', '/aperturas/francesa', '/partidas', '/biblioteca', '/test-nivel'],
      Perfil: ['/perfil', '/progreso', '/logros', '/ajustes', '/ajustes/'],
    };
    for (const [label, paths] of Object.entries(expected)) for (const p of paths) expect(sectionOf(p)?.label, p).toBe(label);
  });

  it('no marca ninguna fuera del menú', () => {
    for (const p of ['/entrar', '/empezar', '/otra', '/practicas']) expect(sectionOf(p), p).toBeUndefined();
  });

  it('solo las 5 pantallas del menú son raíz (las demás muestran «Volver»)', () => {
    for (const p of ['/', '/practica', '/club', '/mapa', '/perfil']) expect(isSectionRoot(p), p).toBe(true);
    for (const p of ['/semana', '/practica/ejercicios', '/mapa/capitulos', '/logros']) expect(isSectionRoot(p), p).toBe(false);
  });

  it('el paso de ejercicios del plan abre la pantalla de ejercicios', () => {
    const link = taskLink({ id: 'p 1', kind: 'practice', title: '', minutes: 5, exerciseIds: [] });
    expect(link).toBe('/practica/ejercicios?daily=p%201');
  });
});
