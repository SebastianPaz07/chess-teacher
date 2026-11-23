import { useEffect, type ReactNode } from 'react';
import { Badge, Button } from '@/components/ui';
import { toSpanishSan } from '@/services/chess/chessUtils';
import { ChessBoard } from './ChessBoard';
import { usePuzzle, type PuzzleResult } from './usePuzzle';
import styles from './PuzzleBoard.module.css';

interface PuzzleBoardProps {
  fen: string;
  solution: string[];
  prompt?: ReactNode;
  maxMistakes?: number;
  onFinish?: (r: PuzzleResult) => void;
  onMistake?: (mistakes: number) => void;
  onCorrect?: () => void;
  showHelp?: boolean;
  maxWidth?: number;
  footer?: ReactNode;
  /** Validar alternativas con el motor (por defecto no: manda la solución del ejercicio) */
  engineCheck?: boolean;
}

/** Tablero de ejercicio reutilizable (lecciones, práctica, repaso, rush, test). */
export function PuzzleBoard({ fen, solution, prompt, maxMistakes, onFinish, onMistake, onCorrect, showHelp = true, maxWidth, footer, engineCheck }: PuzzleBoardProps) {
  const p = usePuzzle({ fen, solution, maxMistakes, onFinish, onMistake, onCorrect, engineCheck });
  const toMove = p.playerColor === 'w' ? 'Juegan blancas' : 'Juegan negras';
  const { nav } = p;

  // Flechas del teclado para revisar el ejercicio terminado
  useEffect(() => {
    if (!nav.enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'ArrowLeft') nav.prev();
      else if (e.key === 'ArrowRight') nav.next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nav]);

  return (
    <div className={styles.wrap}>
      <div className={styles.top}>
        <Badge tone={p.playerColor === 'w' ? 'neutral' : 'primary'} icon={p.playerColor === 'w' ? 'piece-pawn-w' : 'piece-pawn'}>
          {toMove}
        </Badge>
        {prompt && <span className={styles.prompt}>{prompt}</span>}
      </div>
      <ChessBoard
        fen={p.position}
        orientation={p.orientation}
        onMove={p.isPlayerTurn && !nav.enabled ? p.onMove : undefined}
        lastMove={p.lastMove}
        flash={p.flash}
        maxWidth={maxWidth}
        highlights={p.hintSquare ? { [p.hintSquare]: 'rgba(224, 165, 38, 0.65)' } : undefined}
        arrows={p.solutionArrow ? [[...p.solutionArrow, 'rgb(192, 57, 43)']] : undefined}
      />

      {p.checking && (
        <div className={styles.engine} role="status" aria-live="polite">
          <span className={styles.spinner} aria-hidden /> Comprobando tu jugada…
          <Button size="sm" variant="ghost" onClick={p.cancelCheck}>
            Cancelar
          </Button>
        </div>
      )}

      {p.stuck && (
        <div className={styles.stuck} role="status" aria-live="polite">
          <p className={styles.stuckText}>
            <strong>Esa no es la mejor.</strong> Tómate tu tiempo: no hay prisa.
          </p>
          <div className={styles.help}>
            <Button size="sm" variant="secondary" onClick={p.keepThinking}>
              Seguir pensando
            </Button>
            {showHelp && (
              <Button size="sm" variant="secondary" icon="hint" onClick={p.hint}>
                Pista
              </Button>
            )}
            {showHelp && (
              <Button size="sm" variant="ghost" onClick={p.playNext}>
                Mostrar la jugada
              </Button>
            )}
          </div>
        </div>
      )}

      {p.bookLine && (
        <p className={styles.engine} role="status">
          <strong>Solución alternativa válida.</strong> Línea del libro: {p.bookLine.map(toSpanishSan).join(' ')}
        </p>
      )}

      {showHelp && p.status === 'playing' && !p.stuck && !p.checking && (
        <div className={styles.help}>
          <Button size="sm" variant="secondary" icon="hint" onClick={p.hint}>
            Pista
          </Button>
          <Button size="sm" variant="ghost" onClick={p.reveal}>
            Ver solución
          </Button>
        </div>
      )}

      {nav.enabled && (
        <div className={styles.nav} role="group" aria-label="Revisar jugadas">
          <Button size="sm" variant="ghost" icon="skip-back" onClick={nav.first} disabled={nav.index === 0} aria-label="Posición inicial" />
          <Button size="sm" variant="secondary" icon="prev" onClick={nav.prev} disabled={nav.index === 0} aria-label="Jugada anterior" />
          <span className={styles.navCount}>
            {nav.index === 0 ? 'Inicio' : toSpanishSan(p.frames[nav.index]?.san ?? '')} · {nav.index}/{nav.total}
          </span>
          <Button size="sm" variant="secondary" icon="next" onClick={nav.next} disabled={nav.index === nav.total} aria-label="Jugada siguiente" />
          <Button size="sm" variant="ghost" icon="skip-forward" onClick={nav.last} disabled={nav.index === nav.total} aria-label="Posición final" />
        </div>
      )}
      {footer}
    </div>
  );
}
