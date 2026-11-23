import { Icon } from '@/components/ui/Icon';
import { Card, ProgressBar } from '@/components/ui';
import { todayKey } from '@/lib/date';
import { questTemplate } from '@/services/game/quests';
import { useGameStore } from '@/store/gameStore';
import styles from './QuestsCard.module.css';

export function QuestsCard({ compact }: { compact?: boolean }) {
  const daily = useGameStore((s) => s.daily);
  if (daily.date !== todayKey()) return null;
  const done = daily.quests.filter((q) => q.done).length;
  return (
    <Card title="Misiones del día" subtitle={`${done}/${daily.quests.length} completadas · +40 XP cada una`} icon="target" className={compact ? styles.compact : undefined}>
      <ul className={styles.list}>
        {daily.quests.map((q) => {
          const t = questTemplate(q.id);
          if (!t) return null;
          return (
            <li key={q.id} className={[styles.quest, q.done && styles.done].filter(Boolean).join(' ')}>
              <span className={styles.icon}><Icon name={q.done ? 'check-circle' : t.icon} /></span>
              <div style={{ flex: 1 }}>
                <div className={styles.title}>{t.title}</div>
                <ProgressBar value={q.progress / q.target} height={8} color={q.done ? 'var(--color-success)' : 'var(--color-accent)'} />
              </div>
              <span className={styles.count}>
                {q.progress}/{q.target}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
