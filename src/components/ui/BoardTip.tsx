import { pieceList } from '@/services/chess/chessUtils';
import styles from './BoardTip.module.css';
import { Icon } from './Icon';

/** Consejo de estudio: llevar la posición a un tablero físico. */
export function BoardTip({ what = 'posición', compact }: { what?: 'posición' | 'partida' | 'línea'; compact?: boolean }) {
  const text =
    what === 'partida'
      ? 'Para revisar una partida, juégala en un tablero físico: mover las piezas con las manos fija mucho mejor las ideas.'
      : what === 'línea'
        ? 'Reprodúcela en un tablero físico, jugada por jugada: piensa cada respuesta como en una partida real, hasta que no tengas que mirar.'
        : 'Consejo: coloca esta posición en un tablero físico y revísala con calma. Mover las piezas con las manos ayuda a entender y recordar.';
  return (
    <p className={[styles.tip, compact && styles.compact].filter(Boolean).join(' ')}>
      <span aria-hidden className={styles.icon}>
        <Icon name="hint" />
      </span>
      <span>{text}</span>
    </p>
  );
}

/** Antes de resolver: invita a armar la posición en un tablero real y lista las piezas para colocarlas. */
export function PhysicalBoard({ fen }: { fen: string }) {
  const { white, black, turn } = pieceList(fen);
  return (
    <details className={styles.physical}>
      <summary>
        <Icon name="hint" />
        <span>
          <strong>Piénsalo en un tablero físico</strong>
          <small>Como en una partida real. Toca para ver cómo colocar las piezas.</small>
        </span>
      </summary>
      <dl>
        <dt>Blancas</dt>
        <dd>{white}</dd>
        <dt>Negras</dt>
        <dd>{black}</dd>
        <dt>Mueven</dt>
        <dd>{turn === 'w' ? 'las blancas' : 'las negras'}</dd>
      </dl>
    </details>
  );
}
