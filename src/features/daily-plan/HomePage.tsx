import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { PieceScene } from '@/components/illustrations/PieceScene';
import { Button, ProgressBar, Skeleton } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { getResource } from '@/content/registry';
import type { Resource } from '@/content/schema';
import { ClubCard } from '@/features/club/components/ClubCard';
import { QuestsCard } from '@/features/gamification/components/QuestsCard';
import { useGameSummary } from '@/features/gamification/hooks/useGameSummary';
import { ResourceViewer } from '@/features/library/components/ResourceViewer';
import { NamePrompt } from '@/features/onboarding/NamePrompt';
import { addDays, todayKey } from '@/lib/date';
import { coachNote } from '@/services/scheduler/coach';
import { difficultyStretch, effectiveLevel } from '@/services/scheduler/dailyPlan';
import { weakTopics } from '@/services/scheduler/progression';
import { THEMES } from '@/services/scheduler/weekPlan';
import { useClubStore } from '@/store/clubStore';
import { useGameStore } from '@/store/gameStore';
import { useProgressStore } from '@/store/progressStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useDailyPlan } from './hooks/useDailyPlan';
import { useWeekThemes } from './hooks/useWeekThemes';
import { taskLink } from './taskLink';
import { TASK_META } from './taskMeta';
import styles from './HomePage.module.css';

const dateLabel = () => new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

const weekdayShort = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('es', { weekday: 'short' }).format(new Date(y, m - 1, d));
};

/**
 * Inicio guiado: la sesión de hoy primero, las misiones debajo
 * y la competencia del club (ejercicios y minutos de estudio).
 */
export function HomePage() {
  const onboarded = useSettingsStore((s) => s.onboarded);
  const playerName = useSettingsStore((s) => s.playerName);
  const profileName = useClubStore((s) => s.profile?.name);
  const clubLoading = useClubStore((s) => s.status === 'loading');
  const trainingDays = useSettingsStore((s) => s.trainingDays);
  const plan = useDailyPlan();
  const g = useGameSummary();
  const activityLog = useGameStore((s) => s.activityLog);
  const stats = useGameStore((s) => s.stats);
  const rating = useGameStore((s) => s.rating);
  const mastery = useProgressStore((s) => s.mastery);
  const placementLevel = useProgressStore((s) => s.placementLevel);
  const studiedSecs = activityLog?.[todayKey()]?.seconds ?? 0;
  const { themes } = useWeekThemes();
  /** Libro o video abierto dentro de la app */
  const [resource, setResource] = useState<Resource | null>(null);

  if (!onboarded) return <Navigate to="/empezar" replace />;

  // El saludo siempre lleva nombre: el guardado, el del perfil del club o el que pidamos ahora
  const name = playerName.trim() || profileName?.trim();
  if (!name) return clubLoading ? <Skeleton lines={4} height={60} /> : <NamePrompt />;

  const nextTask = plan.tasks.find((t) => !plan.tasksDone.includes(t.id));
  const pending = plan.tasks.filter((t) => !plan.tasksDone.includes(t.id));
  const minutesLeft = pending.reduce((a, t) => a + t.minutes, 0);
  const minutesTotal = plan.tasks.reduce((a, t) => a + t.minutes, 0);
  const allDone = plan.ready && plan.total > 0 && plan.done === plan.total;
  const studied = Math.round(studiedSecs / 60);

  const today = todayKey();
  const week = Array.from({ length: 7 }, (_, i) => Math.round((activityLog?.[addDays(today, i - 6)]?.seconds ?? 0) / 60));
  const coach = coachNote({
    level: effectiveLevel({ lessons: {}, mastery, placementLevel }, rating),
    rating,
    stretch: difficultyStretch(stats.puzzlesSolved, stats.puzzlesAttempted),
    solved: stats.puzzlesSolved,
    attempted: stats.puzzlesAttempted,
    weak: weakTopics({ lessons: {}, mastery, placementLevel }),
    streak: g.streak,
    dailyMinutes: plan.dailyMinutes,
    studiedToday: studied,
    stepsDone: plan.done,
    stepsTotal: plan.total,
    restDay: plan.restDay,
    week,
    trainingDaysPerWeek: trainingDays.length || 7,
  });

  return (
    <div className={styles.page}>
      <header className={styles.masthead}>
        <div className={styles.mastArt} aria-hidden>
          <PieceScene size={72} scene={{ b: '...../..k../...../..N../.K...', a: ['2,3>3,1'] }} />
        </div>
        <p className="eyebrow">{dateLabel()}</p>
        <h1 className={styles.hello}>Hola, {name}.</h1>
        <p className={styles.dek}>
          {plan.restDay ? (
            <strong>Día de descanso</strong>
          ) : (
            <>
              Plan de <strong>{plan.dailyMinutes} min</strong>
            </>
          )}{' '}
          ·{' '}
          <Link to="/empezar" className={styles.editPlan}>
            Ajustar plan
          </Link>
        </p>
      </header>

      <div className={styles.grid}>
        <div className={styles.main}>
          <section aria-labelledby="plan-title" className={styles.session}>
            <div className={styles.sectionHead}>
              <h2 id="plan-title" className={styles.sectionTitle}>
                {plan.restDay ? 'Sesión ligera (opcional)' : 'Tu sesión de hoy'}
              </h2>
              <span className={`${styles.count} num`}>
                {plan.done}/{plan.total}
              </span>
            </div>
            {plan.theme && (
              <p className={styles.theme}>
                <Icon name={THEMES[plan.theme].icon} />
                <span>
                  Hoy toca <strong>{THEMES[plan.theme].title}</strong>: {THEMES[plan.theme].topics.toLowerCase()}.
                </span>
              </p>
            )}
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
                        Siguiente paso: {TASK_META[nextTask.kind].label} · {nextTask.minutes} min
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
                    {plan.done === 0 ? 'Empezar sesión' : 'Continuar'} · {minutesLeft} min
                  </Button>
                )}
                {nextTask && plan.done === 0 && minutesTotal !== plan.dailyMinutes && !plan.restDay && (
                  <p className={styles.timeNote}>
                    Ajustado a tu tiempo: {minutesTotal} min de los {plan.dailyMinutes} que elegiste.
                  </p>
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

          <section aria-labelledby="week-title" className={styles.free}>
            <h2 id="week-title" className={styles.coachTitle}>
              Tu semana
            </h2>
            <ol className={styles.weekPlan}>
              {Object.entries(themes).map(([date, id]) => (
                <li key={date} className={[styles.weekPlanDay, date === today && styles.weekPlanToday].filter(Boolean).join(' ')} aria-current={date === today ? 'date' : undefined}>
                  <small>{weekdayShort(date)}</small>
                  <Icon name={id ? THEMES[id].icon : 'smile'} title={id ? THEMES[id].title : 'Descanso'} />
                  <span>{id ? THEMES[id].title : 'Descanso'}</span>
                </li>
              ))}
            </ol>
            <Button to="/semana" variant="secondary" icon="calendar" block>
              Ver mi plan completo
            </Button>
          </section>

          <section aria-labelledby="coach-title" className={styles.coach}>
            <h2 id="coach-title" className={styles.coachTitle}>
              Tu entrenador personal
            </h2>
            <p className={styles.coachHead}>{coach.headline}</p>
            <ul className={styles.coachList}>
              {coach.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <div className={styles.goal}>
              <span>
                Meta: <strong>{coach.goal.target}</strong> de rating · te faltan {coach.goal.missing}
              </span>
              <ProgressBar value={coach.goal.progress} height={6} color="var(--color-primary)" />
            </div>
          </section>

          {plan.extras.length > 0 && (
            <section aria-labelledby="free-title" className={styles.free}>
              <h2 id="free-title" className={styles.coachTitle}>
                Para tus ratos libres
              </h2>
              <ul className={styles.freeList}>
                {plan.extras.map((t) => {
                  if (t.kind !== 'recommendation') return null;
                  const material = (t.subtype === 'book' || t.subtype === 'video') && t.resourceId ? getResource(t.resourceId) : undefined;
                  const body = (
                    <>
                      <Icon name={t.subtype === 'book' ? 'book-open' : t.subtype === 'video' ? 'play' : 'hint'} />
                      <span>
                        <strong>{t.title}</strong>
                        {t.note && <small>{t.note}</small>}
                      </span>
                    </>
                  );
                  return (
                    <li key={t.id}>
                      {material ? (
                        <button type="button" className={styles.freeItem} onClick={() => setResource(material)}>
                          {body}
                        </button>
                      ) : (
                        <Link to={taskLink(t)} className={styles.freeItem}>
                          {body}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <QuestsCard compact />
        </div>

        <aside className={styles.side}>
          <ClubCard />
        </aside>
      </div>
      <ResourceViewer resource={resource} onClose={() => setResource(null)} />
    </div>
  );
}
