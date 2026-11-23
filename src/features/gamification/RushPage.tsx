import { Icon } from '@/components/ui/Icon';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PuzzleBoard } from '@/components/chess';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, Button, Card, Hearts } from '@/components/ui';
import { allExercises } from '@/content/registry';
import { usePuzzles } from '@/hooks/usePuzzles';
import type { Exercise } from '@/content/schema';
import { useRecordExercise } from '@/features/exercises/hooks/useRecordExercise';
import { shuffle } from '@/lib/random';
import { useGameStore } from '@/store/gameStore';
import { celebrate } from './components/RewardsCenter';

const DURATION = 180;
const STRIKES = 3;

/** Rush táctico: máximo de ejercicios en 3 minutos, dificultad creciente, 3 vidas. */
export function RushPage() {
  const best = useGameStore((s) => s.stats.rushBest);
  const dispatch = useGameStore((s) => s.dispatch);
  const record = useRecordExercise();
  const [phase, setPhase] = useState<'intro' | 'playing' | 'over'>('intro');
  const [queue, setQueue] = useState<Exercise[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const ended = useRef(false);

  const { puzzles } = usePuzzles();
  const sorted = useMemo(() => [...allExercises, ...puzzles].filter((e) => e.solution.length <= 3), [puzzles]);

  const start = () => {
    // Dificultad creciente: tramos de rating barajados internamente
    const easy = shuffle(sorted.filter((e) => e.rating < 900));
    const mid = shuffle(sorted.filter((e) => e.rating >= 900 && e.rating < 1400));
    const hard = shuffle(sorted.filter((e) => e.rating >= 1400));
    setQueue([...easy, ...mid, ...hard]);
    setIndex(0);
    setScore(0);
    setStrikes(0);
    setTimeLeft(DURATION);
    ended.current = false;
    setPhase('playing');
  };

  const end = (finalScore: number) => {
    if (ended.current) return;
    ended.current = true;
    setPhase('over');
    dispatch({ type: 'RUSH_FINISHED', score: finalScore });
    if (finalScore > best) celebrate('big');
  };

  useEffect(() => {
    if (phase !== 'playing') return;
    const t = window.setInterval(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (phase === 'playing' && timeLeft <= 0) end(score);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase]);

  const current = queue[index];

  const advance = (success: boolean) => {
    const newScore = score + (success ? 1 : 0);
    const newStrikes = strikes + (success ? 0 : 1);
    setScore(newScore);
    setStrikes(newStrikes);
    if (newStrikes >= STRIKES || index + 1 >= queue.length) end(newScore);
    else window.setTimeout(() => setIndex((i) => i + 1), success ? 350 : 900);
  };

  if (phase === 'intro' || phase === 'over') {
    return (
      <div className="stack" style={{ maxWidth: 620, margin: '0 auto' }}>
        <PageHeader icon="lightning" title="Rush táctico" subtitle="Resuelve tantos ejercicios como puedas en 3 minutos. Un error en cualquier jugada cuenta como fallo. 3 fallos y se acaba." />
        {phase === 'over' && (
          <Card tone={score > best - 1 ? 'accent' : 'primary'} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3.5rem', display: 'flex', justifyContent: 'center' }}><Icon name={score >= best && score > 0 ? 'trophy' : 'lightning'} weight="light" /></div>
            <h2>{score} puntos</h2>
            <p className="muted">Récord personal: {Math.max(best, score)}</p>
          </Card>
        )}
        <Card style={{ textAlign: 'center' }}>
          <p>
            Récord actual: <strong>{best}</strong>
          </p>
          <Button size="lg" onClick={start}>
            {phase === 'over' ? 'Jugar otra vez' : '¡Empezar!'}
          </Button>
        </Card>
      </div>
    );
  }

  const mm = Math.floor(Math.max(0, timeLeft) / 60);
  const ss = String(Math.max(0, timeLeft) % 60).padStart(2, '0');

  return (
    <div className="stack" style={{ maxWidth: 600, margin: '0 auto' }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <Badge tone={timeLeft <= 20 ? 'danger' : 'neutral'}>
          <Icon name="timer" /> {mm}:{ss}
        </Badge>
        <motion.div key={score} initial={{ scale: 1.5 }} animate={{ scale: 1 }}>
          <Badge tone="accent" icon="lightning">{score}</Badge>
        </motion.div>
        <Hearts total={STRIKES} left={STRIKES - strikes} />
      </div>
      <AnimatePresence mode="wait">
        {current && (
          <motion.div key={`${current.id}-${index}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
            <PuzzleBoard
              fen={current.fen}
              solution={current.solution}
              maxMistakes={1}
              showHelp={false}
              prompt={`Dificultad ${current.rating}`}
              onFinish={(r) => {
                record(current, r, 'rush');
                advance(r.success);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
