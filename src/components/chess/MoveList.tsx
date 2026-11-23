import { formatMoveList } from '@/services/chess/chessUtils';
import { useSettingsStore } from '@/store/settingsStore';
import styles from './MoveList.module.css';

interface MoveListProps {
  moves: string[];
  startPly?: number;
  /** Índice de la jugada actual (−1 = ninguna) */
  current?: number;
  onSelect?: (index: number) => void;
  /** Ocultar jugadas a partir de este índice (modo entrenamiento) */
  hideFrom?: number;
}

export function MoveList({ moves, startPly = 0, current = -1, onSelect, hideFrom }: MoveListProps) {
  const spanish = useSettingsStore((s) => s.spanishNotation);
  const items = formatMoveList(moves, startPly, spanish);
  return (
    <div className={styles.list}>
      {items.map((it, i) => (
        <span key={i} className={styles.item}>
          {it.number && <span className={styles.num}>{it.number}</span>}
          <button
            className={[styles.move, i === current && styles.current].filter(Boolean).join(' ')}
            onClick={onSelect ? () => onSelect(i) : undefined}
            disabled={!onSelect || (hideFrom !== undefined && i >= hideFrom)}
          >
            {hideFrom !== undefined && i >= hideFrom ? '…' : it.san}
          </button>
        </span>
      ))}
    </div>
  );
}
