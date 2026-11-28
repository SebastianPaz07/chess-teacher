import { Icon } from '@/components/ui/Icon';
import { Chess } from 'chess.js';
import { useEffect, useRef, useState } from 'react';
import { Badge, Button } from '@/components/ui';
import { sameMove, START_FEN, toSpanishSan, trySan, tryMove } from '@/services/chess/chessUtils';
import { sound } from '@/services/sound';
import { ChessBoard } from './ChessBoard';
import { MoveList } from './MoveList';
import styles from './BoardStepper.module.css';

export interface LineResult {
  mistakes: number;
  correct: number;
  /** Jugadas acertadas a la primera y sin ayuda */
  firstTry: number;
  total: number;
}

interface LineTrainerProps {
  moves: string[];
  /** Bando que juega el alumno; `both`: mueve los dos (aprenderse una partida entera) */
  side: 'w' | 'b' | 'both';
  /** Lado del tablero que queda abajo (por defecto, el del alumno) */
  orientation?: 'white' | 'black';
  notes?: Record<string, string>;
  /** Jugadas que se reproducen solas antes de empezar */
  startPly?: number;
  /** En partidas largas la respuesta y la ayuda van junto al tablero, antes de la lista de jugadas */
  feedbackFirst?: boolean;
  onFinish?: (r: LineResult) => void;
  maxWidth?: number;
}

const turnOf = (ply: number) => (ply % 2 === 0 ? 'w' : 'b');

/** Entrenador de líneas: el alumno juega (hay que acertar para avanzar) y, si juega un bando, el rival responde solo. */
export function LineTrainer({ moves, side, orientation, notes = {}, startPly = 0, feedbackFirst, onFinish, maxWidth }: LineTrainerProps) {
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
  const [firstTry, setFirstTry] = useState(0);
  const [missesHere, setMissesHere] = useState(0);
  const [flash, setFlash] = useState<'good' | 'bad' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const finished = useRef(false);

  const mine = (i: number) => side === 'both' || turnOf(i) === side;
  const playerTotal = moves.slice(startPly).filter((_, i) => mine(startPly + i)).length;

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
        onFinish?.({ mistakes, correct, firstTry, total: playerTotal });
      }
      return;
    }
    if (!mine(ply)) {
      const t = window.setTimeout(() => {
        apply(moves[ply]);
        setPly((p) => p + 1);
      }, 550);
      return () => clearTimeout(t);
    }
  }, [ply, done]);

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
      if (missesHere === 0) setFirstTry((c) => c + 1);
      setMissesHere(0);
      setMessage(null);
      setPly((p) => p + 1);
      return true;
    }
    pulse('bad');
    sound.wrong();
    setMistakes((x) => x + 1);
    setMissesHere((x) => x + 1);
    setMessage(missesHere >= 1 ? 'Fíjate en la flecha.' : 'Esa no es la jugada. ¡Inténtalo otra vez!');
    return false;
  };

  const isPlayerTurn = !done && ply >= startPly && ply < moves.length && mine(ply);
  const hintArrow = (() => {
    if (!isPlayerTurn || missesHere < 2) return undefined;
    const probe = new Chess(chessRef.current.fen());
    const m = trySan(probe, moves[ply]);
    return m ? [[m.from, m.to, 'rgb(224, 165, 38)'] as [string, string, string]] : undefined;
  })();
  const note = notes[String(ply)];
  const feedback = (
    <>
      {message && <p className={styles.note}>{message}</p>}
      {note && !message && <p className={styles.note}>{note}</p>}
    </>
  );
  const help = isPlayerTurn && (
    <div className={styles.controls}>
      <Button size="sm" variant="ghost" onClick={() => setMissesHere(2)}>
        Mostrar jugada{missesHere >= 2 && hintArrow ? `: ${toSpanishSan(moves[ply])}` : ''}
      </Button>
    </div>
  );

  return (
    <div className={styles.wrap}>
      <div className="row">
        <Badge tone="primary">{side === 'both' ? (turnOf(ply) === 'w' ? 'Mueven blancas' : 'Mueven negras') : side === 'w' ? 'Juegas con blancas' : 'Juegas con negras'}</Badge>
        <Badge tone="success">
          <Icon name="check" weight="bold" size="1em" /> {correct}/{playerTotal}
        </Badge>
        {mistakes > 0 && <Badge tone="danger" icon="close">{mistakes}</Badge>}
      </div>
      <ChessBoard
        fen={fen}
        orientation={orientation ?? (side === 'b' ? 'black' : 'white')}
        onMove={isPlayerTurn ? onMove : undefined}
        lastMove={lastMove}
        flash={flash}
        arrows={hintArrow}
        maxWidth={maxWidth}
      />
      {feedbackFirst && feedback}
      {feedbackFirst && help}
      <MoveList moves={moves} current={ply - 1} hideFrom={done ? undefined : ply} />
      {!feedbackFirst && feedback}
      {!feedbackFirst && help}
    </div>
  );
}
