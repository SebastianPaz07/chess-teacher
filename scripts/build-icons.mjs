#!/usr/bin/env node
/**
 * Genera src/components/ui/iconPaths.ts con SOLO los iconos y pesos que usa
 * la app, a partir de los SVG de @phosphor-icons/core. Así el bundle no
 * arrastra los 6 pesos de cada icono (≈200 KB de trazados).
 *
 *   npm run icons
 *
 * Para añadir un icono: agrégalo a ICONS (nombre de la app → nombre Phosphor).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assets = join(root, 'node_modules', '@phosphor-icons', 'core', 'assets');
const WEIGHTS = ['light', 'regular'];
/** Iconos que además necesitan versión rellena (estrellas, vidas). */
const FILLED = ['star', 'heart', 'check-circle'];

const ICONS = {
  home: 'house', map: 'map-trifold', puzzle: 'puzzle-piece', books: 'books', book: 'book', 'book-open': 'book-open',
  notebook: 'notebook', review: 'arrows-clockwise', lightning: 'lightning', classic: 'bank', trophy: 'trophy', medal: 'medal',
  progress: 'trend-up', chart: 'chart-line-up', video: 'film-slate', settings: 'gear-six', compass: 'compass', fire: 'fire',
  star: 'star', target: 'target', crosshair: 'crosshair', lock: 'lock', unlock: 'lock-open', hint: 'lightbulb',
  'check-circle': 'check-circle', check: 'check', 'x-circle': 'x-circle', close: 'x', play: 'play', wall: 'wall',
  rocket: 'rocket', diamond: 'diamond', flag: 'flag-checkered', brain: 'brain', calendar: 'calendar-blank',
  comment: 'chat-circle-text', crown: 'crown', eye: 'eye', castle: 'castle-turret', student: 'student',
  teacher: 'chalkboard-teacher', fork: 'fork-knife', scales: 'scales', sword: 'sword', flask: 'flask', shield: 'shield',
  user: 'user', search: 'magnifying-glass', pin: 'push-pin', strength: 'barbell', heart: 'heart', 'heart-break': 'heart-break',
  footprints: 'footprints', wave: 'hand-waving', dice: 'dice-five', shuffle: 'shuffle', sliders: 'sliders', confetti: 'confetti',
  question: 'question', timer: 'timer', 'skip-back': 'skip-back', 'skip-forward': 'skip-forward', prev: 'caret-left',
  next: 'caret-right', 'arrow-left': 'arrow-left', 'arrow-right': 'arrow-right', external: 'arrow-square-out', smile: 'smiley',
  wink: 'smiley-wink', nervous: 'smiley-nervous', sparkle: 'sparkle', mountain: 'mountains', more: 'dots-three-outline',
  engine: 'cpu', exam: 'exam', seal: 'seal-check', strategy: 'strategy',
  users: 'users-three', 'user-plus': 'user-plus', share: 'share-network', copy: 'copy', bell: 'bell', ranking: 'ranking',
  handshake: 'handshake', 'sign-out': 'sign-out', envelope: 'envelope-simple', 'caret-up': 'caret-up', 'caret-down': 'caret-down', clock: 'clock',
};

/** Extrae el contenido interior del <svg> (sin el <rect> de fondo transparente). */
function inner(svg) {
  const body = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  return body.replace(/<rect width="256" height="256" fill="none"\/>/, '').trim();
}

const out = {};
for (const [name, ph] of Object.entries(ICONS)) {
  out[name] = {};
  for (const w of [...WEIGHTS, ...(FILLED.includes(name) ? ['fill'] : [])]) {
    const file = w === 'regular' ? `${ph}.svg` : `${ph}-${w}.svg`;
    out[name][w] = inner(readFileSync(join(assets, w, file), 'utf8'));
  }
}

const header = `/* Generado por scripts/build-icons.mjs a partir de @phosphor-icons/core (MIT). No editar a mano. */\n`;
const body = `export type IconWeight = 'light' | 'regular' | 'fill';\nexport const ICON_PATHS: Record<string, { light: string; regular: string; fill?: string }> = ${JSON.stringify(out)};\n`;
writeFileSync(join(root, 'src', 'components', 'ui', 'iconPaths.ts'), header + body);
console.log(`${Object.keys(out).length} iconos × ${WEIGHTS.length} pesos → src/components/ui/iconPaths.ts`);
