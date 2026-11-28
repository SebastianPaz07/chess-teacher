import { useEffect, useMemo, useState } from 'react';
import { LineTrainer } from '@/components/chess';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, Button, Card, EmptyState, Loader } from '@/components/ui';
import { getExercise, getOpening } from '@/content/registry';
import type { Exercise } from '@/content/schema';
import { useCompleteDailyTask } from '@/features/daily-plan/hooks/useDailyPlan';
import { useExercisesReady } from '@/hooks/usePuzzles';
import { ExerciseSession, type SessionResult } from '@/features/exercises/components/ExerciseSession';
import { SessionSummary } from '@/features/exercises/components/SessionSummary';
import { qualityFromResult, type ReviewCard } from '@/services/scheduler/sm2';
import { useGameStore } from '@/store/gameStore';
import { useProgressStore } from '@/store/progressStore';
import { useReviewStore } from '@/store/reviewStore';

/** Repaso espaciado (SM-2): ejercicios y líneas de apertura vencidas. */
export function ReviewPage() {
  const cards = useReviewStore((s) => s.cards);
  const dueCards = useReviewStore((s) => s.dueCards);
  const grade = useReviewStore((s) => s.grade);
  const dispatch = useGameStore((s) => s.dispatch);
  const recordLine = useProgressStore((s) => s.recordOpeningLine);
  const daily = useCompleteDailyTask();
  const [phase, setPhase] = useState<'auto' | 'intro' | 'exercises' | 'openings' | 'done'>(daily.fromDaily ? 'auto' : 'intro');
  const [results, setResults] = useState<SessionResult[]>([]);
  const [lineIdx, setLineIdx] = useState(0);

  // Congelamos la lista al entrar para que no cambie mientras repasas
  const [due] = useState<ReviewCard[]>(() => dueCards());
  const ready = useExercisesReady(due.filter((c) => c.kind === 'exercise').map((c) => c.ref));
  const exerciseCards = useMemo(() => due.filter((c) => c.kind === 'exercise' && getExercise(c.ref)), [due, ready]);
  const exercises = exerciseCards.map((c) => getExercise(c.ref)).filter((e): e is Exercise => Boolean(e));
  const lineCards = due.filter((c) => {
    if (c.kind !== 'opening-line') return false;
    const [oid, li] = c.ref.split('#');
    return Boolean(getOpening(oid)?.lines[Number(li)]);
  });
  const total = Object.keys(cards).length;
  const upcoming = Object.values(cards).filter((c) => !due.includes(c)).sort((a, b) => a.due.localeCompare(b.due))[0];

  // Desde el plan del día no hay pantalla intermedia: se empieza directo
  const view = phase === 'auto' ? (exercises.length ? 'exercises' : lineCards.length ? 'openings' : 'intro') : phase;
  const nothingDue = due.length === 0;
  useEffect(() => {
    // Sin tarjetas vencidas el paso queda cumplido (si no, el plan se quedaría atascado)
    if (daily.fromDaily && ready && nothingDue) daily.complete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, nothingDue]);

  if (!ready) return <Loader />;

  const finishAll = () => {
    daily.complete();
    setPhase('done');
  };

  const afterExercises = (r: SessionResult[]) => {
    setResults(r);
    if (lineCards.length) setPhase('openings');
    else finishAll();
  };

  if (view === 'done') {
    return <SessionSummary title="¡Repaso completado!" results={results} primary={{ label: daily.fromDaily ? daily.continueLabel : 'Volver al inicio', to: daily.fromDaily ? daily.continueTo : '/' }} />;
  }

  if (view === 'exercises' && exercises.length) {
    return (
      <ExerciseSession
        exercises={exercises}
        context="review"
        onEach={(ex, r) => {
          grade(`exercise:${ex.id}`, qualityFromResult(r.success, r.mistakes, r.hintsUsed));
          dispatch({ type: 'REVIEW_DONE', cardId: `exercise:${ex.id}`, success: r.success });
        }}
        onComplete={afterExercises}
      />
    );
  }

  if (view === 'openings' && lineCards[lineIdx]) {
    const card = lineCards[lineIdx];
    const [openingId, li] = card.ref.split('#');
    const opening = getOpening(openingId)!;
    const line = opening.lines[Number(li)];
    return (
      <div className="stack">
        <PageHeader icon="books" title={`Repaso: ${opening.name}`} subtitle={line.name} actions={<Badge>{lineIdx + 1}/{lineCards.length}</Badge>} />
        <div style={{ maxWidth: 560 }}>
          <LineTrainer
            key={card.id}
            moves={line.moves}
            side={opening.side}
            notes={line.notes}
            onFinish={(r) => {
              grade(card.id, r.mistakes === 0 ? 5 : r.mistakes <= 2 ? 3 : 1);
              recordLine(card.ref, r.mistakes);
              dispatch({ type: 'REVIEW_DONE', cardId: card.id, success: r.mistakes <= 2 });
              window.setTimeout(() => (lineIdx + 1 < lineCards.length ? setLineIdx(lineIdx + 1) : finishAll()), 1200);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <PageHeader icon="review" title="Repaso" subtitle="Lo que aprendes vuelve en el momento justo antes de olvidarlo (repetición espaciada)." />
      {due.length === 0 ? (
        <EmptyState
          icon="strategy"
          title="¡Nada pendiente por hoy!"
          description={total ? `Tienes ${total} tarjetas en tu mazo. La próxima vuelve el ${upcoming?.due ?? '—'}.` : 'Completa lecciones y ejercicios para llenar tu mazo de repaso.'}
          action={daily.fromDaily ? <Button to={daily.continueTo}>{daily.continueLabel}</Button> : <Button to="/practica/ejercicios">Practicar ejercicios</Button>}
        />
      ) : (
        <Card tone="primary" icon="brain" title={`${due.length} tarjetas para repasar`} subtitle={`${exercises.length} ejercicios · ${lineCards.length} líneas de apertura`}>
          <Button size="lg" onClick={() => setPhase(exercises.length ? 'exercises' : 'openings')}>
            Empezar repaso
          </Button>
        </Card>
      )}
    </div>
  );
}
