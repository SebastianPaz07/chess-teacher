import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, Button, Skeleton } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { loadPuzzlesNear } from '@/content/puzzles';
import { allOpenings, modules } from '@/content/registry';
import type { Exercise } from '@/content/schema';
import { formatDays } from '@/features/onboarding/days';
import { todayKey } from '@/lib/date';
import { difficultyStretch, isCoreTask, type DailyTask } from '@/services/scheduler/dailyPlan';
import { weakTopics } from '@/services/scheduler/progression';
import { themeReason, THEMES } from '@/services/scheduler/weekPlan';
import { projectWeek, type PlannedDay } from '@/services/scheduler/weekProjection';
import { useGameStore } from '@/store/gameStore';
import { useProgressStore } from '@/store/progressStore';
import { useReviewStore } from '@/store/reviewStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useDailyPlan } from './hooks/useDailyPlan';
import { useWeekThemes } from './hooks/useWeekThemes';
import { TASK_META } from './taskMeta';
import { taskLink } from './taskLink';
import styles from './WeekPage.module.css';

const FOCUS_LABEL = { tactica: 'táctica', teoria: 'teoría', finales: 'finales', 'medio-juego': 'medio juego' } as const;

const dayLabel = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'short' }).format(new Date(y, m - 1, d));
};

/** Detalle de un paso: qué apertura, qué línea o qué lección se verá. */
function detail(t: DailyTask): string | null {
  if (t.kind === 'opening') return allOpenings.find((o) => o.id === t.openingId)?.lines[t.lineIndex]?.name ?? null;
  if (t.kind === 'lesson') return modules.find((m) => m.lessons.some((l) => l.id === t.lessonId))?.title ?? null;
  return null;
}

/** Plan de entrenamiento de toda la semana: tema de cada día y lo que se va a trabajar. */
export function WeekPage() {
  const settings = useSettingsStore();
  const { themes, level } = useWeekThemes();
  const plan = useDailyPlan();
  const rating = useGameStore((s) => s.rating);
  const stats = useGameStore((s) => s.stats);
  const activityLog = useGameStore((s) => s.activityLog);
  const progress = useProgressStore();
  const cards = useReviewStore((s) => s.cards);
  const stretch = difficultyStretch(stats.puzzlesSolved, stats.puzzlesAttempted);
  // Solo los puzzles de tu nivel, para calcular la previsión
  const [puzzles, setPuzzles] = useState<Exercise[] | null>(null);
  useEffect(() => {
    let alive = true;
    loadPuzzlesNear(rating + stretch).then(
      (p) => alive && setPuzzles(p),
      () => alive && setPuzzles([]),
    );
    return () => {
      alive = false;
    };
  }, [rating, stretch]);
  const today = todayKey();
  const weak = weakTopics(progress);
  const favorite = allOpenings.find((o) => o.id === settings.favoriteOpening);

  const projected = useMemo(
    () =>
      puzzles && plan.ready
        ? projectWeek({
            today,
            themes,
            todayTasks: plan.tasks,
            cards: Object.values(cards),
            modules,
            progress,
            rating,
            dailyMinutes: settings.dailyMinutes,
            solvedIds: new Set(Object.keys(progress.exercises)),
            trainedLines: progress.openingLines,
            lessonDrafts: progress.lessonDrafts,
            puzzlePool: puzzles,
            focus: settings.focusAreas,
            favoriteOpening: settings.favoriteOpening,
            exploreOpenings: settings.exploreOpenings,
            learnedBasics: settings.learnedBasics,
            stretch,
          })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [puzzles, plan.ready, plan.tasks, themes, today],
  );
  // Mientras tanto se muestran los días con su tema y, si ya existe, el plan de hoy
  const days: PlannedDay[] =
    projected ??
    Object.entries(themes).map(([date, theme]) => ({
      date,
      theme,
      when: date < today ? 'past' : date === today ? 'today' : 'next',
      tasks: date === today && plan.ready ? plan.tasks.filter(isCoreTask) : [],
    }));

  if (!settings.onboarded) return <Navigate to="/empezar" replace />;

  const trainingCount = Object.values(themes).filter(Boolean).length;

  return (
    <div className="stack">
      <PageHeader compact icon="calendar" title="Mi semana de entrenamiento" subtitle={`${trainingCount} sesiones de ${settings.dailyMinutes} min · ${formatDays(settings.trainingDays)}`} />

      <section className={styles.profile} aria-label="Tu perfil de entrenamiento">
        <p>
          <strong>{settings.playerName ? `Plan de ${settings.playerName}` : 'Tu plan'}</strong> · nivel {level} · puntaje {rating}
        </p>
        <div className="row">
          {settings.focusAreas.map((f) => (
            <Badge key={f} tone="primary" icon="target">
              Reforzar {FOCUS_LABEL[f]}
            </Badge>
          ))}
          {favorite && (
            <Badge tone="accent" icon="books">
              {favorite.name}
            </Badge>
          )}
          {weak.slice(0, 2).map((w) => (
            <Badge key={w} tone="danger" icon="review">
              Te cuesta: {w.replace(/-/g, ' ')}
            </Badge>
          ))}
        </div>
        <Button size="sm" variant="secondary" to="/empezar" icon="sliders">
          Ajustar mi plan
        </Button>
      </section>

      <ol className={styles.days}>
          {days.map((d) => {
            const theme = d.theme ? THEMES[d.theme] : null;
            const done = activityLog?.[d.date];
            const minutes = d.tasks.reduce((a, t) => a + t.minutes, 0);
            return (
              <li key={d.date} className={[styles.day, d.when === 'today' && styles.today, d.when === 'past' && styles.past].filter(Boolean).join(' ')}>
                <header className={styles.head}>
                  <span className={styles.icon}>
                    <Icon name={theme?.icon ?? 'smile'} />
                  </span>
                  <span className={styles.titles}>
                    <span className="eyebrow">
                      {dayLabel(d.date)}
                      {d.when === 'today' && ' · hoy'}
                    </span>
                    <strong>{theme ? theme.title : 'Descanso'}</strong>
                  </span>
                  {minutes > 0 && <span className={`${styles.minutes} num`}>{minutes} min</span>}
                </header>
                {theme && (
                  <p className={styles.topics}>
                    {theme.topics}
                    {d.when !== 'past' && <small>{themeReason(theme.id, settings.focusAreas, weak, favorite?.name)}</small>}
                  </p>
                )}
                {d.when === 'past' ? (
                  <p className={styles.done}>
                    {done && ((done.seconds ?? 0) > 0 || done.puzzles + done.lessons + done.reviews > 0)
                      ? `Hiciste ${done.puzzles} ejercicios, ${done.lessons} lecciones y ${done.reviews} repasos · ${Math.round((done.seconds ?? 0) / 60)} min`
                      : theme
                        ? 'Sin actividad registrada.'
                        : 'Día libre.'}
                  </p>
                ) : !projected && theme && !d.tasks.length ? (
                  <Skeleton lines={2} height={32} />
                ) : (
                  d.tasks.length > 0 && (
                    <ul className={styles.tasks}>
                      {d.tasks.map((t) => {
                        const isDone = d.when === 'today' && plan.tasksDone.includes(t.id);
                        const body = (
                          <>
                            <Icon name={isDone ? 'check' : TASK_META[t.kind].icon} />
                            <span>
                              <small>{TASK_META[t.kind].label}</small>
                              {t.title}
                              {detail(t) && <small>{detail(t)}</small>}
                            </span>
                            <span className="num">{t.minutes}′</span>
                          </>
                        );
                        return (
                          <li key={t.id}>
                            {d.when === 'today' ? (
                              <Link to={taskLink(t)} className={[styles.task, isDone && styles.taskDone].filter(Boolean).join(' ')}>
                                {body}
                              </Link>
                            ) : (
                              <span className={styles.task}>{body}</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )
                )}
              </li>
            );
          })}
      </ol>
      <p className="muted" style={{ fontSize: '0.85rem', margin: 0 }}>
        Los días siguientes son una previsión: se ajustan según lo que resuelvas, lo que falles y las lecciones que completes. Ten un tablero físico a mano para pensar las posiciones.
      </p>
    </div>
  );
}
