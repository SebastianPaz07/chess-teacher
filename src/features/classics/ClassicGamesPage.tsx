import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BoardStepper, LineTrainer, type LineResult } from '@/components/chess';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, Button, Card, EmptyState, Tabs } from '@/components/ui';
import { BoardTip } from '@/components/ui/BoardTip';
import { allGames } from '@/content/registry';
import type { ClassicGame } from '@/content/schema';
import { useCompleteDailyTask } from '@/features/daily-plan/hooks/useDailyPlan';
import { celebrate } from '@/features/gamification/components/RewardsCenter';
import { useGameStore } from '@/store/gameStore';

/** Partidas históricas: se ven completas y se practican de memoria, moviendo las piezas. */
export function ClassicGamesPage() {
  const [params] = useSearchParams();
  const daily = useCompleteDailyTask();
  const [game, setGame] = useState<ClassicGame | null>(() => allGames.find((g) => g.id === params.get('game')) ?? null);
  const [phase, setPhase] = useState<'ver' | 'practicar'>('ver');
  /** Qué se mueve al practicar: las jugadas del campeón o la partida entera */
  const [moving, setMoving] = useState<'campeon' | 'ambos'>('campeon');
  /** Ya llegó al final de la partida: se le propone practicarla */
  const [seen, setSeen] = useState(false);
  const [result, setResult] = useState<LineResult | null>(null);
  const [round, setRound] = useState(0);
  const dispatch = useGameStore((s) => s.dispatch);

  if (!allGames.length) return <EmptyState title="Aún no hay partidas" />;

  const openGame = (g: ClassicGame | null) => {
    setGame(g);
    setPhase('ver');
    setSeen(false);
    setResult(null);
  };

  const practice = () => {
    setResult(null);
    setRound((x) => x + 1);
    setPhase('practicar');
    window.scrollTo(0, 0);
  };

  const watch = () => {
    setResult(null);
    setPhase('ver');
    window.scrollTo(0, 0);
  };

  /** Cambiar lo que se mueve empieza la práctica de cero */
  const chooseMoving = (value: 'campeon' | 'ambos') => {
    if (value === moving) return;
    setMoving(value);
    practice();
  };

  if (game) {
    const color = game.side === 'w' ? 'blancas' : 'negras';
    const orientation = game.side === 'w' ? 'white' : 'black';
    return (
      <div className="stack">
        <PageHeader
          icon="classic"
          title={`${game.white} – ${game.black}`}
          subtitle={`${game.event ?? ''} ${game.year}`}
          actions={
            <Button variant="secondary" onClick={() => openGame(null)}>
              ← Partidas
            </Button>
          }
        />
        <p>{game.description}</p>
        <Tabs
          value={phase}
          onChange={(v) => {
            // Tocar la pestaña activa no borra lo avanzado
            if (v !== phase) v === 'practicar' ? practice() : watch();
          }}
          items={[
            { value: 'ver', label: 'Ver partida', icon: 'play' },
            { value: 'practicar', label: 'Practicar', icon: 'target' },
          ]}
        />
        {phase === 'ver' ? (
          <div className="stack" style={{ maxWidth: 560 }}>
            <BoardStepper key={game.id} moves={game.moves} notes={game.notes} orientation={orientation} onEnd={() => setSeen(true)} playable />
            {seen ? (
              <Card tone="accent" icon="target" title="Ya viste la partida completa" subtitle="Ahora muévela tú desde la primera jugada para aprendértela de memoria.">
                <Button size="lg" block onClick={practice} icon="play">
                  Practicar la partida
                </Button>
              </Card>
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                Pulsa «Reproducir» o avanza jugada por jugada. Cuando quieras, pasa a «Practicar».
              </p>
            )}
            <BoardTip what="partida" />
          </div>
        ) : (
          <div className="stack" style={{ maxWidth: 560 }}>
            <Tabs
              size="sm"
              value={moving}
              onChange={chooseMoving}
              items={[
                { value: 'campeon', label: `Solo las ${color}` },
                { value: 'ambos', label: 'Los dos bandos' },
              ]}
            />
            <p className="muted" style={{ margin: 0 }}>
              Mueve las piezas de memoria. Si fallas, inténtalo otra vez; al segundo fallo una flecha te muestra la jugada.
            </p>
            <LineTrainer
              key={`${game.id}-${moving}-${round}`}
              moves={game.moves}
              side={moving === 'ambos' ? 'both' : game.side}
              orientation={orientation}
              notes={game.notes}
              feedbackFirst
              onFinish={(r) => {
                setResult(r);
                dispatch({ type: 'GUESS_GAME_FINISHED', gameId: game.id, correct: r.firstTry, total: r.total });
                if (daily.fromDaily) daily.complete();
                if (r.total && r.firstTry / r.total >= 0.6) celebrate('small');
              }}
            />
            {result ? (
              <Card tone="accent" icon="trophy" title={result.firstTry === result.total ? '¡Te la sabes de memoria!' : `${result.firstTry} de ${result.total} jugadas a la primera`}>
                <p className="muted">{result.firstTry === result.total ? 'Ni un fallo. Vuelve en unos días para no olvidarla.' : 'Repítela hasta sacarla entera sin fallos ni ayudas.'}</p>
                <BoardTip what="partida" />
                <div className="row">
                  {daily.fromDaily && <Button to={daily.continueTo}>{daily.continueLabel}</Button>}
                  <Button variant={daily.fromDaily ? 'secondary' : 'primary'} onClick={practice}>
                    Practicar otra vez
                  </Button>
                  <Button variant="ghost" onClick={watch}>
                    Volver a ver la partida
                  </Button>
                </div>
              </Card>
            ) : (
              <Button variant="ghost" onClick={practice}>
                Empezar de nuevo
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="stack">
      <PageHeader icon="classic" title="Partidas clásicas" subtitle="Mira la partida de principio a fin y practícala moviendo las piezas hasta aprendértela." />
      <div className="grid-auto">
        {allGames.map((g) => (
          <Card key={g.id} interactive onClick={() => openGame(g)} icon="piece-pawn" title={`${g.white} – ${g.black}`} subtitle={`${g.event ?? ''} ${g.year}`}>
            <p className="muted" style={{ fontSize: '0.9rem' }}>
              {g.description}
            </p>
            <Badge tone="primary">{g.side === 'w' ? 'Practicas con blancas' : 'Practicas con negras'}</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
