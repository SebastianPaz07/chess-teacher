#!/usr/bin/env node
/**
 * Inventario de la carpeta de Drive (pública por link).
 * Solo lee nombres y estructura (vista embebida); NO descarga ni analiza archivos.
 *
 * Uso: node scripts/inventory.mjs [FOLDER_ID]
 * Salida: src/content/resources.json
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT_ID = process.argv[2] ?? '1C9covOIQphd3hHcs5NxpsJiZNPQNpIUn';
const OUT = fileURLToPath(new URL('../src/content/resources.json', import.meta.url));
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0';

/** Palabras clave del nombre/carpeta → tags del temario */
const TAG_RULES = [
  [/principiante|desde cero|tablero|valor de las piezas|captura al paso/i, 'fundamentos'],
  [/t[aá]ctic|combinaci|ataque|c[aá]lculo|mate/i, 'tactica'],
  [/estrateg|posicional|poscional|estructura|pe[oó]n|stonewall|muro de piedra|plan/i, 'estrategia'],
  [/final/i, 'finales'],
  [/entrenamiento|training|samarian|koblenz|analiza|computadora/i, 'entrenamiento'],
  [/kasparov|petrosian|alekhine_vs|predecesores|cumbre|tratado/i, 'clasicos'],
  [/caro.?kann|karo.?cann/i, 'caro-kann'],
  [/francesa/i, 'francesa'],
  [/siciliana|najdorf|drag[oó]n/i, 'siciliana'],
  [/petrov/i, 'petrov'],
  [/alekhine(?!_vs)|alburt/i, 'alekhine'],
  [/indio de rey|india de rey/i, 'india-de-rey'],
  [/pirc/i, 'pirc'],
  [/escandinava/i, 'escandinava'],
  [/italiana/i, 'italiana'],
  [/escoc/i, 'escocesa'],
  [/4 caba|cuatro caballos/i, 'cuatro-caballos'],
  [/ponziani/i, 'ponziani'],
  [/bishop|alfil/i, 'apertura-alfil'],
  [/londres/i, 'londres'],
  [/colle/i, 'colle'],
  [/gambito de dama|\bd4\b/i, 'gambito-dama'],
  [/alien/i, 'alien-gambit'],
];
const OPENING_TAGS = new Set([
  'caro-kann', 'francesa', 'siciliana', 'petrov', 'alekhine', 'india-de-rey', 'pirc', 'escandinava',
  'italiana', 'escocesa', 'cuatro-caballos', 'ponziani', 'apertura-alfil', 'londres', 'colle', 'gambito-dama', 'alien-gambit',
]);

const decode = (s) =>
  s.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

async function listFolder(id) {
  const res = await fetch(`https://drive.google.com/embeddedfolderview?id=${id}`, { headers: { 'User-Agent': UA } });
  const html = await res.text();
  const entries = [];
  const re = /<a href="([^"]+)"[\s\S]*?flip-entry-title">([^<]+)/g;
  let m;
  while ((m = re.exec(html))) {
    const url = m[1];
    const name = decode(m[2]).trim();
    const folder = url.match(/\/folders\/([\w-]+)/);
    const file = url.match(/\/file\/d\/([\w-]+)/) ?? url.match(/[?&]id=([\w-]+)/);
    if (folder) entries.push({ kind: 'folder', id: folder[1], name });
    else if (file) entries.push({ kind: 'file', id: file[1], name });
  }
  return entries;
}

function classify(name) {
  if (/\.pdf$/i.test(name)) return 'pdf';
  if (/\.(mp4|mkv|webm|mov)$/i.test(name)) return 'video';
  return 'other';
}

function tagsFor(text) {
  const tags = new Set();
  for (const [re, tag] of TAG_RULES) if (re.test(text)) tags.add(tag);
  if ([...tags].some((t) => OPENING_TAGS.has(t)) || /apertura/i.test(text)) tags.add('aperturas');
  return [...tags];
}

const cleanTitle = (name) =>
  name
    .replace(/\.(pdf|mp4|mkv|webm|mov)$/i, '')
    .replace(/\s*\(\d{3,4}p_[^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();

async function walk(id, path, out, depth = 0) {
  if (depth > 8) return;
  for (const e of await listFolder(id)) {
    if (e.kind === 'folder') await walk(e.id, [...path, e.name], out, depth + 1);
    else {
      const type = classify(e.name);
      const context = `${path.join(' / ')} ${e.name}`;
      out.push({ id: e.id, title: cleanTitle(e.name) || '(sin título)', type, folder: path.join(' / '), tags: tagsFor(context) });
    }
  }
}

const resources = [];
await walk(ROOT_ID, [], resources);
writeFileSync(OUT, JSON.stringify({ rootFolderId: ROOT_ID, generatedAt: new Date().toISOString(), resources }, null, 2));
console.log(`✔ ${resources.length} recursos → ${OUT}`);
console.table(
  resources.reduce((acc, r) => ((acc[r.type] = (acc[r.type] ?? 0) + 1), acc), {}),
);
