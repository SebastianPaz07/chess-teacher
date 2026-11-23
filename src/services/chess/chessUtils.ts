import { Chess, type Move, type Square } from 'chess.js';

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const resolveFen = (fen?: string) => (!fen || fen === 'start' ? START_FEN : fen);

export function sideToMove(fen: string): 'w' | 'b' {
  return resolveFen(fen).split(' ')[1] === 'b' ? 'b' : 'w';
}

/** Quita +, #, !, ? para comparar SAN de forma tolerante. */
export const normalizeSan = (san: string) => san.replace(/[+#!?]/g, '').trim();

export function sameMove(a: string, b: string) {
  return normalizeSan(a) === normalizeSan(b);
}

/** Intenta una jugada desde/hasta; devuelve null si es ilegal. */
export function tryMove(chess: Chess, from: string, to: string, promotion = 'q'): Move | null {
  try {
    return chess.move({ from: from as Square, to: to as Square, promotion });
  } catch {
    return null;
  }
}

export function trySan(chess: Chess, san: string): Move | null {
  try {
    return chess.move(san);
  } catch {
    return null;
  }
}

export function isPromotion(chess: Chess, from: string, to: string) {
  const piece = chess.get(from as Square);
  return piece?.type === 'p' && (to.endsWith('8') || to.endsWith('1'));
}

/** FEN tras aplicar una lista de jugadas SAN. Lanza si alguna es ilegal. */
export function fenAfter(fen: string, sans: string[]): string {
  const c = new Chess(resolveFen(fen));
  for (const s of sans) {
    if (!trySan(c, s)) throw new Error(`Jugada ilegal "${s}" en ${c.fen()}`);
  }
  return c.fen();
}

export function legalTargets(chess: Chess, from: string): string[] {
  return chess.moves({ square: from as Square, verbose: true }).map((m) => m.to);
}

/** "1. e4 e5 2. Cf3" con notación española opcional */
const ES: Record<string, string> = { K: 'R', Q: 'D', R: 'T', B: 'A', N: 'C' };
export function toSpanishSan(san: string) {
  return san.replace(/^[KQRBN]/, (p) => ES[p]).replace(/=([QRBN])/, (_, p: string) => `=${ES[p]}`);
}

export function formatMoveList(sans: string[], startPly = 0, spanish = true) {
  return sans.map((s, i) => {
    const ply = startPly + i;
    const n = Math.floor(ply / 2) + 1;
    const label = spanish ? toSpanishSan(s) : s;
    return { ply, number: ply % 2 === 0 ? `${n}.` : i === 0 ? `${n}...` : '', san: label };
  });
}
