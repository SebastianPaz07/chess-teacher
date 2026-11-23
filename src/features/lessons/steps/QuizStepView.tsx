import { motion } from 'framer-motion';
import { useState } from 'react';
import { ChessBoard } from '@/components/chess';
import { Button, Card } from '@/components/ui';
import { RichText } from '@/components/ui/RichText';
import type { Step } from '@/content/schema';
import { sound } from '@/services/sound';
import type { StepViewProps } from './stepRegistry';
import styles from './steps.module.css';

export function QuizStepView({ step, onDone, onMistake, onCorrect }: StepViewProps<Extract<Step, { type: 'quiz' }>>) {
  const [wrong, setWrong] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);

  const choose = (i: number) => {
    if (solved || wrong.includes(i)) return;
    if (i === step.answer) {
      setSolved(true);
      sound.correct();
      if (wrong.length === 0) onCorrect();
    } else {
      setWrong((w) => [...w, i]);
      sound.wrong();
      onMistake();
    }
  };

  return (
    <div className={step.fen ? styles.split : styles.single}>
      {step.fen && (
        <div className={styles.board}>
          <ChessBoard fen={step.fen} maxWidth={440} />
        </div>
      )}
      <div className={styles.text}>
        {step.title && <h2>{step.title}</h2>}
        <RichText text={step.question} />
        <div className={styles.options}>
          {step.options.map((opt, i) => {
            const state = solved && i === step.answer ? 'right' : wrong.includes(i) ? 'wrong' : '';
            return (
              <motion.button
                key={i}
                className={[styles.option, state && styles[state]].filter(Boolean).join(' ')}
                onClick={() => choose(i)}
                animate={state === 'wrong' ? { x: [0, -8, 8, -4, 0] } : state === 'right' ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 0.35 }}
              >
                <span className={styles.letter}>{String.fromCharCode(65 + i)}</span>
                {opt}
              </motion.button>
            );
          })}
        </div>
        {solved && (
          <Card tone="success" title="¡Correcto!" icon="check-circle">
            {step.explanation && <RichText text={step.explanation} />}
            <Button size="lg" onClick={onDone}>
              Continuar
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
