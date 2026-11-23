import { Icon } from '@/components/ui/Icon';
import { useEffect } from 'react';
import { Button, Card } from '@/components/ui';
import { celebrate } from '@/features/gamification/components/RewardsCenter';
import type { SessionResult } from './ExerciseSession';

interface Props {
  results: SessionResult[];
  title?: string;
  primary: { label: string; onClick?: () => void; to?: string };
  secondary?: { label: string; onClick?: () => void; to?: string };
}

export function SessionSummary({ results, title = '¡Sesión terminada!', primary, secondary }: Props) {
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
