import { Icon } from '@/components/ui/Icon';
import { Chess } from 'chess.js';
import { useEffect, useRef, useState } from 'react';
import { Badge, Button } from '@/components/ui';
import { sameMove, START_FEN, trySan, tryMove } from '@/services/chess/chessUtils';
import { sound } from '@/services/sound';
import { ChessBoard } from './ChessBoard';
import { MoveList } from './MoveList';
import styles from './BoardStepper.module.css';

export interface LineResult {
  mistakes: number;
  correct: number;
  total: number;
}

interface LineTrainerProps {
  moves: string[];
  side: 'w' | 'b';
  notes?: Record<string, string>;
  /** Jugadas que se reproducen solas antes de empezar */
  startPly?: number;
  /**
   * train: hay que acertar para avanzar (aperturas).
   * guess: si fallas se muestra la jugada real y sigue (partidas clásicas).
   */
  mode?: 'train' | 'guess';
  onFinish?: (r: LineResult) => void;
  maxWidth?: number;
}

/** Entrenador de líneas: el alumno juega un bando y el rival responde solo. */
export function LineTrainer({ moves, side, notes = {}, startPly = 0, mode = 'train', onFinish, maxWidth }: LineTrainerProps) {
  const [initial] = useState(() => {
    const c = new Chess(START_FEN);
    for (const san of moves.slice(0, startPly)) trySan(c, san);
    return c;
  });
  const chessRef = useRef(initial);
  const [fen, setFen] = useState(() => initial.fen());
  const [ply, setPly] = useState(startPly);
  const [lastMove, setLastMove] = useState<[string, string] | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [missesHere, setMissesHere] = useState(0);
  const [flash, setFlash] = useState<'good' | 'bad' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const timers = useRef<number[]>([]);
  const finished = useRef(false);

  const playerTotal = moves.slice(startPly).filter((_, i) => ((startPly + i) % 2 === 0 ? 'w' : 'b') === side).length;

  const apply = (san: string) => {
    const m = trySan(chessRef.current, san);
    if (!m) return;
    setFen(chessRef.current.fen());
    setLastMove([m.from, m.to]);
    m.captured ? sound.capture() : sound.move();
  };

  // Reproducir jugadas iniciales y respuestas del rival
  useEffect(() => {
    if (done) return;
    if (ply >= moves.length) {
      setDone(true);
      if (!finished.current) {
        finished.current = true;
        sound.correct();
        onFinish?.({ mistakes, correct, total: playerTotal });
      }
      return;
    }
    const turn = ply % 2 === 0 ? 'w' : 'b';
    if (turn !== side) {
      const t = window.setTimeout(() => {
        apply(moves[ply]);
        setPly((p) => p + 1);
      }, 550);
      timers.current.push(t);
      return () => clearTimeout(t);
    }
  }, [ply, done]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const pulse = (k: 'good' | 'bad') => {
    setFlash(null);
    requestAnimationFrame(() => setFlash(k));
  };

  const onMove = (from: string, to: string) => {
    const expected = moves[ply];
    const probe = new Chess(chessRef.current.fen());
    const m = tryMove(probe, from, to);
    if (!m) return false;
    if (sameMove(m.san, expected)) {
      apply(expected);
      pulse('good');
      setCorrect((c) => c + 1);
      setMissesHere(0);
      setMessage(null);
      setPly((p) => p + 1);
      return true;
    }
    pulse('bad');
    sound.wrong();
    setMistakes((x) => x + 1);
    if (mode === 'guess') {
      setMessage(`La jugada de la partida fue ${expected}.`);
      const t = window.setTimeout(() => {
        apply(expected);
        setPly((p) => p + 1);
      }, 700);
      timers.current.push(t);
    } else {
      setMissesHere((x) => x + 1);
      setMessage(missesHere >= 1 ? 'Fíjate en la flecha.' : 'No es la jugada de la línea. ¡Inténtalo otra vez!');
    }
    return false;
  };

  const isPlayerTurn = !done && ply >= startPly && ply < moves.length && (ply % 2 === 0 ? 'w' : 'b') === side;
  const hintArrow = (() => {
    if (!isPlayerTurn || mode !== 'train' || missesHere < 2) return undefined;
    const probe = new Chess(chessRef.current.fen());
    const m = trySan(probe, moves[ply]);
    return m ? [[m.from, m.to, 'rgb(224, 165, 38)'] as [string, string, string]] : undefined;
  })();
  const note = notes[String(ply)];

  return (
    <div className={styles.wrap}>
      <div className="row">
        <Badge tone="primary">{side === 'w' ? 'Juegas con blancas' : 'Juegas con negras'}</Badge>
        <Badge tone="success">
          <Icon name="check" weight="bold" size="1em" /> {correct}/{playerTotal}
        </Badge>
        {mistakes > 0 && <Badge tone="danger" icon="close">{mistakes}</Badge>}
      </div>
      <ChessBoard
        fen={fen}
        orientation={side === 'w' ? 'white' : 'black'}
        onMove={isPlayerTurn ? onMove : undefined}
        lastMove={lastMove}
        flash={flash}
        arrows={hintArrow}
        maxWidth={maxWidth}
      />
      <MoveList moves={moves} current={ply - 1} hideFrom={done ? undefined : ply} />
      {message && <p className={styles.note}>{message}</p>}
      {note && !message && <p className={styles.note}>{note}</p>}
      {isPlayerTurn && mode === 'train' && (
        <div className={styles.controls}>
          <Button size="sm" variant="ghost" onClick={() => setMissesHere(2)}>
            Mostrar jugada
          </Button>
        </div>
      )}
    </div>
  );
}
