import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { PuzzleBoard, type PuzzleResult } from '@/components/chess';
import { Badge, Button, Card, Hearts, Loader, ProgressBar } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { getExercise } from '@/content/registry';
import type { Exercise } from '@/content/schema';
import { useRecordExercise } from '@/features/exercises/hooks/useRecordExercise';
import { usePuzzles } from '@/hooks/usePuzzles';
import { RUSH_SECONDS, RUSH_STRIKES } from '@/services/club/challenges';
import type { ChallengeKind } from '@/services/club';
import { formatMs } from '../format';
import styles from '../club.module.css';

export interface RunResult {
  solved: number;
  mistakes: number;
  timeMs: number;
}

/** Ejercicios por id, esperando a que carguen los puzzles importados. */
export function useExercisesByIds(ids: string[] | undefined): Exercise[] | null {
  const { ready } = usePuzzles();
  return useMemo(() => {
    if (!ids || !ready) return null;
    return ids.map((id) => getExercise(id)).filter((e): e is Exercise => Boolean(e));
  }, [ids, ready]);
}

interface Props {
  puzzleIds: string[];
  kind: ChallengeKind;
  intro: ReactNode;
  side?: ReactNode;
  onDone: (r: RunResult) => void;
}

/**
 * Partida de reto: un intento por ejercicio, sin pistas, con cronómetro.
 * - puzzles: todos los ejercicios del set; el tiempo desempata.
 * - rush: 3 minutos y 3 vidas.
 */
export function ChallengeRunner({ puzzleIds, kind, intro, side, onDone }: Props) {
  const exercises = useExercisesByIds(puzzleIds);
  const record = useRecordExercise();
  const [phase, setPhase] = useState<'intro' | 'playing'>('intro');
  const [index, setIndex] = useState(0);
  const [solved, setSolved] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(0);
  const finished = useRef(false);

  useEffect(() => {
    if (phase !== 'playing') return;
    const t = window.setInterval(() => setElapsed(Date.now() - startedAt.current), 250);
    return () => clearInterval(t);
  }, [phase]);

  const finish = (s: number, m: number) => {
    if (finished.current) return;
    finished.current = true;
    const timeMs = Math.min(Date.now() - startedAt.current, kind === 'rush' ? RUSH_SECONDS * 1000 : Infinity);
    onDone({ solved: s, mistakes: m, timeMs: Math.round(timeMs) });
  };

  useEffect(() => {
    if (phase === 'playing' && kind === 'rush' && elapsed >= RUSH_SECONDS * 1000) finish(solved, mistakes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed]);

  if (!exercises) return <Loader label="Preparando los ejercicios…" />;
  if (!exercises.length) return <p className="muted">No se encontraron los ejercicios de este reto.</p>;

  if (phase === 'intro') {
    return (
      <div className="stack" style={{ maxWidth: 620, margin: '0 auto', width: '100%' }}>
        {intro}
        <Card>
          <ul style={{ margin: '0 0 var(--space-4)', paddingLeft: 20 }}>
            {kind === 'rush' ? (
              <>
                <li>Tienes 3 minutos y {RUSH_STRIKES} vidas.</li>
                <li>Cada error cuenta como fallo y pasas al siguiente.</li>
              </>
            ) : (
              <>
                <li>{exercises.length} ejercicios, un solo intento cada uno.</li>
                <li>Sin pistas. Si empatan en aciertos, gana quien falle menos y luego quien tarde menos.</li>
              </>
            )}
            <li>Solo se puede jugar una vez: busca un momento tranquilo.</li>
          </ul>
          <Button
            size="lg"
            block
            icon="play"
            onClick={() => {
              startedAt.current = Date.now();
              setPhase('playing');
            }}
          >
            Empezar
          </Button>
        </Card>
      </div>
    );
  }

  const current = exercises[index];
  const remaining = kind === 'rush' ? Math.max(0, RUSH_SECONDS * 1000 - elapsed) : elapsed;

  const onFinish = (r: PuzzleResult) => {
    const success = r.success;
    record(current, r, 'rush');
    const s = solved + (success ? 1 : 0);
    const m = mistakes + (success ? 0 : 1);
    setSolved(s);
    setMistakes(m);
    const out = kind === 'rush' ? m >= RUSH_STRIKES || index + 1 >= exercises.length : index + 1 >= exercises.length;
    if (out) window.setTimeout(() => finish(s, m), 500);
    else window.setTimeout(() => setIndex((i) => i + 1), success ? 450 : 900);
  };

  return (
    <div className={styles.runner}>
      <div className="stack" style={{ minWidth: 0 }}>
        <div className={styles.runnerBar}>
          <Badge tone={kind === 'rush' && remaining < 20_000 ? 'danger' : 'neutral'} icon={kind === 'rush' ? 'timer' : 'clock'}>
            {formatMs(remaining)}
          </Badge>
          <Badge tone="accent" icon="check">
            {solved} {kind === 'puzzles' ? `/ ${exercises.length}` : ''}
          </Badge>
          {kind === 'rush' ? <Hearts total={RUSH_STRIKES} left={RUSH_STRIKES - mistakes} /> : <Badge tone="neutral">{index + 1}/{exercises.length}</Badge>}
        </div>
        {kind === 'puzzles' && <ProgressBar value={index / exercises.length} height={4} />}
        <AnimatePresence mode="wait">
          <motion.div key={`${current.id}-${index}`} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
            <PuzzleBoard fen={current.fen} solution={current.solution} maxMistakes={1} showHelp={false} prompt={`Dificultad ${current.rating}`} onFinish={onFinish} />
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="stack" style={{ minWidth: 0 }}>
        {side ?? (
          <p className="muted">
            <Icon name="sword" /> Concéntrate: tu rival juega exactamente estos mismos ejercicios.
          </p>
        )}
      </div>
    </div>
  );
}
