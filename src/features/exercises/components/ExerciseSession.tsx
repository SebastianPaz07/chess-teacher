import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { PuzzleBoard, type PuzzleResult } from '@/components/chess';
import { Badge, Button, Card, ProgressBar } from '@/components/ui';
import { BoardTip, PhysicalBoard } from '@/components/ui/BoardTip';
import { RichText } from '@/components/ui/RichText';
import type { Exercise } from '@/content/schema';
import { TeacherBubble, type TeacherMood } from '@/features/gamification/components/TeacherBubble';
import { WinBar } from '@/components/ui/WinBar';
import { teacherSays } from '@/features/gamification/teacherMessages';
import { useRecordExercise } from '../hooks/useRecordExercise';
import { themeLabel } from '../themes';
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
  const won = Boolean(current?.r.success);
  const perfect = won && current?.r.mistakes === 0 && current.r.hintsUsed === 0;

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
    // El ejercicio nuevo empieza arriba, con su título y el tablero
    window.scrollTo(0, 0);
  };

  const last = index + 1 >= exercises.length;
  const source = ex.source && <p className="muted">Fuente: {ex.source.startsWith('lichess:') ? <a href={`https://lichess.org/training/${ex.source.slice(8)}`} target="_blank" rel="noreferrer">Lichess</a> : ex.source}</p>;

  return (
    <div className={[styles.layout, current && !won && styles.withBar].filter(Boolean).join(' ')}>
      <div className={styles.boardCol}>
        <AnimatePresence mode="wait">
          <motion.div key={ex.id + index} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <PuzzleBoard
              fen={ex.fen}
              solution={ex.solution}
              heading={{ title: ex.title ?? themeLabel(ex.themes[0]), aside: `Ejercicio ${index + 1}/${exercises.length}` }}
              onFinish={onFinish}
              onMistake={() => setTeacher({ msg: teacherSays('wrong'), mood: 'oops' })}
            />
          </motion.div>
        </AnimatePresence>
      </div>
      <div className={styles.side}>
        {/* Al acertar solo queda lo necesario: el avance, la explicación plegada y la barra para seguir */}
        {!won && (
          <div className="row">
            <Badge tone="xp">{ex.rating}</Badge>
            {streak >= 2 && <Badge tone="accent" icon="fire">{streak} seguidos</Badge>}
          </div>
        )}
        <ProgressBar value={(index + (current ? 1 : 0)) / exercises.length} />
        {!won && <TeacherBubble message={teacher.msg} mood={teacher.mood} />}
        {!won && (
          <div className="row">
            {ex.themes.map((t) => (
              <Badge key={t} tone="primary">
                {t.replace(/-/g, ' ')}
              </Badge>
            ))}
          </div>
        )}
        {!current && ex.hint && <p className="muted">Pista disponible si la necesitas.</p>}
        {!current && <PhysicalBoard key={ex.id} fen={ex.fen} />}
        {won && (ex.explanation || ex.source) && (
          <details key={ex.id} className={styles.why}>
            <summary>Ver explicación</summary>
            {ex.explanation && <RichText text={ex.explanation} />}
            {source}
          </details>
        )}
        {current && !won && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card tone="danger" icon="x-circle" title="No resuelto">
              {ex.explanation && <RichText text={ex.explanation} />}
              <BoardTip />
              {source}
              <Button block size="lg" onClick={next} className={styles.cardNext}>
                {last ? 'Ver resultados' : 'Siguiente'}
              </Button>
            </Card>
          </motion.div>
        )}
      </div>
      {won && (
        <WinBar
          detail={streak >= 2 ? `${streak} seguidos` : perfect ? 'Perfecto' : undefined}
          label={last ? 'Ver resultados' : 'Continuar'}
          onContinue={next}
        />
      )}
      {/* Móvil, si no salió: el botón para seguir queda a mano mientras miras la solución */}
      {current && !won && (
        <div className={styles.nextBar}>
          <span className={styles.nextStatus} style={{ color: 'var(--color-danger)' }}>
            No resuelto
          </span>
          <Button size="sm" onClick={next} icon="arrow-right">
            {last ? 'Resultados' : 'Siguiente'}
          </Button>
        </div>
      )}
    </div>
  );
}
