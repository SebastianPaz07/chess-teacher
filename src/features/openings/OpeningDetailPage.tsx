import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { BoardStepper, LineTrainer, type LineResult } from '@/components/chess';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, Button, Card, EmptyState, Tabs } from '@/components/ui';
import { getOpening, resourcesByTags } from '@/content/registry';
import { useCompleteDailyTask } from '@/features/daily-plan/hooks/useDailyPlan';
import { ResourceList } from '@/features/library/components/ResourceViewer';
import { useGameStore } from '@/store/gameStore';
import { useProgressStore } from '@/store/progressStore';
import { useReviewStore } from '@/store/reviewStore';
import styles from './OpeningDetailPage.module.css';

export function OpeningDetailPage() {
  const { openingId = '' } = useParams();
  const [params] = useSearchParams();
  const opening = getOpening(openingId);
  const [lineIndex, setLineIndex] = useState(() => Number(params.get('line') ?? 0));
  const [mode, setMode] = useState<'ver' | 'entrenar'>(params.get('daily') ? 'entrenar' : 'ver');
  const [round, setRound] = useState(0);
  const [result, setResult] = useState<LineResult | null>(null);
  const openingLines = useProgressStore((s) => s.openingLines);
  const recordLine = useProgressStore((s) => s.recordOpeningLine);
  const addCard = useReviewStore((s) => s.addCard);
  const dispatch = useGameStore((s) => s.dispatch);
  const daily = useCompleteDailyTask();

  if (!opening) return <EmptyState title="Apertura no encontrada" action={<Button to="/aperturas">Ver aperturas</Button>} />;
  const line = opening.lines[lineIndex] ?? opening.lines[0];
  const key = `${opening.id}#${lineIndex}`;

  const onFinish = (r: LineResult) => {
    setResult(r);
    recordLine(key, r.mistakes);
    addCard('opening-line', key);
    dispatch({ type: 'OPENING_TRAINED', openingId: opening.id, lineIndex, mistakes: r.mistakes });
    daily.complete();
  };

  const restart = () => {
    setResult(null);
    setRound((x) => x + 1);
  };

  return (
    <div className="stack">
      <PageHeader
        icon={opening.side === 'w' ? 'piece-king-w' : 'piece-king'}
        title={opening.name}
        subtitle={opening.description}
        actions={<Badge tone="primary">{opening.side === 'w' ? 'Juegas con blancas' : 'Juegas con negras'}</Badge>}
      />
      <div className={styles.layout}>
        <div>
          <div className="row" style={{ marginBottom: 12 }}>
            <Tabs
              value={mode}
              onChange={(m) => {
                setMode(m);
                restart();
              }}
              items={[
                { value: 'ver', label: 'Ver línea', icon: 'eye' },
                { value: 'entrenar', label: 'Entrenar', icon: 'target' },
              ]}
            />
          </div>
          {mode === 'ver' ? (
            <BoardStepper key={`v-${lineIndex}`} moves={line.moves} notes={line.notes} orientation={opening.side === 'w' ? 'white' : 'black'} />
          ) : (
            <LineTrainer key={`t-${lineIndex}-${round}`} moves={line.moves} side={opening.side} notes={line.notes} onFinish={onFinish} />
          )}
          {result && mode === 'entrenar' && (
            <Card tone={result.mistakes === 0 ? 'success' : 'accent'} title={result.mistakes === 0 ? '¡Línea perfecta!' : `Línea completada con ${result.mistakes} errores`} icon={result.mistakes === 0 ? 'trophy' : 'check'} style={{ marginTop: 16 }}>
              <p className="muted">La línea se añadió a tu repaso espaciado.</p>
              <div className="row">
                <Button onClick={restart}>Repetir</Button>
                {daily.fromDaily && (
                  <Button variant="secondary" to="/">
                    Volver al plan de hoy
                  </Button>
                )}
              </div>
            </Card>
          )}
        </div>
        <div className="stack">
          <Card title="Líneas" icon="strategy">
            <div className={styles.lines}>
              {opening.lines.map((l, i) => (
                <button
                  key={i}
                  className={[styles.line, i === lineIndex && styles.active].filter(Boolean).join(' ')}
                  onClick={() => {
                    setLineIndex(i);
                    restart();
                  }}
                >
                  <span>{l.name}</span>
                  {openingLines[`${opening.id}#${i}`] && <Badge tone="success" icon="check">{openingLines[`${opening.id}#${i}`].times}</Badge>}
                </button>
              ))}
            </div>
          </Card>
          {opening.ideas.length > 0 && (
            <Card title="Ideas clave" icon="hint">
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {opening.ideas.map((idea, i) => (
                  <li key={i} style={{ marginBottom: 6 }}>
                    {idea}
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <ResourceList items={resourcesByTags(opening.resourceTags, 6)} />
        </div>
      </div>
    </div>
  );
}
