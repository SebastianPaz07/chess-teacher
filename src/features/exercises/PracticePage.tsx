import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, EmptyState, Loader } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { getExercise, modules } from '@/content/registry';
import type { Exercise } from '@/content/schema';
import { useCompleteDailyTask } from '@/features/daily-plan/hooks/useDailyPlan';
import { usePuzzles } from '@/hooks/usePuzzles';
import { pickAdaptive } from '@/services/game/rating';
import { fetchLichessPuzzles } from '@/services/lichess/lichessPuzzles';
import { isModuleUnlocked, masteryRatio } from '@/services/scheduler/progression';
import { useGameStore } from '@/store/gameStore';
import { useProgressStore } from '@/store/progressStore';
import { THEME_GROUPS, themeGroup, themeLabel } from './themes';
import { ExerciseSession, type SessionResult } from './components/ExerciseSession';
import { SessionSummary } from './components/SessionSummary';
import styles from './PracticePage.module.css';

const SESSION_SIZE = 5;

export function PracticePage() {
  const [params] = useSearchParams();
  const daily = useCompleteDailyTask();
  const plan = useGameStore((s) => s.plan);
  const rating = useGameStore((s) => s.rating);
  const progress = useProgressStore();
  const [theme, setTheme] = useState<string | null>(null);
  const [session, setSession] = useState<Exercise[] | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SessionResult[] | null>(null);
  const [round, setRound] = useState(0);

  const { puzzles, ready } = usePuzzles();
  const pool = useMemo(
    () => [...modules.filter((m) => isModuleUnlocked(m, modules, progress)).flatMap((m) => m.exercises), ...puzzles],
    [progress, puzzles],
  );

  const themes = useMemo(() => {
    const count: Record<string, number> = {};
    pool.forEach((e) => e.themes.forEach((t) => (count[t] = (count[t] ?? 0) + 1)));
    return Object.entries(count).sort((a, b) => b[1] - a[1]);
  }, [pool]);

  // Sesión del plan diario
  const dailyIds = params.get('daily') === 'practice' ? plan?.tasks.find((t) => t.kind === 'practice') : undefined;
  const dailySet = dailyIds && dailyIds.kind === 'practice' ? dailyIds.exerciseIds.map(getExercise).filter((e): e is Exercise => Boolean(e)) : null;

  /** Ronda nueva: primero ejercicios inéditos de Lichess; si no hay red, los del pool que aún no has visto. */
  const start = async () => {
    setLoading(true);
    const seen = new Set(Object.keys(progress.exercises));
    const fresh = await fetchLichessPuzzles({ count: SESSION_SIZE, rating, theme, exclude: seen });
    const filtered = (theme ? pool.filter((e) => e.themes.includes(theme)) : pool).filter((e) => !fresh.some((f) => f.id === e.id));
    const fill = pickAdaptive(filtered, rating, Math.max(0, SESSION_SIZE - fresh.length), seen);
    setSession([...fresh, ...fill]);
    setRetrying(false);
    setResults(null);
    setRound((r) => r + 1);
    setLoading(false);
  };

  /** Repetir ahora los ejercicios que fallaste en la ronda. */
  const retryMistakes = (failed: Exercise[]) => {
    setSession(failed);
    setRetrying(true);
    setResults(null);
    setRound((r) => r + 1);
  };

  const active = session ?? (ready && dailySet && !results ? dailySet : null);

  if (loading) return <Loader label="Buscando ejercicios nuevos…" />;

  if (results) {
    return (
      <SessionSummary
        results={results}
        onRetryMistakes={retryMistakes}
        primary={daily.fromDaily ? { label: 'Volver al plan de hoy', to: '/' } : { label: 'Otra ronda con ejercicios nuevos', onClick: start }}
        secondary={daily.fromDaily ? { label: 'Seguir practicando', onClick: start } : { label: 'Volver al inicio', to: '/' }}
      />
    );
  }

  if (active?.length) {
    return (
      <ExerciseSession
        key={round}
        exercises={active}
        context={retrying ? 'review' : daily.fromDaily && !session ? 'daily' : 'practice'}
        onComplete={(r) => {
          if (daily.fromDaily && !session) daily.complete();
          setSession(null);
          setRetrying(false);
          setResults(r);
        }}
      />
    );
  }

  if (!ready) return <Loader />;
  if (!pool.length) return <EmptyState title="Aún no hay ejercicios desbloqueados" action={<Button to="/mapa">Ir al índice</Button>} />;

  const grouped = THEME_GROUPS.map((g) => ({ ...g, items: themes.filter(([t]) => themeGroup(t) === g.id) })).filter((g) => g.items.length > 0);
  const selectedCount = theme ? (themes.find(([t]) => t === theme)?.[1] ?? 0) : pool.length;

  return (
    <div className="stack" style={{ gap: 'var(--space-3)' }}>
      <PageHeader compact icon="puzzle" title="Práctica" subtitle={`Siempre ejercicios nuevos, a tu nivel (rating ${rating}). Toca un tema para elegirlo.`} />
      <div className={styles.group} role="radiogroup" aria-label="Tema de práctica">
        <button type="button" role="radio" aria-checked={!theme} className={[styles.theme, styles.mix, !theme && styles.on].filter(Boolean).join(' ')} onClick={() => setTheme(null)}>
          <span>
            <span className={styles.themeName}>Mezcla de todos los temas</span>
            <span className={styles.themeSub}>{!theme ? 'Seleccionado' : 'Toca para elegir'}</span>
          </span>
          <Radio on={!theme} />
        </button>
        {grouped.map((g) => (
          <section key={g.id} className={styles.group} aria-label={g.label}>
            <header className={styles.groupHead}>
              <h2 className={styles.groupTitle}>{g.label}</h2>
              {g.description && <span className={styles.groupHint}>{g.description}</span>}
            </header>
            <div className={styles.grid}>
              {g.items.map(([t, n]) => {
                const m = progress.mastery[t];
                const ratio = m && m.total > 0 ? masteryRatio(m) : null;
                const attempted = m ? m.total : 0;
                const on = theme === t;
                return (
                  <button key={t} type="button" role="radio" aria-checked={on} className={[styles.theme, on && styles.on].filter(Boolean).join(' ')} onClick={() => setTheme(t)}>
                    <span className={styles.themeTop}>
                      <span className={styles.themeName}>{themeLabel(t)}</span>
                      <Radio on={on} />
                    </span>
                    <span className={styles.themeMeta}>
                      <span>{n} disponibles</span>
                      {ratio !== null && (
                        <span title={`Has intentado ${attempted} ejercicios con ${Math.round(ratio * 100)}% de aciertos`}>
                          {Math.round(ratio * 100)}% de {attempted}
                        </span>
                      )}
                    </span>
                    {ratio !== null && (
                      <span className={styles.mastery} aria-hidden>
                        <span style={{ width: `${Math.round(ratio * 100)}%` }} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <div className={styles.start}>
        <Button size="lg" block onClick={start} icon="play" disabled={selectedCount === 0}>
          Empezar {SESSION_SIZE} ejercicios{theme ? ` de ${themeLabel(theme).toLowerCase()}` : ''}
        </Button>
      </div>
    </div>
  );
}

/** Indicador de selección: círculo vacío o marcado. */
function Radio({ on }: { on: boolean }) {
  return <span className={[styles.radio, on && styles.radioOn].filter(Boolean).join(' ')}>{on && <Icon name="check" size="0.85em" />}</span>;
}
