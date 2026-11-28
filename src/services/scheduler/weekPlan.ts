import type { Level } from '@/content/schema';
import { addDays, dayNumber } from '@/lib/date';
import { hashString, seededRandom } from '@/lib/random';
import type { FocusArea } from './dailyPlan';

/**
 * Plan semanal: cada día de entrenamiento tiene un tema propio, elegido según
 * el nivel, lo que el alumno quiere reforzar, sus puntos débiles y sus aperturas.
 */
export type ThemeId = 'motivos' | 'ataque' | 'combinaciones' | 'finales' | 'estrategia' | 'apertura' | 'defensa' | 'maestros';

export interface TrainingTheme {
  id: ThemeId;
  title: string;
  icon: string;
  /** Qué se va a trabajar, en palabras sencillas */
  topics: string;
  /** Etiquetas de ejercicios y lecciones que pertenecen al tema */
  tags: string[];
  focus?: FocusArea;
  levels: Level[];
}

const ALL: Level[] = ['principiante', 'intermedio', 'avanzado'];

export const THEMES: Record<ThemeId, TrainingTheme> = {
  motivos: { id: 'motivos', title: 'Golpes tácticos', icon: 'crosshair', topics: 'Horquillas, clavadas, ensartadas y ataques a la descubierta', tags: ['horquilla', 'clavada', 'ensartada', 'descubierta', 'jaque-doble'], focus: 'tactica', levels: ALL },
  ataque: { id: 'ataque', title: 'Mates y ataque al rey', icon: 'sword', topics: 'Patrones de mate, sacrificios y rey en el centro', tags: ['mate', 'pasillo', 'mate-ahogado', 'ataque-al-rey', 'sacrificio'], focus: 'tactica', levels: ALL },
  combinaciones: { id: 'combinaciones', title: 'Combinaciones', icon: 'lightning', topics: 'Desviación, atracción, eliminar al defensor y jugada intermedia', tags: ['desviacion', 'atraccion', 'despeje', 'interferencia', 'intermedia', 'sobrecarga', 'eliminar-defensor', 'calculo'], focus: 'tactica', levels: ['intermedio', 'avanzado'] },
  finales: { id: 'finales', title: 'Finales', icon: 'flag', topics: 'Peones, torres, coronación y zugzwang', tags: ['finales', 'final', 'final-torres', 'final-peones', 'peon-pasado', 'promocion', 'zugzwang'], focus: 'finales', levels: ALL },
  estrategia: { id: 'estrategia', title: 'Planes y estrategia', icon: 'strategy', topics: 'Medio juego, estructuras de peones y mejorar las piezas', tags: ['estrategia', 'medio-juego', 'ventaja', 'ataque-flanco-dama'], focus: 'medio-juego', levels: ALL },
  apertura: { id: 'apertura', title: 'Tu repertorio', icon: 'books', topics: 'Tus aperturas: líneas nuevas, ideas y trampas', tags: ['aperturas', 'apertura', 'apertura-trampa', 'f7'], focus: 'teoria', levels: ALL },
  defensa: { id: 'defensa', title: 'Defensa y cálculo', icon: 'shield', topics: 'Recursos defensivos, jugadas tranquilas y piezas atrapadas', tags: ['defensa', 'jugada-tranquila', 'pieza-atrapada', 'captura'], focus: 'medio-juego', levels: ALL },
  maestros: { id: 'maestros', title: 'Aprender de los maestros', icon: 'classic', topics: 'Partidas clásicas y combinaciones decisivas', tags: ['clasicos', 'entrenamiento', 'ventaja-decisiva'], levels: ['intermedio', 'avanzado'] },
};

export const weekDates = (weekStart: string) => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

/** Día de la semana como lo guarda el plan (0 = domingo). El día 0 de `dayNumber` fue lunes. */
export const weekdayOf = (date: string) => (((dayNumber(date) + 1) % 7) + 7) % 7;

export interface WeekInput {
  weekStart: string;
  level: Level;
  trainingDays: number[];
  focus: FocusArea[];
  weak: string[];
  hasOpening: boolean;
}

/** Tema de cada fecha de la semana (null = descanso). No se repite ninguno hasta usar todos. */
export function weekThemes({ weekStart, level, trainingDays, focus, weak, hasOpening }: WeekInput): Record<string, ThemeId | null> {
  const rand = seededRandom(hashString(`week:${weekStart}`));
  const ranked = Object.values(THEMES)
    .filter((t) => t.levels.includes(level))
    .map((t) => ({
      id: t.id,
      score:
        (t.focus && focus.includes(t.focus) ? 3 : 0) +
        (t.tags.some((tag) => weak.includes(tag)) ? 2 : 0) +
        (t.id === 'apertura' && hasOpening ? 2.5 : 0) +
        rand() * 2,
    }))
    .sort((a, b) => b.score - a.score)
    .map((t) => t.id);

  const dates = weekDates(weekStart);
  const training = dates.filter((d) => !trainingDays.length || trainingDays.includes(weekdayOf(d)));
  // Con pocos días entran los temas prioritarios; el orden dentro de la semana varía
  const chosen = training.map((_, i) => ranked[i % ranked.length]);
  for (let i = chosen.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [chosen[i], chosen[j]] = [chosen[j], chosen[i]];
  }
  const byDate = new Map(training.map((d, i) => [d, chosen[i]]));
  return Object.fromEntries(dates.map((d) => [d, byDate.get(d) ?? null]));
}

/** Por qué toca este tema: se muestra al alumno para que el plan se sienta suyo. */
export function themeReason(id: ThemeId, focus: FocusArea[], weak: string[], openingName?: string): string {
  const t = THEMES[id];
  const failing = t.tags.find((tag) => weak.includes(tag));
  if (failing) return `Te está costando «${failing.replace(/-/g, ' ')}»: lo reforzamos.`;
  if (id === 'apertura' && openingName) return `Elegiste ${openingName} en tu plan.`;
  if (t.focus && focus.includes(t.focus)) return 'Es una de las áreas que pediste reforzar.';
  return 'Para que tu entrenamiento sea completo y variado.';
}
