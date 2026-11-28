import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { BoardStepper, LineTrainer, type LineResult } from '@/components/chess';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, Button, Card, EmptyState, Tabs } from '@/components/ui';
import { BoardTip } from '@/components/ui/BoardTip';
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
  const [mode, setMode] = useState<'ver' | 'entrenar'>('ver');
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
  const trainedCount = opening.lines.filter((_, i) => openingLines[`${opening.id}#${i}`]).length;
  // Líneas agrupadas por variante, conservando su índice (es la clave del progreso)
  const groups = new Map<string, { name: string; index: number }[]>();
  opening.lines.forEach((l, index) => {
    const g = l.group ?? 'Líneas';
    groups.set(g, [...(groups.get(g) ?? []), { name: l.name, index }]);
  });
  const order = [...groups.values()].flat().map((x) => x.index);
  const position = order.indexOf(lineIndex);
  const goTo = (i: number) => {
    setLineIndex(i);
    restart();
  };

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
        compact
        icon={opening.icon}
        title={opening.name}
        subtitle={opening.description}
        actions={<Badge tone="primary">{opening.side === 'w' ? 'Juegas con blancas' : 'Juegas con negras'}</Badge>}
      />
      <div className={styles.layout}>
        <div>
          <div className="row" style={{ marginBottom: 8 }}>
            <Tabs
              size="sm"
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
          <div className={styles.current}>
            <Button size="sm" variant="ghost" icon="prev" onClick={() => goTo(order[position - 1])} disabled={position <= 0} aria-label="Línea anterior" />
            <p>
              <span className="eyebrow">
                {line.group ?? 'Líneas'} · línea {position + 1} de {order.length}
              </span>
              <strong>{line.name}</strong>
            </p>
            <Button size="sm" variant="ghost" icon="next" onClick={() => goTo(order[position + 1])} disabled={position >= order.length - 1} aria-label="Línea siguiente" />
          </div>
          {mode === 'ver' && daily.fromDaily && (
            <Card tone="primary" icon="book-open" title="Paso 1: estudia la línea" style={{ marginBottom: 12 }}>
              <p className="muted" style={{ margin: 0 }}>
                Avanza jugada por jugada y lee las notas: lo importante es entender la idea, no memorizar. Cuando la tengas clara, pásala a «Entrenar».
              </p>
              <Button size="sm" onClick={() => { setMode('entrenar'); restart(); }} style={{ marginTop: 8 }}>
                Ya la estudié: entrenar
              </Button>
            </Card>
          )}
          {mode === 'ver' ? (
            <>
              <BoardStepper key={`v-${lineIndex}`} moves={line.moves} notes={line.notes} orientation={opening.side === 'w' ? 'white' : 'black'} />
              <BoardTip what="línea" />
            </>
          ) : (
            <>
              <LineTrainer key={`t-${lineIndex}-${round}`} moves={line.moves} side={opening.side} notes={line.notes} onFinish={onFinish} />
              {!result && <BoardTip what="línea" />}
            </>
          )}
          {result && mode === 'entrenar' && (
            <Card tone={result.mistakes === 0 ? 'success' : 'accent'} title={result.mistakes === 0 ? '¡Línea perfecta!' : `Línea completada con ${result.mistakes} errores`} icon={result.mistakes === 0 ? 'trophy' : 'check'} style={{ marginTop: 16 }}>
              <p className="muted">La línea se añadió a tu repaso espaciado.</p>
              <BoardTip what="línea" compact />
              <div className="row">
                <Button onClick={restart}>Repetir</Button>
                {daily.fromDaily && (
                  <Button variant="secondary" to={daily.continueTo}>
                    {daily.continueLabel}
                  </Button>
                )}
              </div>
            </Card>
          )}
        </div>
        <div className="stack">
          <Card title="Variantes y líneas" icon="strategy" subtitle={`${opening.lines.length} líneas · ${trainedCount} entrenadas`}>
            {[...groups].map(([group, items]) => (
              <details key={group} className={styles.group} open={items.some((x) => x.index === lineIndex) || groups.size <= 3}>
                <summary>
                  <span>{group}</span>
                  <small className="num">
                    {items.filter((x) => openingLines[`${opening.id}#${x.index}`]).length}/{items.length}
                  </small>
                </summary>
                <div className={styles.lines}>
                  {items.map(({ name, index }) => {
                    const rec = openingLines[`${opening.id}#${index}`];
                    return (
                      <button key={index} type="button" aria-current={index === lineIndex} className={[styles.line, index === lineIndex && styles.active].filter(Boolean).join(' ')} onClick={() => goTo(index)}>
                        <span>{name}</span>
                        {rec && (
                          <Badge tone="success" icon="check">
                            {rec.times}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </details>
            ))}
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
