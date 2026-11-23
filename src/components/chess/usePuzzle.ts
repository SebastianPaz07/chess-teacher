import { Chess } from 'chess.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { resolveFen, sameMove, sideToMove, trySan, tryMove } from '@/services/chess/chessUtils';
import { sound } from '@/services/sound';

export type PuzzleStatus = 'playing' | 'solved' | 'failed';

export interface PuzzleResult {
  mistakes: number;
  hintsUsed: number;
  success: boolean;
  /** Resuelto con un mate distinto al de la solución (también vale) */
  alternative?: boolean;
}

interface Options {
  fen: string;
  solution: string[];
  maxMistakes?: number;
  onFinish?: (r: PuzzleResult) => void;
  onMistake?: (mistakes: number) => void;
  onCorrect?: () => void;
  opponentDelay?: number;
}

/** Fotograma de la partida del ejercicio (para revisar jugada a jugada al final). */
export interface PuzzleFrame {
  fen: string;
  lastMove: [string, string] | null;
  san: string | null;
}


/**
 * Lógica de un ejercicio: el alumno juega las jugadas pares de `solution`,
 * las impares las responde el "rival". Manda la solución del ejercicio
 * (Lichess); además se acepta cualquier jugada que dé mate.
 *
 * Modo paciente: un error no termina el ejercicio (salvo `maxMistakes`);
 * el alumno puede seguir pensando, pedir pista o ver la siguiente jugada.
 */
export function usePuzzle({ fen, solution, maxMistakes = Infinity, onFinish, onMistake, onCorrect, opponentDelay = 500 }: Options) {
  const start = resolveFen(fen);
  const chessRef = useRef(new Chess(start));
  const [position, setPosition] = useState(start);
  const [ply, setPly] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [status, setStatus] = useState<PuzzleStatus>('playing');
  const [lastMove, setLastMove] = useState<[string, string] | null>(null);
  const [flash, setFlash] = useState<'good' | 'bad' | null>(null);
  const [hintSquare, setHintSquare] = useState<string | null>(null);
  /** Último error sin resolver: la UI ofrece seguir pensando o ver la jugada */
  const [stuck, setStuck] = useState(false);
  /** Línea de la solución cuando el alumno dio otro mate */
  const [bookLine, setBookLine] = useState<string[] | null>(null);
  /** Historial para revisar el ejercicio terminado */
  const [frames, setFrames] = useState<PuzzleFrame[]>([{ fen: start, lastMove: null, san: null }]);
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  const alive = useRef(true);
  const timers = useRef<number[]>([]);
  const finished = useRef(false);
  const playerColor = sideToMove(fen);

  useEffect(
    () => () => {
      alive.current = false;
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  const pulse = (kind: 'good' | 'bad') => {
    setFlash(null);
    requestAnimationFrame(() => setFlash(kind));
    later(() => setFlash(null), 600);
  };

  const finish = useCallback(
    (success: boolean, m: number, h: number, alternative = false) => {
      if (finished.current) return;
      finished.current = true;
      setStuck(false);
      setStatus(success ? 'solved' : 'failed');
      onFinish?.({ success, mistakes: m, hintsUsed: h, alternative });
    },
    [onFinish],
  );

  const sync = (move: { from: string; to: string; captured?: string; san: string }) => {
    const f = chessRef.current.fen();
    setPosition(f);
    setLastMove([move.from, move.to]);
    setFrames((fr) => [...fr, { fen: f, lastMove: [move.from, move.to], san: move.san }]);
    move.captured ? sound.capture() : sound.move();
  };

  /** Jugada correcta del alumno (o mostrada por ayuda): avanza y responde el rival. */
  const advance = (from: string, to: string, h: number) => {
    const move = tryMove(chessRef.current, from, to);
    if (!move) return;
    sync(move);
    setHintSquare(null);
    setStuck(false);
    pulse('good');
    onCorrect?.();
    const next = ply + 1;
    if (next >= solution.length) {
      setPly(next);
      sound.correct();
      finish(true, mistakes, h);
      return;
    }
    setPly(next);
    later(() => {
      const reply = trySan(chessRef.current, solution[next]);
      if (reply) sync(reply);
      const after = next + 1;
      setPly(after);
      if (after >= solution.length) finish(true, mistakes, h);
    }, opponentDelay);
  };

  const onMove = (from: string, to: string): boolean => {
    if (status !== 'playing' || ply >= solution.length || viewIndex !== null) return false;
    const expected = solution[ply];
    const probe = new Chess(chessRef.current.fen());
    const move = tryMove(probe, from, to);
    if (!move) return false;

    const exact = sameMove(move.san, expected);
    // Cualquier mate es siempre la mejor jugada
    if (!exact && probe.isCheckmate()) {
      acceptAlternative(from, to);
      return true;
    }

    if (!exact) {
      registerMistake();
      return false;
    }

    advance(from, to, hintsUsed);
    return true;
  };

  function registerMistake() {
    const m = mistakes + 1;
    setMistakes(m);
    pulse('bad');
    sound.wrong();
    onMistake?.(m);
    if (m >= maxMistakes) finish(false, m, hintsUsed);
    else setStuck(true);
  }

  /** La jugada del alumno es tan buena como la del libro: ejercicio resuelto. */
  function acceptAlternative(from: string, to: string) {
    const move = tryMove(chessRef.current, from, to);
    if (!move) return;
    sync(move);
    setBookLine(solution.slice(ply));
    setHintSquare(null);
    pulse('good');
    sound.correct();
    onCorrect?.();
    setPly(solution.length);
    finish(true, mistakes, hintsUsed, true);
  }

  const expectedMove = () => {
    if (ply >= solution.length) return null;
    return trySan(new Chess(chessRef.current.fen()), solution[ply]);
  };

  const hint = () => {
    if (status !== 'playing') return;
    const m = expectedMove();
    if (m) {
      setHintSquare(m.from);
      setHintsUsed((h) => h + 1);
    }
  };

  /** "Muéstrame la jugada": la juega por ti (cuenta como ayuda) y sigue el ejercicio. */
  const playNext = () => {
    if (status !== 'playing' || ply % 2 !== 0) return;
    const m = expectedMove();
    if (!m) return;
    const h = hintsUsed + 1;
    setHintsUsed(h);
    advance(m.from, m.to, h);
  };

  /** Seguir pensando: cierra el aviso de error. */
  const keepThinking = () => setStuck(false);

  /** Muestra la solución animada y marca el ejercicio como fallado. */
  const reveal = () => {
    if (status !== 'playing') return;
    finish(false, Math.max(mistakes, 1), hintsUsed);
    solution.slice(ply).forEach((san, i) =>
      later(() => {
        const m = trySan(chessRef.current, san);
        if (m) sync(m);
      }, 500 * (i + 1)),
    );
  };

  const done = status === 'solved' || status === 'failed';
  const view = done && viewIndex !== null ? frames[Math.min(viewIndex, frames.length - 1)] : null;
  const current = frames.length - 1;
  const nav = {
    enabled: done && frames.length > 1,
    index: viewIndex ?? current,
    total: current,
    first: () => setViewIndex(0),
    prev: () => setViewIndex((v) => Math.max(0, (v ?? current) - 1)),
    next: () => setViewIndex((v) => ((v ?? current) + 1 >= current ? null : (v ?? current) + 1)),
    last: () => setViewIndex(null),
  };
  const exp = status === 'failed' ? expectedMove() : null;

  return {
    position: view ? view.fen : position,
    onMove,
    status,
    bookLine,
    mistakes,
    hintsUsed,
    lastMove: view ? view.lastMove : lastMove,
    flash,
    hintSquare,
    hint,
    reveal,
    playNext,
    keepThinking,
    stuck: stuck && status === 'playing',
    nav,
    frames,
    playerColor,
    orientation: playerColor === 'w' ? ('white' as const) : ('black' as const),
    isPlayerTurn: ply % 2 === 0 && status === 'playing',
    solutionArrow: !view && exp ? ([exp.from, exp.to] as [string, string]) : null,
  };
}
