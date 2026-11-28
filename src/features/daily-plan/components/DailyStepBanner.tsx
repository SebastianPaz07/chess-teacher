import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui';
import { todayKey } from '@/lib/date';
import { isCoreTask } from '@/services/scheduler/dailyPlan';
import { useGameStore } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import styles from './DailyStepBanner.module.css';

const KIND_LABEL = { review: 'Calentamiento', lesson: 'Lección', practice: 'Ejercicios', opening: 'Apertura', classic: 'Partida clásica', recommendation: '' } as const;

/**
 * Franja fija en las pantallas abiertas desde el plan: en qué paso de la sesión
 * de hoy estás y cuántos llevas completados. Si ya pasaste tu tiempo y el plan
 * no está terminado, explica que puedes pausar y seguir mañana.
 */
export function DailyStepBanner() {
  const { search, pathname } = useLocation();
  const taskId = new URLSearchParams(search).get('daily');
  const plan = useGameStore((s) => s.plan);
  const tasksDone = useGameStore((s) => s.daily.tasksDone);
  const seconds = useGameStore((s) => s.activityLog?.[todayKey()]?.seconds ?? 0);
  const dailyMinutes = useSettingsStore((s) => s.dailyMinutes);
  /** Día en que se eligió seguir: no se vuelve a avisar hasta mañana */
  const [keptOn, setKeptOn] = useState('');
  if (!taskId || pathname === '/') return null;
  const core = plan?.tasks.filter(isCoreTask) ?? [];
  const index = core.findIndex((t) => t.id === taskId);
  if (index < 0) return null;
  const done = core.filter((t) => tasksDone.includes(t.id)).length;
  const task = core[index];
  const studied = Math.floor(seconds / 60);
  const overTime = studied >= dailyMinutes && done < core.length && keptOn !== todayKey();
  return (
    <>
      <div className={styles.banner} role="status">
        <strong>Sesión de hoy · Paso {index + 1} de {core.length}</strong>
        <span>{KIND_LABEL[task.kind]} · {done} completado{done === 1 ? '' : 's'}</span>
        <span className={styles.dots} aria-hidden>
          {core.map((t, i) => (
            <i key={t.id} className={[tasksDone.includes(t.id) && styles.done, i === index && styles.current].filter(Boolean).join(' ')} />
          ))}
        </span>
      </div>
      {overTime && (
        <div className={styles.pause} role="status">
          <p>
            <strong>Ya llevas {studied} min hoy y tu plan es de {dailyMinutes}.</strong> Has completado {done} de {core.length} pasos. Puedes pausar y seguir mañana: los ejercicios resueltos quedan registrados y una lección a medias se retoma donde la dejaste.
          </p>
          <div className={styles.pauseActions}>
            <Button size="sm" to="/">
              Pausar y volver al inicio
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setKeptOn(todayKey())}>
              Seguir ahora
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
