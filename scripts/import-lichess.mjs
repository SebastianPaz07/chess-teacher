#!/usr/bin/env node
/**
 * Importa un subconjunto curado de la base de puzzles de Lichess (CC0).
 *
 *   npm run import:puzzles                      # descarga en streaming
 *   npm run import:puzzles -- ruta/al/archivo.csv.zst
 *
 * Muestreo estratificado: PER_BAND puzzles por tramo de 100 puntos entre
 * MIN_RATING y MAX_RATING, con cupo por tema principal para que haya
 * variedad. Se detiene en cuanto todos los tramos están llenos.
 *
 * Formato Lichess: PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,
 * NbPlays,Themes,GameUrl,OpeningTags. El FEN es ANTES de la jugada del
 * rival (Moves[0]); el alumno juega Moves[1], Moves[3]...
 * Lo convertimos al formato de la app: FEN tras Moves[0] y solución en SAN.
 */
import { createReadStream, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Chess } from 'chess.js';
import { Decompress } from 'fzstd';

const URL_DB = 'https://database.lichess.org/lichess_db_puzzle.csv.zst';
const MIN_RATING = 600;
const MAX_RATING = 2600;
const BAND = 100;
const PER_BAND = 120;
const MAX_PER_THEME = 30; // por tramo
const MIN_POPULARITY = 85;
const MIN_PLAYS = 500;
const MAX_DEVIATION = 90;

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content', 'puzzles');

/** Temas de Lichess → tags de la app (en español). Los no listados se ignoran. */
const THEMES = {
  mate: 'mate', mateIn1: 'mate', mateIn2: 'mate', mateIn3: 'mate', mateIn4: 'mate', mateIn5: 'mate',
  backRankMate: 'pasillo', smotheredMate: 'mate-ahogado', anastasiaMate: 'mate', arabianMate: 'mate', hookMate: 'mate',
  bodenMate: 'mate', doubleBishopMate: 'mate', dovetailMate: 'mate',
  fork: 'horquilla', pin: 'clavada', skewer: 'ensartada', discoveredAttack: 'descubierta', doubleCheck: 'jaque-doble',
  sacrifice: 'sacrificio', deflection: 'desviacion', attraction: 'atraccion', decoy: 'atraccion', clearance: 'despeje',
  interference: 'interferencia', intermezzo: 'intermedia', xRayAttack: 'rayos-x', trappedPiece: 'pieza-atrapada',
  hangingPiece: 'captura', capturingDefender: 'eliminar-defensor', overloading: 'sobrecarga',
  quietMove: 'jugada-tranquila', defensiveMove: 'defensa', zugzwang: 'zugzwang', exposedKing: 'ataque-al-rey',
  kingsideAttack: 'ataque-al-rey', queensideAttack: 'ataque-flanco-dama', attackingF2F7: 'f7',
  advancedPawn: 'peon-pasado', promotion: 'promocion', underPromotion: 'promocion',
  endgame: 'final', pawnEndgame: 'final-peones', rookEndgame: 'final-torres', bishopEndgame: 'final', knightEndgame: 'final',
  queenEndgame: 'final', queenRookEndgame: 'final',
  opening: 'apertura', middlegame: 'medio-juego',
  crushing: 'ventaja-decisiva', advantage: 'ventaja', equality: 'igualar',
};
/** Tags que describen el "motivo" (para el cupo de variedad). */
const MOTIF_ORDER = ['mate', 'pasillo', 'mate-ahogado', 'horquilla', 'clavada', 'ensartada', 'descubierta', 'jaque-doble', 'sacrificio', 'desviacion', 'atraccion', 'despeje', 'interferencia', 'intermedia', 'sobrecarga', 'eliminar-defensor', 'zugzwang', 'jugada-tranquila', 'defensa', 'promocion', 'final-torres', 'final-peones', 'final', 'pieza-atrapada', 'captura', 'ataque-al-rey', 'ventaja-decisiva', 'ventaja'];

const TITLES = {
  mate: 'Mate', pasillo: 'Mate del pasillo', 'mate-ahogado': 'Mate de la coz', horquilla: 'Horquilla', clavada: 'Clavada',
  ensartada: 'Ensartada', descubierta: 'Ataque a la descubierta', 'jaque-doble': 'Jaque doble', sacrificio: 'Sacrificio',
  desviacion: 'Desviación', atraccion: 'Atracción', despeje: 'Despeje', interferencia: 'Interferencia', intermedia: 'Jugada intermedia',
  sobrecarga: 'Sobrecarga', 'eliminar-defensor': 'Elimina al defensor', zugzwang: 'Zugzwang', 'jugada-tranquila': 'Jugada tranquila',
  defensa: 'Defensa precisa', promocion: 'Promoción', 'final-torres': 'Final de torres', 'final-peones': 'Final de peones',
  final: 'Final', 'pieza-atrapada': 'Pieza atrapada', captura: 'Pieza colgando', 'ataque-al-rey': 'Ataque al rey',
  'ventaja-decisiva': 'Golpe decisivo', ventaja: 'Mejor jugada',
};

function convert(row) {
  const [id, fen, movesStr, ratingStr, devStr, popStr, playsStr, themesStr] = row.split(',');
  const rating = Number(ratingStr);
  if (!(rating >= MIN_RATING && rating < MAX_RATING)) return null;
  if (Number(devStr) > MAX_DEVIATION || Number(popStr) < MIN_POPULARITY || Number(playsStr) < MIN_PLAYS) return null;
  const uci = movesStr.split(' ');
  if (uci.length < 2) return null;
  const chess = new Chess(fen);
  const toMove = (u) => chess.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
  try {
    toMove(uci[0]);
    const start = chess.fen();
    const solution = uci.slice(1).map((u) => toMove(u).san);
    const tags = [...new Set(themesStr.split(' ').map((t) => THEMES[t]).filter(Boolean))];
    const motif = MOTIF_ORDER.find((m) => tags.includes(m)) ?? 'ventaja';
    if (!tags.length) tags.push('ventaja');
    return { id: `li-${id}`, title: TITLES[motif] ?? 'Mejor jugada', fen: start, solution, themes: tags, rating, source: `lichess:${id}`, _motif: motif };
  } catch {
    return null;
  }
}

async function* lines(input) {
  const decoder = new TextDecoder();
  let rest = '';
  const queue = [];
  const zstd = new Decompress((chunk) => queue.push(decoder.decode(chunk, { stream: true })));
  for await (const chunk of input) {
    zstd.push(chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk));
    while (queue.length) {
      const text = rest + queue.shift();
      const parts = text.split('\n');
      rest = parts.pop() ?? '';
      yield* parts;
    }
  }
  if (rest) yield rest;
}

async function main() {
  const local = process.argv[2];
  let input;
  if (local) {
    input = createReadStream(local);
  } else {
    console.log(`Descargando ${URL_DB} (streaming)…`);
    const res = await fetch(URL_DB);
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
    input = Readable.fromWeb(res.body);
  }

  const bandCount = (MAX_RATING - MIN_RATING) / BAND;
  const bands = Array.from({ length: bandCount }, () => ({ items: [], perTheme: {} }));
  let full = 0;
  let seen = 0;

  for await (const line of lines(input)) {
    if (!line || line.startsWith('PuzzleId')) continue;
    seen++;
    if (seen % 200000 === 0) console.log(`  ${seen.toLocaleString()} filas · ${full}/${bandCount} tramos completos`);
    const rating = Number(line.split(',')[3]);
    const bi = Math.floor((rating - MIN_RATING) / BAND);
    const band = bands[bi];
    if (!band || band.items.length >= PER_BAND) continue;
    const p = convert(line);
    if (!p) continue;
    if ((band.perTheme[p._motif] ?? 0) >= MAX_PER_THEME) continue;
    band.perTheme[p._motif] = (band.perTheme[p._motif] ?? 0) + 1;
    delete p._motif;
    band.items.push(p);
    if (band.items.length === PER_BAND && ++full === bandCount) break;
  }
  if (typeof input.destroy === 'function') input.destroy();

  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const index = [];
  bands.forEach((b, i) => {
    const from = MIN_RATING + i * BAND;
    const file = `band-${from}.json`;
    b.items.sort((x, y) => x.rating - y.rating);
    writeFileSync(join(OUT, file), JSON.stringify(b.items));
    const themes = {};
    for (const p of b.items) for (const t of p.themes) themes[t] = (themes[t] ?? 0) + 1;
    index.push({ from, to: from + BAND, file, count: b.items.length, themes });
  });
  writeFileSync(
    join(OUT, 'index.json'),
    JSON.stringify({ source: 'Lichess puzzle database (CC0) — https://database.lichess.org/#puzzles', generatedAt: new Date().toISOString().slice(0, 10), bands: index }, null, 2),
  );
  console.log(`Listo: ${index.reduce((a, b) => a + b.count, 0)} puzzles en ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
