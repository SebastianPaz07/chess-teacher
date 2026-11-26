import { Icon } from '@/components/ui/Icon';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, Card, ProgressBar, ProgressRing, StatPill } from '@/components/ui';
import { allLessons, getExercise, getOpening, modules } from '@/content/registry';
import { themeLabel } from '@/features/exercises/themes';
import { addDays, todayKey } from '@/lib/date';
import { useIsSignedIn } from '@/hooks/useIsSignedIn';
import { useGameSummary } from '@/features/gamification/hooks/useGameSummary';
import { moduleCompletion, moduleStars, weakTopics } from '@/services/scheduler/progression';
import { useGameStore } from '@/store/gameStore';
import { useProgressStore } from '@/store/progressStore';
import { useReviewStore } from '@/store/reviewStore';
import { ActivityCalendar } from './components/ActivityCalendar';
import styles from './ProgressPage.module.css';

const WEEKS = 12;
const MILESTONES = [5, 10, 25, 50, 100, 250, 500, 1000];

export function ProgressPage() {
  const signedIn = useIsSignedIn();
  const g = useGameSummary();
  const stats = useGameStore((s) => s.stats);
  const history = useGameStore((s) => s.history);
  const progress = useProgressStore();
  const cards = useReviewStore((s) => s.cards);
  const weak = weakTopics(progress);
  const activityLog = useGameStore((s) => s.activityLog);

  const learned = allLessons
    .filter((l) => progress.lessons[l.id])
    .map((l) => ({ lesson: l, rec: progress.lessons[l.id] }))
    .sort((a, b) => b.rec.completedAt.localeCompare(a.rec.completedAt));

  const openingsTrained = Object.entries(
    Object.keys(progress.openingLines).reduce<Record<string, number>>((acc, k) => {
      const id = k.split('#')[0];
      acc[id] = (acc[id] ?? 0) + 1;
      return acc;
    }, {}),
  );

  // Ejercicios DISTINTOS resueltos por tema (no intentos): evita porcentajes engañosos
  const themeCount: Record<string, number> = {};
  for (const [id, rec] of Object.entries(progress.exercises)) {
    if (rec.solved <= 0) continue;
    for (const t of getExercise(id)?.themes ?? []) themeCount[t] = (themeCount[t] ?? 0) + 1;
  }
  const themes = Object.entries(themeCount).sort((a, b) => b[1] - a[1]);

  const today = todayKey();
  const recent = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(today, i - 6);
    const a = activityLog?.[day];
    return { day, puzzles: a?.puzzles ?? 0, lessons: a?.lessons ?? 0, reviews: a?.reviews ?? 0, minutes: Math.round((a?.seconds ?? 0) / 60), empty: !a || (!a.puzzles && !a.lessons && !a.reviews && !a.seconds) };
  }).reverse();

  const accuracy = stats.puzzlesAttempted ? Math.round((stats.puzzlesSolved / stats.puzzlesAttempted) * 100) : 0;

  if (!signedIn) {
    return (
      <div className="stack">
        <PageHeader compact icon="progress" title="Tu progreso" />
        <Card tone="primary" icon="shield" title="Regístrate para ver tu progreso">
          <div className="stack">
            <p style={{ margin: 0 }}>Crea tu cuenta para guardar tu actividad, tus rachas y tu avance por módulos, y verlos aquí.</p>
            <Button to="/entrar?next=%2Fprogreso" size="lg" block>
              Registrarme o entrar
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="stack">
      <PageHeader compact icon="progress" title="Tu progreso" subtitle="Todo se guarda en este navegador (puedes exportarlo en Ajustes)." />

      <div className={styles.kpis}>
        <StatPill icon={g.rank.icon} value={`Nivel ${g.level}`} label={g.rank.name} />
        <StatPill icon="diamond" value={g.xp} label="XP" color="var(--color-xp)" />
        <StatPill icon="progress" value={g.rating} label="rating" />
        <StatPill icon="fire" value={g.streak} label={`racha · mejor ${g.streakBest}`} color="var(--color-streak)" />
        <StatPill icon="puzzle" value={stats.puzzlesSolved} label={`resueltos · ${accuracy}%`} />
        <StatPill icon="book-open" value={stats.lessonsCompleted} label="lecciones" />
        <StatPill icon="review" value={Object.keys(cards).length} label="en repaso" />
      </div>

      <Card title="Actividad" icon="calendar" subtitle={`Últimas ${WEEKS} semanas · cuanto más intenso, más XP ese día`}>
        <ActivityCalendar history={history} weeks={WEEKS} />
      </Card>

      <div className={styles.cols}>
        <Card title="Módulos" icon="map">
          <div className="stack">
            {modules.map((m) => (
              <div key={m.id} className={styles.moduleRow}>
                <ProgressRing value={moduleCompletion(m, progress)} size={52} stroke={6} color={m.color}>
                  <Icon name={m.icon} />
                </ProgressRing>
                <div style={{ flex: 1 }}>
                  <strong>{m.title}</strong>
                  <div className="muted" style={{ fontSize: '0.85rem' }}>
                    {moduleStars(m, progress)}/{m.lessons.length * 3} · {m.lessons.filter((l) => progress.lessons[l.id]).length}/{m.lessons.length} lecciones
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Lo que has aprendido" icon="book-open" subtitle={`${learned.length} de ${allLessons.length} lecciones · ${openingsTrained.length} aperturas practicadas`}>
          <div className="stack">
            {learned.length === 0 && <p className="muted">Aún no has completado lecciones. Empieza por tu sesión de hoy.</p>}
            {learned.slice(0, 6).map(({ lesson, rec }) => (
              <div key={lesson.id} className={styles.moduleRow}>
                <div style={{ flex: 1 }}>
                  <strong>{lesson.title}</strong>
                  <div className="muted" style={{ fontSize: '0.85rem' }}>
                    {rec.skipped ? 'Marcada como dominada' : `${'★'.repeat(rec.stars)}${'☆'.repeat(3 - rec.stars)}`} · {rec.completedAt}
                  </div>
                </div>
              </div>
            ))}
            {learned.length > 6 && <p className="muted">y {learned.length - 6} lecciones más…</p>}
            {openingsTrained.length > 0 && (
              <p className="muted" style={{ margin: 0 }}>
                Aperturas: {openingsTrained.map(([id, n]) => `${getOpening(id)?.name ?? id} (${n} ${n === 1 ? 'línea' : 'líneas'})`).join(' · ')}
              </p>
            )}
          </div>
        </Card>
      </div>

      <Card title="Ejercicios resueltos por tema" icon="target" subtitle="Cuántos ejercicios distintos has resuelto de cada tema, con el siguiente hito por alcanzar">
        <div className="stack">
          {themes.length === 0 && <p className="muted">Aún no hay datos: resuelve ejercicios y verás aquí tu avance.</p>}
          {themes.slice(0, 10).map(([theme, n]) => {
            const goal = MILESTONES.find((m) => m > n) ?? n;
            return <ProgressBar key={theme} value={goal ? n / goal : 1} label={`${themeLabel(theme)} · ${n} resueltos · siguiente hito: ${goal}`} height={10} color="var(--color-primary)" />;
          })}
          {weak.length > 0 && <p className="muted" style={{ margin: 0 }}>Te cuesta más: {weak.slice(0, 3).map((t) => t.replace(/-/g, ' ')).join(', ')}. Los verás repetidos en tu plan.</p>}
        </div>
      </Card>

      <Card title="Últimos 7 días" icon="calendar" subtitle="Lo que hiciste cada día">
        <div className="stack">
          {recent.map((d) => (
            <div key={d.day} className="muted" style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span>{d.day}</span>
              <span>{d.empty ? 'Sin actividad' : `${d.puzzles} ejercicios · ${d.lessons} lecciones · ${d.reviews} repasos · ${d.minutes} min`}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
