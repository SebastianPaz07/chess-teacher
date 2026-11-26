import type { Level } from './schema';

/**
 * Lecturas y videos para los ratos libres. El plan elige uno según tu nivel
 * y lo que estás reforzando. Los videos abren una búsqueda de YouTube
 * (no dependen de enlaces que puedan romperse).
 */
export interface Reading {
  id: string;
  kind: 'book' | 'video';
  title: string;
  /** Autor o canal */
  by: string;
  levels: Level[];
  /** Coincide con las etiquetas de ejercicios / áreas de refuerzo */
  tags: string[];
  /** Por qué te sirve ahora */
  why: string;
  /** Solo videos: texto de búsqueda */
  query?: string;
  /** Minutos de lectura/visionado sugeridos */
  minutes: number;
}

export const READINGS: Reading[] = [
  // ── Libros ──
  { id: 'b-capablanca', kind: 'book', title: 'Fundamentos del ajedrez', by: 'José Raúl Capablanca', levels: ['principiante', 'intermedio'], tags: ['finales', 'estrategia', 'medio-juego'], why: 'Un clásico clarísimo: finales sencillos y principios que se entienden a la primera.', minutes: 15 },
  { id: 'b-chernev', kind: 'book', title: 'Logical Chess: Move by Move', by: 'Irving Chernev', levels: ['principiante', 'intermedio'], tags: ['estrategia', 'medio-juego'], why: 'Cada jugada de 33 partidas está explicada con palabras simples: aprendes a pensar.', minutes: 15 },
  { id: 'b-seirawan', kind: 'book', title: 'Winning Chess Tactics', by: 'Yasser Seirawan', levels: ['principiante', 'intermedio'], tags: ['tactica'], why: 'Los motivos tácticos de más a menos comunes, con ejercicios al final de cada capítulo.', minutes: 15 },
  { id: 'b-masetti', kind: 'book', title: '1001 Chess Exercises for Beginners', by: 'Franco Masetti y Roberto Messa', levels: ['principiante'], tags: ['tactica', 'mate'], why: 'Ejercicios cortos y graduados: ideal para ganar velocidad de visión.', minutes: 10 },
  { id: 'b-fischer', kind: 'book', title: 'Bobby Fischer enseña ajedrez', by: 'Bobby Fischer', levels: ['principiante'], tags: ['mate', 'tactica'], why: 'Se aprende jugando: mates y combinaciones con el tablero delante.', minutes: 10 },
  { id: 'b-kotov', kind: 'book', title: 'Piensa como un gran maestro', by: 'Alexander Kotov', levels: ['intermedio', 'avanzado'], tags: ['tactica', 'medio-juego'], why: 'Te enseña a ordenar el cálculo de variantes sin perderte en ellas.', minutes: 20 },
  { id: 'b-nimzowitsch', kind: 'book', title: 'Mi sistema', by: 'Aron Nimzowitsch', levels: ['intermedio', 'avanzado'], tags: ['estrategia', 'medio-juego'], why: 'La base de la estrategia posicional: columnas abiertas, bloqueo, profilaxis.', minutes: 20 },
  { id: 'b-silman', kind: 'book', title: "Silman's Complete Endgame Course", by: 'Jeremy Silman', levels: ['intermedio', 'avanzado'], tags: ['finales'], why: 'Te dice qué finales estudiar según tu nivel, sin memorizar de más.', minutes: 20 },
  { id: 'b-dvoretsky', kind: 'book', title: 'Dvoretsky\'s Endgame Manual', by: 'Mark Dvoretsky', levels: ['avanzado'], tags: ['finales'], why: 'El manual de referencia de finales para jugadores que ya calculan bien.', minutes: 25 },
  { id: 'b-yusupov', kind: 'book', title: 'Construye tu juego de ajedrez (serie)', by: 'Artur Yusupov', levels: ['intermedio', 'avanzado'], tags: ['tactica', 'estrategia', 'finales'], why: 'Un curso por temas con tests: el más parecido a tener un entrenador.', minutes: 20 },

  // ── Videos ──
  { id: 'v-basics', kind: 'video', title: 'Reglas del ajedrez para principiantes', by: 'YouTube', levels: ['principiante'], tags: ['fundamentos'], why: 'Un repaso visual de cómo se mueve cada pieza y las jugadas especiales.', query: 'ajedrez reglas para principiantes enroque al paso', minutes: 10 },
  { id: 'v-tactics', kind: 'video', title: 'Motivos tácticos: horquilla, clavada, ensartada', by: 'YouTube', levels: ['principiante', 'intermedio'], tags: ['tactica'], why: 'Ver los patrones en movimiento ayuda a reconocerlos en tus partidas.', query: 'ajedrez tácticas básicas horquilla clavada ensartada', minutes: 12 },
  { id: 'v-openings', kind: 'video', title: 'Cómo jugar una apertura sin memorizar', by: 'YouTube', levels: ['principiante', 'intermedio'], tags: ['aperturas'], why: 'Entender las ideas de la apertura vale más que aprender jugadas de memoria.', query: 'ajedrez principios de apertura cómo jugar sin memorizar', minutes: 12 },
  { id: 'v-endgames', kind: 'video', title: 'Finales de torre esenciales', by: 'YouTube', levels: ['intermedio', 'avanzado'], tags: ['finales'], why: 'Lucena y Philidor: dos posiciones que salvan o ganan muchas partidas.', query: 'ajedrez final de torre Lucena Philidor', minutes: 15 },
  { id: 'v-calc', kind: 'video', title: 'Cómo calcular variantes con método', by: 'YouTube', levels: ['intermedio', 'avanzado'], tags: ['tactica', 'medio-juego'], why: 'Candidatas, jugadas forzadas y revisión final: el proceso del cálculo.', query: 'ajedrez cómo calcular variantes método jugadas candidatas', minutes: 15 },
  { id: 'v-strategy', kind: 'video', title: 'Plan de juego en el medio juego', by: 'YouTube', levels: ['intermedio', 'avanzado'], tags: ['estrategia', 'medio-juego'], why: 'Cómo decidir qué hacer cuando ya no hay táctica a la vista.', query: 'ajedrez estrategia medio juego plan de juego estructuras de peones', minutes: 15 },
];

export function readingUrl(r: Reading): string {
  return r.kind === 'video'
    ? `https://www.youtube.com/results?search_query=${encodeURIComponent(r.query ?? r.title)}`
    : `https://www.google.com/search?q=${encodeURIComponent(`${r.title} ${r.by} libro`)}`;
}

/** Mejor lectura/video para tu nivel y tus áreas de refuerzo; rota por día para no repetir. */
export function pickReading(kind: Reading['kind'], level: Level, tags: string[], day: number): Reading | undefined {
  const pool = READINGS.filter((r) => r.kind === kind && r.levels.includes(level));
  if (!pool.length) return undefined;
  const scored = pool.map((r) => ({ r, score: r.tags.filter((t) => tags.includes(t)).length }));
  const best = Math.max(...scored.map((s) => s.score));
  const top = scored.filter((s) => s.score === best).map((s) => s.r);
  return top[day % top.length];
}
