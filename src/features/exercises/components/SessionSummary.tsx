import { Icon } from '@/components/ui/Icon';
import { useEffect } from 'react';
import { Badge, Button, Card } from '@/components/ui';
import type { Exercise } from '@/content/schema';
import { themeLabel } from '../themes';
import { celebrate } from '@/features/gamification/components/RewardsCenter';
import type { SessionResult } from './ExerciseSession';

interface Props {
  results: SessionResult[];
  title?: string;
  primary: { label: string; onClick?: () => void; to?: string };
  secondary?: { label: string; onClick?: () => void; to?: string };
  /** Repetir ahora los ejercicios fallados */
  onRetryMistakes?: (failed: Exercise[]) => void;
}

export function SessionSummary({ results, title = '¡Sesión terminada!', primary, secondary, onRetryMistakes }: Props) {
  const failed = results.filter((r) => !r.result.success || r.result.mistakes > 0);
  const solved = results.filter((r) => r.result.success).length;
  const clean = results.filter((r) => r.result.success && r.result.mistakes === 0).length;
  useEffect(() => {
    if (results.length && solved / results.length >= 0.6) celebrate('small');
  }, [results.length, solved]);

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }} className="stack">
      <div style={{ fontSize: '4rem', display: 'flex', justifyContent: 'center' }}><Icon name={solved === results.length ? 'trophy' : solved > 0 ? 'strength' : 'books'} weight="light" /></div>
      <h1>{title}</h1>
      <div className="grid-auto" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <Card tone="success">
          <strong style={{ fontSize: '1.5rem' }}>
            {solved}/{results.length}
          </strong>
          <div className="muted">Resueltos</div>
        </Card>
        <Card tone="accent">
          <strong style={{ fontSize: '1.5rem' }}>{clean}</strong>
          <div className="muted">A la primera</div>
        </Card>
        <Card tone="primary">
          <strong style={{ fontSize: '1.5rem' }}>{results.length - solved}</strong>
          <div className="muted">A repasar</div>
        </Card>
      </div>
      {failed.length > 0 && (
        <Card tone="danger" icon="review" title={`Para repasar (${failed.length})`} subtitle="Estos ejercicios los fallaste o los resolviste con errores. También volverán en tu repaso de mañana.">
          <ul className="stack" style={{ listStyle: 'none', margin: 0, padding: 0, textAlign: 'left', gap: 'var(--space-2)' }}>
            {failed.map(({ exercise: ex, result }) => (
              <li key={ex.id} className="row" style={{ justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-2)' }}>
                <span style={{ minWidth: 0 }}>
                  <strong>{ex.title ?? themeLabel(ex.themes[0])}</strong>
                  <br />
                  <span className="muted" style={{ fontSize: '0.82rem' }}>
                    {ex.themes.slice(0, 2).map(themeLabel).join(' · ')} · rating {ex.rating}
                  </span>
                </span>
                <Badge tone={result.success ? 'accent' : 'danger'}>{result.success ? 'Con errores' : 'Fallado'}</Badge>
              </li>
            ))}
          </ul>
          {onRetryMistakes && (
            <Button block variant="secondary" icon="review" onClick={() => onRetryMistakes(failed.map((f) => f.exercise))} style={{ marginTop: 'var(--space-3)' }}>
              Repasarlos ahora
            </Button>
          )}
        </Card>
      )}
      <Button size="lg" block onClick={primary.onClick} to={primary.to}>
        {primary.label}
      </Button>
      {secondary && (
        <Button variant="ghost" onClick={secondary.onClick} to={secondary.to}>
          {secondary.label}
        </Button>
      )}
    </div>
  );
}
