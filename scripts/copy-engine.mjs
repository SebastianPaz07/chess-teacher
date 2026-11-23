#!/usr/bin/env node
/** Copia Stockfish (lite, single-thread, WASM) a public/engine/ para servirlo como Web Worker. */
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules', 'stockfish', 'src');
const out = join(root, 'public', 'engine');
const files = readdirSync(src);
const js = files.find((f) => /^stockfish-.*-lite-single-[0-9a-f]+\.js$/.test(f));
const wasm = files.find((f) => /^stockfish-.*-lite-single-[0-9a-f]+\.wasm$/.test(f));
if (!js || !wasm) throw new Error('No se encontró el build lite-single de stockfish en node_modules/stockfish/src');
mkdirSync(out, { recursive: true });
// El worker busca su .wasm junto a su propio .js con el mismo nombre
copyFileSync(join(src, js), join(out, 'stockfish.js'));
copyFileSync(join(src, wasm), join(out, 'stockfish.wasm'));
copyFileSync(join(root, 'node_modules', 'stockfish', 'Copying.txt'), join(out, 'COPYING.txt'));
console.log(`Motor copiado: ${js} → public/engine/stockfish.js`);
