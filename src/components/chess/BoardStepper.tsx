import { Icon } from '@/components/ui/Icon';
import { useMemo, useState } from 'react';
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
}

/** Recorre una secuencia de jugadas con anterior/siguiente mostrando comentarios. */
export function BoardStepper({ fen = 'start', moves, notes = {}, arrows, orientation = 'white', maxWidth }: BoardStepperProps) {
  const [ply, setPly] = useState(0);
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

  return (
    <div className={styles.wrap}>
      <ChessBoard fen={frame.fen} lastMove={frame.last} orientation={orientation} arrows={ply === 0 ? arrows : undefined} maxWidth={maxWidth} />
      {moves.length > 0 && (
        <>
          <div className={styles.controls}>
            <Button size="sm" variant="secondary" onClick={() => setPly(0)} disabled={ply === 0} aria-label="Inicio">
              <Icon name="skip-back" weight="bold" />
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setPly((p) => Math.max(0, p - 1))} disabled={ply === 0} aria-label="Anterior">
              <Icon name="prev" weight="bold" />
            </Button>
            <span className={styles.counter}>
              {ply}/{frames.length - 1}
            </span>
            <Button size="sm" onClick={() => setPly((p) => Math.min(frames.length - 1, p + 1))} disabled={ply >= frames.length - 1} aria-label="Siguiente">
              <Icon name="next" weight="bold" />
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setPly(frames.length - 1)} disabled={ply >= frames.length - 1} aria-label="Final">
              <Icon name="skip-forward" weight="bold" />
            </Button>
          </div>
          <MoveList moves={moves} startPly={startPly} current={ply - 1} onSelect={(i) => setPly(i + 1)} />
        </>
      )}
      {note && <p className={styles.note}>{note}</p>}
    </div>
  );
}
