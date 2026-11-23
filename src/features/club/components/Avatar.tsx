import { Icon } from '@/components/ui/Icon';
import styles from '../club.module.css';

interface AvatarProps {
  avatar: string;
  name: string;
  size?: number;
  me?: boolean;
  /** Llama: practicó hoy */
  active?: boolean;
  /** Atenuado: aún no practica hoy */
  idle?: boolean;
}

export function Avatar({ avatar, name, size = 40, me, active, idle }: AvatarProps) {
  return (
    <span
      className={[styles.avatar, me && styles.avatarMe, idle && styles.avatarIdle].filter(Boolean).join(' ')}
      style={{ width: size, height: size, fontSize: size * 0.58 }}
      title={name}
      aria-label={name}
      role="img"
    >
      <Icon name={avatar} />
      {active && (
        <span className={styles.avatarFlame} aria-label="Practicó hoy">
          <Icon name="fire" weight="bold" />
        </span>
      )}
    </span>
  );
}

export const AVATAR_CHOICES = ['piece-knight', 'piece-bishop', 'piece-rook', 'piece-queen', 'piece-king', 'piece-pawn'];
