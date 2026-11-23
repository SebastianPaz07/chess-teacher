import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, Card, EmptyState, Loader } from '@/components/ui';
import { getExercise, modules } from '@/content/registry';
import type { Exercise } from '@/content/schema';
import { useCompleteDailyTask } from '@/features/daily-plan/hooks/useDailyPlan';
import { usePuzzles } from '@/hooks/usePuzzles';
import { pickAdaptive } from '@/services/game/rating';
import { isModuleUnlocked, masteryRatio } from '@/services/scheduler/progression';
import { useGameStore } from '@/store/gameStore';
import { useProgressStore } from '@/store/progressStore';
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

  const start = () => {
    const filtered = theme ? pool.filter((e) => e.themes.includes(theme)) : pool;
    setSession(pickAdaptive(filtered, rating, SESSION_SIZE, new Set(Object.keys(progress.exercises))));
    setResults(null);
    setRound((r) => r + 1);
  };

  const active = session ?? (ready && dailySet && !results ? dailySet : null);

  if (results) {
    return (
      <SessionSummary
        results={results}
        primary={daily.fromDaily ? { label: 'Volver al plan de hoy', to: '/' } : { label: 'Otra ronda', onClick: start }}
        secondary={daily.fromDaily ? { label: 'Seguir practicando', onClick: start } : { label: 'Volver al inicio', to: '/' }}
      />
    );
  }

  if (active?.length) {
    return (
      <ExerciseSession
        key={round}
        exercises={active}
        context={daily.fromDaily && !session ? 'daily' : 'practice'}
        onComplete={(r) => {
          if (daily.fromDaily && !session) daily.complete();
          setSession(null);
          setResults(r);
        }}
      />
    );
  }

  if (!ready) return <Loader />;
  if (!pool.length) return <EmptyState title="Aún no hay ejercicios desbloqueados" action={<Button to="/mapa">Ir al mapa</Button>} />;

  return (
    <div className="stack">
      <PageHeader icon="puzzle" title="Práctica" subtitle={`Ejercicios adaptados a tu rating (${rating}). Elige un tema o mezcla todos.`} />
      <Card title="Elige un tema" subtitle="Tu maestría en cada tema se calcula con tus aciertos">
        <div className={styles.chips}>
          <button className={[styles.chip, !theme && styles.on].filter(Boolean).join(' ')} onClick={() => setTheme(null)}>
            Mezcla ({pool.length})
          </button>
          {themes.map(([t, n]) => {
            const m = progress.mastery[t];
            return (
              <button key={t} className={[styles.chip, theme === t && styles.on].filter(Boolean).join(' ')} onClick={() => setTheme(t)}>
                {t} ({n}){m && m.total > 0 ? ` · ${Math.round(masteryRatio(m) * 100)}%` : ''}
              </button>
            );
          })}
        </div>
      </Card>
      <Button size="lg" onClick={start} icon="play">
        Empezar {SESSION_SIZE} ejercicios
      </Button>
    </div>
  );
}
