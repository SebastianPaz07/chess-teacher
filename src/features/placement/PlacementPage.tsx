import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PuzzleBoard } from '@/components/chess';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, Button, Card, ProgressBar } from '@/components/ui';
import { allExercises } from '@/content/registry';
import type { Exercise, Level } from '@/content/schema';
import { usePuzzles } from '@/hooks/usePuzzles';
import { celebrate } from '@/features/gamification/components/RewardsCenter';
import {
  estimatePlacement,
  nextTarget,
  pickNearest,
  PLACEMENT_LENGTH,
  PLACEMENT_START,
  ratingFromElo,
  type EloSource,
  type PlacementAnswer,
} from '@/services/scheduler/placement';
import { useGameStore } from '@/store/gameStore';
import { useProgressStore } from '@/store/progressStore';

const LEVEL_TEXT: Record<Level, string> = {
  principiante: 'Empezamos por los fundamentos y la táctica básica.',
  intermedio: 'Saltamos lo básico: el plan se centra en estrategia, aperturas y cálculo.',
  avanzado: 'Plan de alto nivel: cálculo intenso, repertorio, partidas clásicas y finales.',
};

export function PlacementPage() {
  const { puzzles, ready } = usePuzzles();
  const pool = puzzles.length ? puzzles : allExercises;
  const [mode, setMode] = useState<'intro' | 'test' | 'done'>('intro');
  const [answers, setAnswers] = useState<PlacementAnswer[]>([]);
  const [target, setTarget] = useState(PLACEMENT_START);
  const used = useRef(new Set<string>());
  const [current, setCurrent] = useState<Exercise | null>(null);
  const [outcome, setOutcome] = useState<{ rating: number; level: Level; source: 'test' | 'elo' } | null>(null);
  const [elo, setElo] = useState('');
  const [source, setSource] = useState<EloSource>('lichess');
  const setPlacement = useProgressStore((s) => s.setPlacement);
  const dispatch = useGameStore((s) => s.dispatch);
  const navigate = useNavigate();
  const index = answers.length;

  const sortedPool = useMemo(() => [...pool].sort((a, b) => a.rating - b.rating), [pool]);

  const apply = (o: { rating: number; level: Level }, src: 'test' | 'elo') => {
    setOutcome({ ...o, source: src });
    setPlacement(o.level);
    dispatch({ type: 'PLACEMENT_DONE', rating: o.rating, level: o.level });
    setMode('done');
    celebrate('big');
  };

  const begin = () => {
    used.current = new Set();
    const first = pickNearest(sortedPool, PLACEMENT_START, used.current);
    if (first) used.current.add(first.id);
    setAnswers([]);
    setTarget(PLACEMENT_START);
    setCurrent(first ?? null);
    setMode('test');
  };

  const answer = (success: boolean) => {
    if (!current) return;
    const all = [...answers, { rating: current.rating, success }];
    const t = nextTarget(target, answers.length, success);
    setAnswers(all);
    setTarget(t);
    const next = all.length < PLACEMENT_LENGTH ? pickNearest(sortedPool, t, used.current) : undefined;
    if (!next) {
      apply(estimatePlacement(all, t), 'test');
      return;
    }
    used.current.add(next.id);
    setCurrent(next);
  };

  const eloNumber = Number(elo);
  const eloValid = Number.isFinite(eloNumber) && eloNumber >= 400 && eloNumber <= 3000;

  if (mode === 'done' && outcome) {
    return (
      <div className="stack" style={{ maxWidth: 560, margin: '0 auto' }}>
        <PageHeader icon="compass" title={`Nivel ${outcome.level}`} subtitle={`Rating de entrenamiento: ${outcome.rating}`} />
        {outcome.source === 'test' && (
          <p>
            Resolviste {answers.filter((r) => r.success).length} de {answers.length} posiciones (hasta {Math.max(0, ...answers.filter((r) => r.success).map((r) => r.rating))}).
          </p>
        )}
        <p className="muted">{LEVEL_TEXT[outcome.level]} El rating se seguirá ajustando con cada ejercicio.</p>
        <Button size="lg" onClick={() => navigate('/')}>
          Ver mi plan de hoy
        </Button>
      </div>
    );
  }

  if (mode === 'intro') {
    return (
      <div className="stack" style={{ maxWidth: 620, margin: '0 auto' }}>
        <PageHeader icon="compass" title="Calibrar tu nivel" subtitle="Ajustamos el plan a tu fuerza real: nada de aprender a mover las piezas si ya sabes jugar." />
        <Card title="Ya conozco mi Elo" subtitle="La forma más rápida. Lo afinamos después con tus resultados.">
          <div className="row">
            <select value={source} onChange={(e) => setSource(e.target.value as EloSource)} aria-label="Plataforma">
              <option value="lichess">Lichess</option>
              <option value="chesscom">Chess.com</option>
              <option value="fide">FIDE / federación</option>
            </select>
            <input
              type="number"
              inputMode="numeric"
              min={400}
              max={3000}
              placeholder="p. ej. 1900"
              value={elo}
              onChange={(e) => setElo(e.target.value)}
              aria-label="Tu Elo"
              style={{ width: 120 }}
            />
            <Button disabled={!eloValid} onClick={() => apply(ratingFromElo(eloNumber, source), 'elo')}>
              Usar mi Elo
            </Button>
          </div>
        </Card>
        <Card title="Test adaptativo" subtitle={`${PLACEMENT_LENGTH} posiciones. La dificultad sube si aciertas y baja si fallas.`}>
          <ul>
            <li>Una sola oportunidad por posición.</li>
            <li>Cualquier jugada que gane igual de bien también vale.</li>
          </ul>
          <Button size="lg" onClick={begin} loading={!ready} disabled={!ready}>
            Empezar test
          </Button>
        </Card>
      </div>
    );
  }

  if (!current) return null;
  return (
    <div className="stack" style={{ maxWidth: 600, margin: '0 auto' }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <Badge>
          Posición {index + 1}/{PLACEMENT_LENGTH}
        </Badge>
        <Button variant="ghost" size="sm" onClick={() => answer(false)}>
          No lo sé →
        </Button>
      </div>
      <ProgressBar value={index / PLACEMENT_LENGTH} />
      <PuzzleBoard
        key={current.id}
        fen={current.fen}
        solution={current.solution}
        maxMistakes={1}
        showHelp={false}
        prompt={current.title ?? 'Encuentra la mejor jugada'}
        onFinish={(r) => {
          const success = r.success;
          window.setTimeout(() => answer(success), 900);
        }}
      />
    </div>
  );
}
