import { useLocation } from 'react-router-dom';
import { isCoreTask } from '@/services/scheduler/dailyPlan';
import { useGameStore } from '@/store/gameStore';
import styles from './DailyStepBanner.module.css';

const KIND_LABEL = { review: 'Calentamiento', lesson: 'Lección', practice: 'Ejercicios', opening: 'Apertura', classic: 'Partida clásica', recommendation: '' } as const;

/**
 * Franja fija en las pantallas abiertas desde el plan: en qué paso de la sesión
 * de hoy estás y cuántos llevas completados.
 */
export function DailyStepBanner() {
  const { search, pathname } = useLocation();
  const taskId = new URLSearchParams(search).get('daily');
  const plan = useGameStore((s) => s.plan);
  const tasksDone = useGameStore((s) => s.daily.tasksDone);
  if (!taskId || pathname === '/') return null;
  const core = plan?.tasks.filter(isCoreTask) ?? [];
  const index = core.findIndex((t) => t.id === taskId);
  if (index < 0) return null;
  const done = core.filter((t) => tasksDone.includes(t.id)).length;
  const task = core[index];
  return (
    <div className={styles.banner} role="status">
      <strong>Sesión de hoy · Paso {index + 1} de {core.length}</strong>
      <span>{KIND_LABEL[task.kind]} · {done} completado{done === 1 ? '' : 's'}</span>
      <span className={styles.dots} aria-hidden>
        {core.map((t, i) => (
          <i key={t.id} className={[tasksDone.includes(t.id) && styles.done, i === index && styles.current].filter(Boolean).join(' ')} />
        ))}
      </span>
    </div>
  );
}
