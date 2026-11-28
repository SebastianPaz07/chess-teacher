import { Icon } from '@/components/ui/Icon';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, Card, ProgressBar, ProgressRing, StatPill } from '@/components/ui';
import { allLessons, getExercise, getOpening, modules } from '@/content/registry';
import { themeLabel } from '@/features/exercises/themes';
import { addDays, todayKey } from '@/lib/date';
import { useIsSignedIn } from '@/hooks/useIsSignedIn';
import { useExercisesReady } from '@/hooks/usePuzzles';
import { useGameSummary } from '@/features/gamification/hooks/useGameSummary';
import { moduleCompletion, moduleStars, weakTopics } from '@/services/scheduler/progression';
import { useGameStore } from '@/store/gameStore';
import { useProgressStore } from '@/store/progressStore';
import { useReviewStore } from '@/store/reviewStore';
import { ActivityCalendar } from './components/ActivityCalendar';
import styles from './ProgressPage.module.css';

const WEEKS = 12;
const MILESTONES = [5, 10, 25, 50, 100, 250, 500, 1000];

const toDate = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};
/** «Lunes», «Martes»… */
const weekday = (key: string) => {
  const name = new Intl.DateTimeFormat('es', { weekday: 'long' }).format(toDate(key));
  return name.charAt(0).toUpperCase() + name.slice(1);
};
const shortDate = (key: string) => new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' }).format(toDate(key));
const studyTime = (seconds: number) => {
  if (seconds > 0 && seconds < 60) return 'Menos de 1 min';
  const min = Math.round(seconds / 60);
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`;
};
const count = (n: number | undefined, one: string, many: string) => (n ? `${n} ${n === 1 ? one : many}` : '');

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
  const solvedIds = Object.entries(progress.exercises).filter(([, rec]) => rec.solved > 0).map(([id]) => id);
  // Al terminar de cargar se vuelve a pintar con sus temas
  useExercisesReady(signedIn ? solvedIds : []);
  for (const id of solvedIds) {
    for (const t of getExercise(id)?.themes ?? []) themeCount[t] = (themeCount[t] ?? 0) + 1;
  }
  const themes = Object.entries(themeCount).sort((a, b) => b[1] - a[1]);

  const today = todayKey();
  const recent = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(today, i - 6);
    const a = activityLog?.[day];
    const seconds = a?.seconds ?? 0;
    // Solo lo que se hizo: «3 ejercicios · 1 lección»
    const done = [count(a?.puzzles, 'ejercicio', 'ejercicios'), count(a?.lessons, 'lección', 'lecciones'), count(a?.reviews, 'repaso', 'repasos')].filter(Boolean).join(' · ');
    return { day, name: i === 6 ? 'Hoy' : i === 5 ? 'Ayer' : weekday(day), date: shortDate(day), seconds, done };
  }).reverse();
  const weekSeconds = recent.reduce((sum, d) => sum + d.seconds, 0);
  const topSeconds = Math.max(1, ...recent.map((d) => d.seconds));

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

      <Card title="Últimos 7 días" icon="calendar" subtitle={weekSeconds > 0 ? `Tiempo estudiado en total: ${studyTime(weekSeconds)}` : 'Aún no registras tiempo de estudio'}>
        <ul className={styles.recent}>
          {recent.map((d) => {
            const empty = !d.seconds && !d.done;
            return (
              <li key={d.day} className={[styles.recentDay, empty && styles.recentEmpty].filter(Boolean).join(' ')}>
                <span className={styles.recentName}>
                  <strong>{d.name}</strong>
                  <small>{d.date}</small>
                </span>
                <span className={styles.recentTime}>{empty ? 'Sin actividad' : studyTime(d.seconds)}</span>
                <span className={styles.recentBar} aria-hidden>
                  <span style={{ width: `${Math.round((d.seconds / topSeconds) * 100)}%` }} />
                </span>
                {d.done && <span className={styles.recentDone}>{d.done}</span>}
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
