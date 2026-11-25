import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, Card, ProgressBar, Tabs } from '@/components/ui';
import { allOpenings } from '@/content/registry';
import { useProgressStore } from '@/store/progressStore';

export function OpeningsPage() {
  const [side, setSide] = useState<'w' | 'b'>('w');
  const progress = useProgressStore();
  const navigate = useNavigate();
  const list = allOpenings.filter((o) => o.side === side);

  return (
    <div className="stack">
      <PageHeader icon="books" title="Aperturas" subtitle="Tu repertorio, basado en las clases y libros disponibles. Mira la línea y luego entrénala de memoria." />
      <Tabs
        value={side}
        onChange={setSide}
        items={[
          { value: 'w', label: 'Con blancas', icon: 'piece-pawn-w' },
          { value: 'b', label: 'Con negras', icon: 'piece-pawn' },
        ]}
      />
      <div className="grid-auto">
        {list.map((o) => {
          const trained = o.lines.filter((_, i) => progress.openingLines[`${o.id}#${i}`]).length;
          return (
            <Card
              key={o.id}
              interactive
              onClick={() => navigate(`/aperturas/${o.id}`)}
              title={o.name}
              subtitle={o.eco}
              icon={o.side === 'w' ? 'piece-king-w' : 'piece-king'}
            >
              <p className="muted" style={{ fontSize: '0.9rem' }}>
                {o.description}
              </p>
              <div className="row" style={{ marginBottom: 8 }}>
                <Badge tone="primary">{o.lines.length} líneas</Badge>
              </div>
              <ProgressBar value={trained / o.lines.length} height={10} label="Entrenadas" showValue />
            </Card>
          );
        })}
      </div>
    </div>
  );
}
