import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LineTrainer, type LineResult } from '@/components/chess';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, Button, Card, EmptyState } from '@/components/ui';
import { allGames } from '@/content/registry';
import type { ClassicGame } from '@/content/schema';
import { useCompleteDailyTask } from '@/features/daily-plan/hooks/useDailyPlan';
import { celebrate } from '@/features/gamification/components/RewardsCenter';
import { useGameStore } from '@/store/gameStore';

/** "Adivina la jugada": juega como un campeón en partidas históricas. */
export function ClassicGamesPage() {
  const [params] = useSearchParams();
  const daily = useCompleteDailyTask();
  const [game, setGame] = useState<ClassicGame | null>(() => allGames.find((g) => g.id === params.get('game')) ?? null);
  const [result, setResult] = useState<LineResult | null>(null);
  const [round, setRound] = useState(0);
  const dispatch = useGameStore((s) => s.dispatch);

  if (!allGames.length) return <EmptyState title="Aún no hay partidas" />;

  if (game) {
    return (
      <div className="stack">
        <PageHeader
          icon="classic"
          title={`${game.white} – ${game.black}`}
          subtitle={`${game.event ?? ''} ${game.year}`}
          actions={
            <Button variant="secondary" onClick={() => { setGame(null); setResult(null); }}>
              ← Partidas
            </Button>
          }
        />
        <p>{game.description}</p>
        <div style={{ maxWidth: 560 }}>
          <LineTrainer
            key={`${game.id}-${round}`}
            moves={game.moves}
            side={game.side}
            startPly={game.startPly}
            notes={game.notes}
            mode="guess"
            onFinish={(r) => {
              setResult(r);
              dispatch({ type: 'GUESS_GAME_FINISHED', gameId: game.id, correct: r.correct, total: r.total });
              if (daily.fromDaily) daily.complete();
              if (r.total && r.correct / r.total >= 0.6) celebrate('small');
            }}
          />
        </div>
        {result && (
          <Card tone="accent" icon="trophy" title={`Adivinaste ${result.correct} de ${result.total} jugadas`}>
            <p className="muted">Cada acierto vale XP. ¡Los campeones también fallan la primera vez!</p>
            <div className="row">
              {daily.fromDaily && <Button to="/">Volver al plan de hoy</Button>}
              <Button variant={daily.fromDaily ? 'secondary' : 'primary'} onClick={() => { setResult(null); setRound((x) => x + 1); }}>Jugar otra vez</Button>
            </div>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="stack">
      <PageHeader icon="classic" title="Partidas clásicas" subtitle="Adivina la jugada del campeón. Las primeras jugadas se reproducen solas; después te toca a ti." />
      <div className="grid-auto">
        {allGames.map((g) => (
          <Card key={g.id} interactive onClick={() => setGame(g)} icon="piece-pawn" title={`${g.white} – ${g.black}`} subtitle={`${g.event ?? ''} ${g.year}`}>
            <p className="muted" style={{ fontSize: '0.9rem' }}>
              {g.description}
            </p>
            <Badge tone="primary">{g.side === 'w' ? 'Juegas con blancas' : 'Juegas con negras'}</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
