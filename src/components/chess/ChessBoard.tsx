import { Chess, type Square } from 'chess.js';
import { memo, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Chessboard } from 'react-chessboard';
import { useElementWidth } from '@/hooks/useElementWidth';
import { useViewportHeight } from '@/hooks/useViewportHeight';
import { legalTargets, resolveFen } from '@/services/chess/chessUtils';
import styles from './ChessBoard.module.css';

export type Arrow = [string, string, string?];

export interface ChessBoardProps {
  fen: string;
  orientation?: 'white' | 'black';
  /** Devuelve true si la jugada se acepta. Sin callback → tablero de solo lectura. */
  onMove?: (from: string, to: string) => boolean;
  arrows?: Arrow[];
  highlights?: Record<string, string>;
  lastMove?: [string, string] | null;
  maxWidth?: number;
  flash?: 'good' | 'bad' | null;
  /** Cabecera justo encima, con el mismo ancho que el tablero */
  header?: ReactNode;
}

/** Alto aproximado de la cabecera (título y guía del ejercicio) */
const HEADER_HEIGHT = 70;

/**
 * Wrapper de react-chessboard: arrastrar o tocar origen→destino,
 * muestra jugadas legales, última jugada, flechas y destellos de acierto/error.
 */
export const ChessBoard = memo(function ChessBoard({ fen, orientation = 'white', onMove, arrows, highlights, lastMove, maxWidth = 640, flash, header }: ChessBoardProps) {
  const [ref, width, measured] = useElementWidth<HTMLDivElement>();
  const viewportH = useViewportHeight();
  // El tablero cabe completo en pantalla: ancho disponible, tope del diseño y alto visible
  // (descontando cabecera, barra inferior y los controles que lo rodean).
  const chrome = (typeof window !== 'undefined' && window.innerWidth >= 1100 ? 200 : 250) + (header ? HEADER_HEIGHT : 0);
  const size = Math.max(0, Math.floor(Math.min(width, maxWidth, Math.max(260, viewportH - chrome))));
  const [selected, setSelected] = useState<string | null>(null);
  const position = resolveFen(fen);
  const chess = useMemo(() => new Chess(position), [position]);
  const interactive = Boolean(onMove);

  const targets = useMemo(() => (selected ? legalTargets(chess, selected) : []), [chess, selected]);

  const squareStyles = useMemo(() => {
    const s: Record<string, CSSProperties> = {};
    if (lastMove) for (const sq of lastMove) s[sq] = { background: 'rgba(176, 137, 63, 0.45)' };
    if (highlights) for (const [sq, color] of Object.entries(highlights)) s[sq] = { background: color };
    if (selected) s[selected] = { background: 'rgba(20, 85, 30, 0.5)' };
    for (const t of targets) {
      const occupied = chess.get(t as Square);
      s[t] = {
        ...s[t],
        background: occupied
          ? 'radial-gradient(circle, transparent 58%, rgba(0,0,0,.25) 60%)'
          : 'radial-gradient(circle, rgba(0,0,0,.22) 22%, transparent 24%)',
      };
    }
    return s;
  }, [lastMove, highlights, selected, targets, chess]);

  const customArrows = useMemo(() => arrows?.map(([a, b, c]) => [a as Square, b as Square, c ?? 'rgb(0, 128, 96)'] as [Square, Square, string]), [arrows]);

  const attempt = (from: string, to: string) => {
    setSelected(null);
    return onMove ? onMove(from, to) : false;
  };

  const onSquareClick = (square: string) => {
    if (!interactive) return;
    if (selected && targets.includes(square)) {
      attempt(selected, square);
      return;
    }
    const piece = chess.get(square as Square);
    setSelected(piece && piece.color === chess.turn() ? square : null);
  };

  return (
    <div ref={ref} className={[styles.wrap, header && styles.stacked].filter(Boolean).join(' ')} style={{ maxWidth }}>
      {header && <div style={{ width: size || '100%' }}>{header}</div>}
      <div className={[styles.board, flash && styles[flash]].filter(Boolean).join(' ')} style={{ width: size || '100%', height: size || undefined }}>
        {measured && size > 0 ? (
          <Chessboard
            id="board"
            position={position}
            boardWidth={size}
            boardOrientation={orientation}
            arePiecesDraggable={interactive}
            isDraggablePiece={({ piece }) => interactive && piece[0] === chess.turn()}
            onPieceDrop={(from, to) => attempt(from, to)}
            onPieceDragBegin={(_p, sq) => setSelected(sq)}
            onSquareClick={onSquareClick}
            customSquareStyles={squareStyles}
            customArrows={customArrows}
            customDarkSquareStyle={{ backgroundColor: 'var(--board-dark)' }}
            customLightSquareStyle={{ backgroundColor: 'var(--board-light)' }}
            customBoardStyle={{ borderRadius: 0, boxShadow: '0 0 0 1px var(--color-rule)' }}
            autoPromoteToQueen
            animationDuration={220}
          />
        ) : (
          <div className={styles.placeholder} aria-hidden />
        )}
      </div>
    </div>
  );
});
