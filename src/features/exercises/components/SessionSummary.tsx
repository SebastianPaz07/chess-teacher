import { Icon } from '@/components/ui/Icon';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Badge, Button, Card } from '@/components/ui';
import type { Exercise } from '@/content/schema';
import { themeLabel } from '../themes';
import { celebrate } from '@/features/gamification/components/RewardsCenter';
import { useGameStore } from '@/store/gameStore';
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
  const dispatch = useGameStore((g) => g.dispatch);
  const flushed = useRef(false);
  const [ratingChange, setRatingChange] = useState<{ gain: number; loss: number; delta: number; rating: number } | null>(null);
  // El rating se aplica ahora, al final: suma lo ganado y resta lo perdido de golpe
  useEffect(() => {
    if (flushed.current) return;
    flushed.current = true;
    const r = dispatch({ type: 'RATING_FLUSH' }).find((x) => x.kind === 'rating');
    if (r && r.kind === 'rating') setRatingChange(r);
  }, [dispatch]);
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
          <strong style={{ fontSize: '1.5rem' }}>{failed.length}</strong>
          <div className="muted">A repasar</div>
        </Card>
      </div>
      {ratingChange && (
        <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.2 }}>
        <Card tone="primary" icon="chart" title="Tu puntaje en esta sesión">
          <p style={{ margin: 0 }}>
            <strong style={{ color: 'var(--color-success)' }}>+{ratingChange.gain}</strong> ganados
            {ratingChange.loss > 0 && (
              <>
                {' · '}
                <strong style={{ color: 'var(--color-danger)' }}>−{ratingChange.loss}</strong> perdidos
              </>
            )}
          </p>
          <p style={{ margin: 0 }}>
            Total: <strong>{ratingChange.delta >= 0 ? '+' : ''}{ratingChange.delta}</strong> → nuevo puntaje <strong>{ratingChange.rating}</strong>
          </p>
        </Card>
        </motion.div>
      )}
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
