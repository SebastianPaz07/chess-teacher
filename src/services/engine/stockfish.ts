import { flip, type Score } from './evaluation';

/**
 * Stockfish 17 (lite, single-thread, WASM) en un Web Worker.
 * Se carga la primera vez que se necesita (≈7 MB, luego queda en caché).
 * Una búsqueda a la vez: las peticiones se encolan.
 */
const ENGINE_URL = `${import.meta.env.BASE_URL}engine/stockfish.js`;

let worker: Worker | null = null;
let ready: Promise<void> | null = null;
let chain: Promise<unknown> = Promise.resolve();
let listener: ((line: string) => void) | null = null;
let booted = false;

function boot(): Promise<void> {
  if (ready) return ready;
  ready = new Promise<void>((resolve, reject) => {
    try {
      worker = new Worker(ENGINE_URL);
    } catch (e) {
      reject(e);
      return;
    }
    worker.onmessage = (ev: MessageEvent) => {
      const line = String(ev.data);
      if (line === 'uciok') worker?.postMessage('isready');
      else if (line === 'readyok') {
        booted = true;
        resolve();
      }
      listener?.(line);
    };
    worker.onerror = (e) => {
      booted = false;
      ready = null;
      worker = null;
      reject(e);
    };
    worker.postMessage('uci');
  });
  return ready;
}

/** ¿El motor ya está cargado? (la primera carga puede tardar) */
export const engineBooted = () => booted;

export interface Analysis {
  /** Puntuación para el bando al que le toca mover en `fen`. */
  score: Score;
  bestMove?: string;
}

/** Analiza una posición durante `movetime` ms. */
export function analyse(fen: string, movetime = 700): Promise<Analysis> {
  const job = chain.then(
    () =>
      boot().then(
        () =>
          new Promise<Analysis>((resolve) => {
            let score: Score = { cp: 0 };
            listener = (line) => {
              const m = line.match(/score (cp|mate) (-?\d+)/);
              if (line.startsWith('info') && m) score = m[1] === 'cp' ? { cp: Number(m[2]) } : { mate: Number(m[2]) };
              if (line.startsWith('bestmove')) {
                listener = null;
                const best = line.split(' ')[1];
                resolve({ score, bestMove: best && best !== '(none)' ? best : undefined });
              }
            };
            worker!.postMessage('ucinewgame');
            worker!.postMessage(`position fen ${fen}`);
            worker!.postMessage(`go movetime ${movetime}`);
          }),
      ),
  );
  chain = job.catch(() => undefined);
  return job;
}

/** Puntuación para quien ACABA de mover (el alumno) en la posición resultante. */
export async function scoreAfterMove(fenAfter: string, movetime?: number): Promise<Score> {
  const { score } = await analyse(fenAfter, movetime);
  return flip(score);
}

export function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = window.setTimeout(() => {
      worker?.postMessage('stop');
      reject(new Error('timeout'));
    }, ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}
