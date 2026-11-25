import { Icon } from '@/components/ui/Icon';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, Card, ProgressBar, ProgressRing, StatPill } from '@/components/ui';
import { modules } from '@/content/registry';
import { useIsSignedIn } from '@/hooks/useIsSignedIn';
import { useGameSummary } from '@/features/gamification/hooks/useGameSummary';
import { masteryRatio, moduleCompletion, moduleStars, weakTopics } from '@/services/scheduler/progression';
import { useGameStore } from '@/store/gameStore';
import { useProgressStore } from '@/store/progressStore';
import { useReviewStore } from '@/store/reviewStore';
import { ActivityCalendar } from './components/ActivityCalendar';
import styles from './ProgressPage.module.css';

const WEEKS = 12;

export function ProgressPage() {
  const signedIn = useIsSignedIn();
  const g = useGameSummary();
  const stats = useGameStore((s) => s.stats);
  const history = useGameStore((s) => s.history);
  const progress = useProgressStore();
  const cards = useReviewStore((s) => s.cards);
  const weak = weakTopics(progress);
  const mastery = Object.entries(progress.mastery).sort((a, b) => b[1].total - a[1].total);

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
        <Card title="Maestría por tema" icon="target" subtitle={weak.length ? `Para reforzar: ${weak.slice(0, 3).join(', ')}` : 'Resuelve ejercicios para medir tus temas'}>
          <div className="stack">
            {mastery.length === 0 && <p className="muted">Aún no hay datos.</p>}
            {mastery.map(([tag, r]) => {
              const v = masteryRatio(r);
              return (
                <ProgressBar
                  key={tag}
                  value={v}
                  label={`${tag} (${r.correct}/${r.total})`}
                  showValue
                  height={10}
                  color={v >= 0.8 ? 'var(--color-success)' : v >= 0.6 ? 'var(--color-accent)' : 'var(--color-danger)'}
                />
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
