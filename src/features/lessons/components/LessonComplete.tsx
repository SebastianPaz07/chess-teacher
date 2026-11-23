import { Icon } from '@/components/ui/Icon';
import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { Button, Card } from '@/components/ui';
import type { Lesson } from '@/content/schema';
import { celebrate } from '@/features/gamification/components/RewardsCenter';
import { TeacherBubble } from '@/features/gamification/components/TeacherBubble';
import { teacherSays } from '@/features/gamification/teacherMessages';

export interface LessonSummary {
  stars: number;
  mistakes: number;
  xp: number;
  graded: number;
  combo: number;
}

interface Props {
  lesson: Lesson;
  summary: LessonSummary;
  onContinue: () => void;
  continueLabel: string;
  onRetry: () => void;
}

export function LessonComplete({ lesson, summary, onContinue, continueLabel, onRetry }: Props) {
  useEffect(() => celebrate(summary.stars === 3 ? 'big' : 'small'), [summary.stars]);
  const accuracy = summary.graded ? Math.round((Math.max(0, summary.graded - summary.mistakes) / summary.graded) * 100) : 100;

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }} className="stack">
      <h1>¡Lección completada!</h1>
      <p className="muted">{lesson.title}</p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, fontSize: '3.4rem' }}>
        {[1, 2, 3].map((i) => (
          <motion.span
            key={i}
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2 + i * 0.25, type: 'spring', stiffness: 260 }}
            style={{ filter: i <= summary.stars ? 'none' : 'grayscale(1) opacity(0.3)' }}
          >
            <Icon name="star" weight="fill" color="var(--color-accent)" />
          </motion.span>
        ))}
      </div>
      <div className="grid-auto" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <Card tone="accent" padded>
          <div style={{ fontSize: '1.6rem', fontFamily: 'var(--font-display)' }}>+{summary.xp}</div>
          <div className="muted">XP</div>
        </Card>
        <Card tone="success" padded>
          <div style={{ fontSize: '1.6rem', fontFamily: 'var(--font-display)' }}>{accuracy}%</div>
          <div className="muted">Precisión</div>
        </Card>
        <Card tone="primary" padded>
          <div style={{ fontSize: '1.6rem', fontFamily: 'var(--font-display)' }}>{summary.mistakes}</div>
          <div className="muted">Errores</div>
        </Card>
      </div>
      <TeacherBubble message={summary.mistakes === 0 ? teacherSays('perfect') : teacherSays('correct')} mood={summary.mistakes === 0 ? 'proud' : 'happy'} />
      <Button size="lg" block onClick={onContinue}>
        {continueLabel}
      </Button>
      {summary.stars < 3 && (
        <Button variant="ghost" onClick={onRetry}>
          Repetir para conseguir 3 estrellas
        </Button>
      )}
    </div>
  );
}
