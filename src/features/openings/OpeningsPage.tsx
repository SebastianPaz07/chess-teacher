import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { PieceScene } from '@/components/illustrations/PieceScene';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, Card, ProgressBar, Tabs } from '@/components/ui';
import { allOpenings } from '@/content/registry';
import { useProgressStore } from '@/store/progressStore';

export function OpeningsPage() {
  const [side, setSide] = useState<'w' | 'b'>('w');
  const progress = useProgressStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  // Con texto, busca en ambos colores; sin texto, filtra por el color elegido
  const list = allOpenings.filter((o) => (q ? `${o.name} ${o.eco ?? ''}`.toLowerCase().includes(q) : o.side === side));

  return (
    <div className="stack">
      <PageHeader compact icon="books" title="Aperturas" subtitle="Tu repertorio, basado en nuestras clases y libros. Elige una variante, mira la línea y luego entrénala de memoria." />
      <input type="search" inputMode="search" enterKeyHint="search" placeholder="Buscar apertura por nombre…" aria-label="Buscar apertura" value={query} onChange={(e) => setQuery(e.target.value)} style={{ width: '100%', minHeight: 48 }} />
      {!q && (
      <Tabs
        size="sm"
        value={side}
        onChange={setSide}
        items={[
          { value: 'w', label: 'Con blancas', icon: 'piece-pawn-w' },
          { value: 'b', label: 'Con negras', icon: 'piece-pawn' },
        ]}
      />
      )}
      {list.length === 0 && <p className="muted">Ninguna apertura coincide con «{query}».</p>}
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
              icon={o.icon}
            >
              <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                <PieceScene size={72} scene={o.side === 'w' ? { b: '...../ppppp/...../..P../RNBQK', a: ['1,4>2,2'] } : { b: 'rnbqk/ppppp/...../..P../.....', a: ['1,0>2,2'] }} />
                <p className="muted" style={{ fontSize: '0.9rem', margin: 0 }}>
                  {o.description}
                </p>
              </div>
              <div className="row" style={{ marginBottom: 8 }}>
                <Badge tone="primary">{o.lines.length} líneas</Badge>
                <Badge tone="neutral">{new Set(o.lines.map((l) => l.group)).size} variantes</Badge>
              </div>
              <ProgressBar value={trained / o.lines.length} height={10} label="Entrenadas" showValue />
            </Card>
          );
        })}
      </div>
    </div>
  );
}
