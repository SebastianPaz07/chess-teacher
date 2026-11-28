import { resources } from './registry';
import type { Level, Resource } from './schema';

/**
 * Lecturas para los ratos libres: SOLO los libros en PDF de nuestra biblioteca
 * (se abren dentro de la app). Aquí va el nombre legible y por qué sirve cada uno.
 */
export interface Book {
  resourceId: string;
  title: string;
  by: string;
  levels: Level[];
  /** Coincide con las etiquetas de ejercicios, aperturas o áreas de refuerzo */
  tags: string[];
  why: string;
}

const ALL: Level[] = ['principiante', 'intermedio', 'avanzado'];
const MID: Level[] = ['intermedio', 'avanzado'];
const LOW: Level[] = ['principiante', 'intermedio'];

export const BOOKS: Book[] = [
  { resourceId: '1NfiW8uEi39gJkkixrMJEALem9g5WpeRa', title: 'Combinaciones en el medio juego', by: 'Biblioteca de ajedrez', levels: ALL, tags: ['tactica', 'medio-juego'], why: 'Patrones tácticos con ejemplos para reproducir en tu tablero.' },
  { resourceId: '1bfEfEy0Fwkrce66IBFuC1zqPT945Ntw3', title: '10 combinaciones de mate', by: 'Antonio Gude', levels: LOW, tags: ['tactica', 'mate'], why: 'Los mates que más se repiten, explicados uno por uno.' },
  { resourceId: '1sCcqfJXqmdX1ry52uj1Bcv7aDO7VaoCP', title: 'Estrategia en el mediojuego I', by: 'Johan Hellsten', levels: MID, tags: ['estrategia', 'medio-juego'], why: 'Curso ordenado de planes: columnas, casillas débiles y cambios.' },
  { resourceId: '1rG_Or8W6gLqfFmRyvJtompCTi2aL5-ng', title: 'Mejora tu juego posicional', by: 'Erich Eliskases', levels: ALL, tags: ['estrategia', 'medio-juego'], why: 'Ideas posicionales claras para cuando no hay táctica.' },
  { resourceId: '1pleO8tMZx9ZHXghX14CR8XgVSYtKu3-P', title: 'La estructura de peones centrales', by: 'Boris Persits', levels: MID, tags: ['estrategia', 'medio-juego'], why: 'Te enseña qué plan pide cada centro.' },
  { resourceId: '1-hOJaBgnxFGG5aYkPn9KzOIQBF3IfLh3', title: 'Entrenamiento sistemático en ajedrez', by: 'Samarian', levels: ALL, tags: ['entrenamiento', 'finales', 'tactica'], why: 'Un método de estudio por etapas.' },
  { resourceId: '15lW64LDSaVB88hgW4NXHmG6wegVWPWD0', title: 'Ajedrez de entrenamiento', by: 'Alexander Koblenz', levels: MID, tags: ['entrenamiento', 'tactica'], why: 'Ejercicios y consejos de un entrenador de campeones.' },
  { resourceId: '1P8a6hDyf5P_tbzitBUp8QiRUBuHC3V0h', title: 'Analiza', by: 'Patrick Gonneau', levels: LOW, tags: ['entrenamiento', 'medio-juego'], why: 'Aprende a revisar tus propias posiciones.' },
  { resourceId: '15c0GC6XGA5j2V0Z4U6k31H6gfC4hbQV-', title: 'Chess training guide', by: 'Guía de entrenamiento (en inglés)', levels: ['principiante'], tags: ['entrenamiento', 'fundamentos'], why: 'Cómo organizar tus primeras sesiones de estudio.' },
  { resourceId: '1S_3z0yOBmUlXMQD2xb7X8dYNusXEIci1', title: 'Ajedrez y computadoras', by: 'Pachman y Kühnmund', levels: MID, tags: ['entrenamiento'], why: 'Cómo se piensa una posición, vista desde el cálculo.' },
  { resourceId: '1xVMgeBQZBN-TC1J7FxEwLEL3sYzB0XMm', title: 'Mis geniales predecesores, vol. 2', by: 'Garry Kasparov', levels: MID, tags: ['clasicos', 'estrategia'], why: 'Las partidas de Euwe a Tal comentadas por un campeón.' },
  { resourceId: '1NWZPV3vQGN4O8nX60EafShftMoiSB0Qn', title: 'Curso completo n.º 3', by: 'Garry Kasparov', levels: ALL, tags: ['clasicos', 'tactica'], why: 'Lecciones graduadas con la mirada de Kasparov.' },
  { resourceId: '1kRzQerY7DX6e7mUYrv5XS4ZPyJArh2Hf', title: 'Ajedrez en la cumbre', by: 'Tigran Petrosian', levels: MID, tags: ['clasicos', 'defensa', 'estrategia'], why: 'Defensa y profilaxis explicadas por su gran maestro.' },
  { resourceId: '1vdFO995XWddVgW6PW8Ky1p-BBv4fLT4s', title: 'Match Alekhine – Bogoljubow 1934', by: 'Partidas comentadas', levels: ['avanzado'], tags: ['clasicos', 'ataque-al-rey'], why: 'Un match completo para estudiar planes de ataque.' },
  { resourceId: '10Xrgj5qjaLqZ2HhpOuhj11QHJP4Xbfq0', title: 'Tratado de ajedrez superior', by: 'Y. B. Estrin (ed.)', levels: ['avanzado'], tags: ['clasicos', 'finales', 'estrategia'], why: 'Temas avanzados para profundizar.' },
  { resourceId: '1Q6jhdNemQK5DdZXPcGRqnckZqab0E1hH', title: 'Gane con d4', by: 'John Cox', levels: MID, tags: ['gambito-dama', 'londres', 'colle'], why: 'Un repertorio completo con 1.d4.' },
  { resourceId: '1CY_Kts8FqHm4mxL-_ODOWDPW5nU-qntI', title: 'La defensa Caro-Kann', by: 'Cyrus Lakdawala', levels: ALL, tags: ['caro-kann'], why: 'La Caro-Kann explicada idea por idea.' },
  { resourceId: '1y9AQoRIdmzZ12Xd0A5VLhya67gmY21_k', title: 'Ultimate Dragon, vol. 1', by: 'Gufeld y Stetsko', levels: MID, tags: ['siciliana'], why: 'El Dragón de la Siciliana a fondo.' },
  { resourceId: '1u2UhgENQP4Sp7UbR9S0PtxffjgANfVal', title: 'The Najdorf in Black and White', by: 'GM Bryan Smith (en inglés)', levels: MID, tags: ['siciliana'], why: 'Las ideas de la Najdorf.' },
  { resourceId: '1NEIBU0lzVzcxKXxrFoTJ21ulOrs7zFUM', title: 'The Bishop’s Opening Explained', by: 'En inglés', levels: ALL, tags: ['apertura-alfil'], why: 'La Apertura de Alfil explicada.' },
  { resourceId: '1B4vKmQOSEkOoKVAPHRSTty8BXGNmIqTB', title: 'La defensa Pirc', by: 'G. Fridshtein', levels: ALL, tags: ['pirc'], why: 'Planes y variantes de la Pirc.' },
  { resourceId: '1N0oN26FvcVdKqHD8INCN_yX97NRrslS5', title: 'Apertura Italiana', by: 'Biblioteca de ajedrez', levels: ALL, tags: ['italiana'], why: 'Las líneas de la Italiana con explicaciones.' },
  { resourceId: '1s9rSNvaFZgvUowApcubkX1b-RVdhypYt', title: 'Defensa escandinava: variante portuguesa', by: 'Biblioteca de ajedrez', levels: ALL, tags: ['escandinava'], why: 'Todo sobre la variante portuguesa.' },
];

/** Etiquetas de apertura: sus libros solo se recomiendan a quien estudia esa apertura. */
const isOpeningBook = (b: Book) => !b.tags.some((t) => ['tactica', 'mate', 'estrategia', 'medio-juego', 'entrenamiento', 'clasicos', 'finales'].includes(t));

const find = (id: string) => resources.find((r) => r.id === id);

export interface Pick {
  resource: Resource;
  title: string;
  why: string;
}

/** Mejor libro de la biblioteca para tu nivel y tus áreas de refuerzo; rota por día. */
export function pickBook(level: Level, tags: string[], day: number): Pick | undefined {
  const pool = BOOKS.filter((b) => b.levels.includes(level) && !isOpeningBook(b) && find(b.resourceId));
  if (!pool.length) return undefined;
  const score = (b: Book) => b.tags.filter((t) => tags.includes(t)).length;
  const best = Math.max(...pool.map(score));
  // Los más afines salen más seguido, sin repetir siempre el mismo
  const top = pool.filter((b) => score(b) >= best - (day % 3 === 0 ? 1 : 0));
  const b = top[day % top.length];
  return { resource: find(b.resourceId)!, title: `${b.title} — ${b.by}`, why: b.why };
}

interface OpeningRef {
  name: string;
  resourceTags: string[];
}

/**
 * Material de estudio de una apertura elegida por el alumno: primero un video
 * de clase; si no hay ninguno, su libro en PDF.
 */
export function pickOpeningStudy(openings: OpeningRef[], day: number): (Pick & { openingName: string }) | undefined {
  const options = openings.map((o) => {
    const material = resources.filter((r) => r.tags.some((t) => o.resourceTags.includes(t)));
    const videos = material.filter((r) => r.type === 'video');
    return { o, list: videos.length ? videos : material.filter((r) => r.type === 'pdf') };
  });
  // Se prefieren las aperturas que tienen video
  const withVideo = options.filter((x) => x.list[0]?.type === 'video');
  const usable = withVideo.length ? withVideo : options.filter((x) => x.list.length);
  if (!usable.length) return undefined;
  const { o, list } = usable[day % usable.length];
  const resource = list[Math.floor(day / usable.length) % list.length];
  const book = BOOKS.find((b) => b.resourceId === resource.id);
  return { resource, openingName: o.name, title: book ? book.title : resource.title, why: `Para estudiar ${o.name}, una apertura de tu plan.` };
}
