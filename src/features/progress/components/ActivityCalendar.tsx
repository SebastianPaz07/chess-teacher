import { addDays, todayKey } from '@/lib/date';
import styles from '../ProgressPage.module.css';

interface Props {
  /** XP por día (YYYY-MM-DD → XP) */
  history: Record<string, number>;
  weeks?: number;
}

/** Calendario de actividad estilo "contribuciones": más intenso = más XP ese día. */
export function ActivityCalendar({ history, weeks = 12 }: Props) {
  const today = todayKey();
  const days = Array.from({ length: weeks * 7 }, (_, i) => addDays(today, i - (weeks * 7 - 1)));
  const maxXp = Math.max(50, ...days.map((d) => history[d] ?? 0));
  return (
    <div className={styles.calendar} style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }}>
      {Array.from({ length: weeks }, (_, w) => (
        <div key={w} className={styles.week}>
          {days.slice(w * 7, w * 7 + 7).map((d) => {
            const xp = history[d] ?? 0;
            const alpha = xp ? 0.25 + 0.75 * (xp / maxXp) : 0;
            return <span key={d} title={`${d}: ${xp} XP`} className={styles.day} style={xp ? { background: `rgb(46 139 87 / ${alpha})` } : undefined} />;
          })}
        </div>
      ))}
    </div>
  );
}
