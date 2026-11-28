import { Icon } from '@/components/ui/Icon';
import { useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { Button } from '@/components/ui';
import { resolveFen, trySan } from '@/services/chess/chessUtils';
import { ChessBoard, type Arrow } from './ChessBoard';
import { MoveList } from './MoveList';
import styles from './BoardStepper.module.css';

interface BoardStepperProps {
  fen?: string;
  moves: string[];
  notes?: Record<string, string>;
  arrows?: Arrow[];
  orientation?: 'white' | 'black';
  maxWidth?: number;
  /** Muestra el botón «Reproducir», que avanza solo */
  playable?: boolean;
  /** Se llama al llegar a la última jugada */
  onEnd?: () => void;
}

/** Pausa entre jugadas al reproducir; con comentario se da más tiempo para leerlo. */
const PLAY_MS = 1400;
const PLAY_NOTE_MS = 3500;

/** Recorre una secuencia de jugadas con anterior/siguiente mostrando comentarios. */
export function BoardStepper({ fen = 'start', moves, notes = {}, arrows, orientation = 'white', maxWidth, playable, onEnd }: BoardStepperProps) {
  const [ply, setPly] = useState(0);
  const [playing, setPlaying] = useState(false);
  const frames = useMemo(() => {
    const c = new Chess(resolveFen(fen));
    const out = [{ fen: c.fen(), last: null as [string, string] | null }];
    for (const san of moves) {
      const m = trySan(c, san);
      if (!m) break;
      out.push({ fen: c.fen(), last: [m.from, m.to] });
    }
    return out;
  }, [fen, moves]);

  const startPly = (() => {
    const parts = resolveFen(fen).split(' ');
    return (Number(parts[5]) - 1) * 2 + (parts[1] === 'b' ? 1 : 0);
  })();
  const frame = frames[Math.min(ply, frames.length - 1)];
  const note = notes[String(ply)];
  const last = frames.length - 1;
  const atEnd = ply >= last;

  /** Cualquier control manual detiene la reproducción. */
  const goTo = (n: number) => {
    setPlaying(false);
    setPly(Math.max(0, Math.min(last, n)));
  };

  useEffect(() => {
    if (!playing) return;
    if (atEnd) {
      setPlaying(false);
      return;
    }
    const t = window.setTimeout(() => setPly((p) => p + 1), note ? PLAY_NOTE_MS : PLAY_MS);
    return () => clearTimeout(t);
  }, [playing, ply, atEnd, note]);

  useEffect(() => {
    if (last > 0 && atEnd) onEnd?.();
    // Solo al llegar al final, no cada vez que cambia la función
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atEnd]);

  return (
    <div className={styles.wrap}>
      <ChessBoard fen={frame.fen} lastMove={frame.last} orientation={orientation} arrows={ply === 0 ? arrows : undefined} maxWidth={maxWidth} />
      {moves.length > 0 && (
        <>
          <div className={styles.controls}>
            <Button size="sm" variant="secondary" onClick={() => goTo(0)} disabled={ply === 0} aria-label="Inicio">
              <Icon name="skip-back" weight="bold" />
            </Button>
            <Button size="sm" variant="secondary" onClick={() => goTo(ply - 1)} disabled={ply === 0} aria-label="Anterior">
              <Icon name="prev" weight="bold" />
            </Button>
            <span className={styles.counter}>
              {ply}/{frames.length - 1}
            </span>
            <Button size="sm" onClick={() => goTo(ply + 1)} disabled={ply >= frames.length - 1} aria-label="Siguiente">
              <Icon name="next" weight="bold" />
            </Button>
            <Button size="sm" variant="secondary" onClick={() => goTo(last)} disabled={ply >= frames.length - 1} aria-label="Final">
              <Icon name="skip-forward" weight="bold" />
            </Button>
          </div>
          {playable && (
            <Button
              size="sm"
              variant="secondary"
              block
              onClick={() => {
                if (atEnd) setPly(0);
                setPlaying((p) => !p);
              }}
            >
              {playing ? 'Pausar' : atEnd ? 'Reproducir desde el inicio' : 'Reproducir'}
            </Button>
          )}
          {playable && note && <p className={styles.note}>{note}</p>}
          <MoveList moves={moves} startPly={startPly} current={ply - 1} onSelect={(i) => goTo(i + 1)} />
        </>
      )}
      {!playable && note && <p className={styles.note}>{note}</p>}
    </div>
  );
}
