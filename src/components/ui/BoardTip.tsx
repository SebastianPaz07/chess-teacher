import { Icon } from './Icon';

/** Consejo de estudio: llevar la posición a un tablero físico. */
export function BoardTip({ what = 'posición', compact }: { what?: 'posición' | 'partida' | 'línea'; compact?: boolean }) {
  const text =
    what === 'partida'
      ? 'Para revisar una partida, juégala en un tablero físico: mover las piezas con las manos fija mucho mejor las ideas.'
      : what === 'línea'
        ? 'Después de verla aquí, reprodúcela en un tablero físico, jugada por jugada, hasta que no tengas que mirar.'
        : 'Consejo: coloca esta posición en un tablero físico y revísala con calma. Mover las piezas con las manos ayuda a entender y recordar.';
  return (
    <p className="muted" style={{ margin: compact ? '8px 0 0' : '12px 0 0', fontSize: '0.85rem', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <span aria-hidden style={{ color: 'var(--color-accent)', display: 'inline-flex', marginTop: 2 }}>
        <Icon name="lightbulb" />
      </span>
      <span>{text}</span>
    </p>
  );
}
