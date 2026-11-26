import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { PuzzleBoard, type PuzzleResult } from '@/components/chess';
import { Badge, Button, Card, ProgressBar } from '@/components/ui';
import { BoardTip } from '@/components/ui/BoardTip';
import { RichText } from '@/components/ui/RichText';
import type { Exercise } from '@/content/schema';
import { TeacherBubble, type TeacherMood } from '@/features/gamification/components/TeacherBubble';
import { teacherSays } from '@/features/gamification/teacherMessages';
import { useRecordExercise } from '../hooks/useRecordExercise';
import styles from './ExerciseSession.module.css';

export interface SessionResult {
  exercise: Exercise;
  result: PuzzleResult;
}

interface Props {
  exercises: Exercise[];
  context: 'practice' | 'daily' | 'review';
  onComplete: (results: SessionResult[]) => void;
  /** Hook extra por ejercicio (p. ej. calificar tarjeta SM-2 en repaso) */
  onEach?: (ex: Exercise, r: PuzzleResult) => void;
}

/** Sesión de N ejercicios con feedback, rating y combo. */
export function ExerciseSession({ exercises, context, onComplete, onEach }: Props) {
  const record = useRecordExercise();
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<SessionResult[]>([]);
  const [current, setCurrent] = useState<{ r: PuzzleResult } | null>(null);
  const [teacher, setTeacher] = useState<{ msg: string; mood: TeacherMood }>({ msg: 'Encuentra la mejor jugada.', mood: 'thinking' });
  const [streak, setStreak] = useState(0);

  const ex = exercises[index];
  if (!ex) return null;

  const onFinish = (r: PuzzleResult) => {
    record(ex, r, context);
    onEach?.(ex, r);
    setCurrent({ r });
    setResults((prev) => [...prev, { exercise: ex, result: r }]);
    const s = r.success && r.mistakes === 0 ? streak + 1 : 0;
    setStreak(s);
    setTeacher(r.success ? { msg: teacherSays(s >= 3 ? 'combo' : 'correct'), mood: s >= 3 ? 'proud' : 'happy' } : { msg: 'Mira la solución con calma: la volverás a ver en tus repasos.', mood: 'oops' });
  };

  const next = () => {
    if (index + 1 >= exercises.length) {
      onComplete([...results]);
      return;
    }
    setIndex(index + 1);
    setCurrent(null);
    setTeacher({ msg: 'Siguiente posición. ¡Concéntrate!', mood: 'thinking' });
  };

  return (
    <div className={[styles.layout, current && styles.withBar].filter(Boolean).join(' ')}>
      <div className={styles.boardCol}>
        <AnimatePresence mode="wait">
          <motion.div key={ex.id + index} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <PuzzleBoard
              fen={ex.fen}
              solution={ex.solution}
              prompt={ex.title}
              onFinish={onFinish}
              onMistake={() => setTeacher({ msg: teacherSays('wrong'), mood: 'oops' })}
            />
          </motion.div>
        </AnimatePresence>
      </div>
      <div className={styles.side}>
        <div className="row">
          <Badge tone="neutral">
            Ejercicio {index + 1}/{exercises.length}
          </Badge>
          <Badge tone="xp">{ex.rating}</Badge>
          {streak >= 2 && <Badge tone="accent" icon="fire">{streak} seguidos</Badge>}
        </div>
        <ProgressBar value={(index + (current ? 1 : 0)) / exercises.length} />
        <TeacherBubble message={teacher.msg} mood={teacher.mood} />
        <div className="row">
          {ex.themes.map((t) => (
            <Badge key={t} tone="primary">
              {t.replace(/-/g, ' ')}
            </Badge>
          ))}
        </div>
        {!current && ex.hint && <p className="muted">Pista disponible si la necesitas.</p>}
        {current && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card tone={current.r.success ? 'success' : 'danger'} icon={current.r.success ? 'check-circle' : 'x-circle'} title={current.r.success ? (current.r.mistakes === 0 ? '¡Perfecto!' : 'Resuelto') : 'No resuelto'}>
              {ex.explanation && <RichText text={ex.explanation} />}
              <BoardTip />
              {ex.source && <p className="muted">Fuente: {ex.source.startsWith('lichess:') ? <a href={`https://lichess.org/training/${ex.source.slice(8)}`} target="_blank" rel="noreferrer">Lichess</a> : ex.source}</p>}
              <Button block size="lg" onClick={next} className={styles.cardNext}>
                {index + 1 >= exercises.length ? 'Ver resultados' : 'Siguiente'}
              </Button>
            </Card>
          </motion.div>
        )}
      </div>
      {/* Móvil: el botón para seguir queda siempre a mano, sin hacer scroll */}
      {current && (
        <div className={styles.nextBar}>
          <span className={styles.nextStatus} style={{ color: current.r.success ? 'var(--color-success)' : 'var(--color-danger)' }}>
            {current.r.success ? (current.r.mistakes === 0 && current.r.hintsUsed === 0 ? '¡Perfecto!' : 'Resuelto') : 'No resuelto'}
          </span>
          <Button size="sm" onClick={next} icon="arrow-right">
            {index + 1 >= exercises.length ? 'Resultados' : 'Siguiente'}
          </Button>
        </div>
      )}
    </div>
  );
}
