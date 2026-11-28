import type { MedalTier } from '@/services/game/achievements';
import { Icon } from './Icon';
import styles from './Medal.module.css';

interface MedalProps {
  tier: MedalTier;
  icon: string;
  /** Sin ganar: gris y con candado */
  locked?: boolean;
  size?: 'sm' | 'md';
}

/** Medalla de un logro: cinta y disco del color de su nivel. Es decorativa: el texto va al lado. */
export function Medal({ tier, icon, locked, size = 'md' }: MedalProps) {
  return (
    <span className={[styles.medal, styles[size], locked ? styles.locked : styles[tier]].join(' ')} aria-hidden>
      <span className={styles.ribbon} />
      <span className={styles.disc}>
        <Icon name={locked ? 'lock' : icon} size="1em" />
      </span>
    </span>
  );
}
