import { Link, Navigate } from 'react-router-dom';
import { Button, ProgressBar, Skeleton } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { ClubCard } from '@/features/club/components/ClubCard';
import { QuestsCard } from '@/features/gamification/components/QuestsCard';
import { useGameSummary } from '@/features/gamification/hooks/useGameSummary';
import { formatDays } from '@/features/onboarding/days';
import { todayKey } from '@/lib/date';
import { type DailyTask } from '@/services/scheduler/dailyPlan';
import { useGameStore } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useDailyPlan } from './hooks/useDailyPlan';
import styles from './HomePage.module.css';

const TASK_META: Record<DailyTask['kind'], { icon: string; label: string }> = {
  review: { icon: 'review', label: 'Repaso' },
  lesson: { icon: 'book-open', label: 'Lección' },
  practice: { icon: 'crosshair', label: 'Ejercicios' },
  opening: { icon: 'books', label: 'Apertura' },
  classic: { icon: 'classic', label: 'Partida clásica' },
};

function taskLink(t: DailyTask): string {
  const daily = `daily=${encodeURIComponent(t.id)}`;
  switch (t.kind) {
    case 'review':
      return `/repaso?${daily}`;
    case 'lesson':
      return `/leccion/${t.lessonId}?${daily}`;
    case 'practice':
      return `/practica?${daily}`;
    case 'opening':
      return `/aperturas/${t.openingId}?line=${t.lineIndex}&${daily}`;
    case 'classic':
      return `/partidas?game=${encodeURIComponent(t.gameId)}&${daily}`;
  }
}

const dateLabel = () => new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

/**
 * Inicio guiado: misiones arriba, el siguiente paso del plan bien visible
 * y la competencia del club (ejercicios y minutos de estudio).
 */
export function HomePage() {
  const onboarded = useSettingsStore((s) => s.onboarded);
  const name = useSettingsStore((s) => s.playerName);
  const trainingDays = useSettingsStore((s) => s.trainingDays);
  const plan = useDailyPlan();
  const g = useGameSummary();
  const studiedSecs = useGameStore((s) => s.activityLog?.[todayKey()]?.seconds ?? 0);

  if (!onboarded) return <Navigate to="/empezar" replace />;

  const nextTask = plan.tasks.find((t) => !plan.tasksDone.includes(t.id));
  const minutesLeft = plan.tasks.filter((t) => !plan.tasksDone.includes(t.id)).reduce((a, t) => a + t.minutes, 0);
  const allDone = plan.ready && plan.total > 0 && plan.done === plan.total;
  const studied = Math.round(studiedSecs / 60);

  return (
    <div className={styles.page}>
      <header className={styles.masthead}>
        <p className="eyebrow">{dateLabel()}</p>
        <h1 className={styles.hello}>{name ? `Buenas, ${name}.` : 'Tu sesión de hoy.'}</h1>
        <p className={styles.dek}>
          {plan.restDay ? (
            <>
              Hoy es <strong>día de descanso</strong>: tu racha está a salvo.
            </>
          ) : (
            <>
              Plan de <strong>{plan.dailyMinutes} min</strong> · {formatDays(trainingDays)}
            </>
          )}{' '}
          · <Icon name="fire" /> {g.streak} · <Icon name="clock" /> {studied} min hoy ·{' '}
          <Link to="/empezar" className={styles.editPlan}>
            Ajustar plan
          </Link>
        </p>
      </header>

      <div className={styles.grid}>
        <div className={styles.main}>
          <QuestsCard compact />

          <section aria-labelledby="plan-title" className={styles.session}>
            <div className={styles.sectionHead}>
              <h2 id="plan-title" className={styles.sectionTitle}>
                {plan.restDay ? 'Sesión ligera (opcional)' : 'Tu sesión de hoy'}
              </h2>
              <span className={`${styles.count} num`}>
                {plan.done}/{plan.total}
              </span>
            </div>
            <ProgressBar value={plan.ratio} height={4} color="var(--color-primary)" />

            {!plan.ready ? (
              <div style={{ marginTop: 'var(--space-4)' }}>
                <Skeleton lines={3} height={52} />
              </div>
            ) : (
              <>
                {nextTask && (
                  <Link to={taskLink(nextTask)} className={styles.next}>
                    <span className={styles.nextIcon}>
                      <Icon name={TASK_META[nextTask.kind].icon} />
                    </span>
                    <span className={styles.nextText}>
                      <span className="eyebrow">
                        Paso {plan.tasks.indexOf(nextTask) + 1} de {plan.total} · {TASK_META[nextTask.kind].label} · {nextTask.minutes} min
                      </span>
                      <strong>{nextTask.title}</strong>
                    </span>
                    <span className={styles.nextGo}>
                      <Icon name="play" />
                    </span>
                  </Link>
                )}
                {nextTask && (
                  <Button to={taskLink(nextTask)} size="lg" block className={styles.cta}>
                    {plan.done === 0 ? 'Empezar la sesión' : 'Continuar'} · ≈ {minutesLeft} min
                  </Button>
                )}
                {allDone && <p className={styles.doneMsg}>¡Sesión completa! Mira cómo vas en el club o reta a un compañero.</p>}

                <ol className={styles.steps}>
                  {plan.tasks.map((t, i) => {
                    const done = plan.tasksDone.includes(t.id);
                    return (
                      <li key={t.id}>
                        <Link to={taskLink(t)} className={[styles.stepRow, done && styles.stepDone, nextTask?.id === t.id && styles.stepNext].filter(Boolean).join(' ')}>
                          <span className={styles.stepNum}>{done ? <Icon name="check" /> : i + 1}</span>
                          <span className={styles.stepTitle}>{t.title}</span>
                          <span className={styles.stepMin}>{t.minutes}′</span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </>
            )}
          </section>
        </div>

        <aside className={styles.side}>
          <ClubCard />
        </aside>
      </div>
    </div>
  );
}
