import { Link } from 'react-router-dom';
import { ProgressRing, StatPill } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { useGameSummary } from '@/features/gamification/hooks/useGameSummary';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import styles from './TopBar.module.css';

/** Cabecera tipo "mancheta": marca en móvil, nivel y cifras clave del día. */
export function TopBar() {
  const g = useGameSummary();
  return (
    <header className={styles.bar}>
      <Link to="/" className={styles.brand} aria-label="Inicio">
        <span className={styles.logo} aria-hidden>
          ♞
        </span>
        <span className={styles.brandText}>ChezzClub</span>
      </Link>
      <Link to="/progreso" className={styles.level} title={`Nivel ${g.level} · ${g.rank.name}`}>
        <ProgressRing value={g.levelRatio} size={36} stroke={3} color="var(--color-accent)">
          <span className={styles.rankIcon}>
            <Icon name={g.rank.icon} size="1.1rem" />
          </span>
        </ProgressRing>
        <span className={styles.levelText}>
          <strong>
            Nivel {g.level} · {g.rank.name}
          </strong>
          <span className="muted num">
            {g.levelCurrent}/{g.levelNeeded} XP
          </span>
        </span>
      </Link>
      <div className={styles.stats}>
        <StatPill icon="fire" value={g.streak} color={g.streak > 0 ? 'var(--color-streak)' : undefined} title={`Racha: ${g.streak} días · Mejor: ${g.streakBest}`} />
        {g.freezes > 0 && (
          <span className={styles.hideSm}>
            <StatPill icon="shield" value={g.freezes} title="Protectores de racha" />
          </span>
        )}
        <span className={styles.hideSm}>
          <StatPill icon="diamond" value={g.xpToday} label="XP hoy" color="var(--color-xp)" title="XP ganada hoy" />
        </span>
      </div>
      <NotificationBell />
    </header>
  );
}
