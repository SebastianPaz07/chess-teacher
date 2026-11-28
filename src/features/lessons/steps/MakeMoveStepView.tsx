import { useState } from 'react';
import { PuzzleBoard } from '@/components/chess';
import { Button, Card } from '@/components/ui';
import { BoardTip, PhysicalBoard } from '@/components/ui/BoardTip';
import { RichText } from '@/components/ui/RichText';
import { WinBar } from '@/components/ui/WinBar';
import type { Step } from '@/content/schema';
import type { StepViewProps } from './stepRegistry';
import { LessonAction } from './LessonAction';
import styles from './steps.module.css';

export function MakeMoveStepView({ step, onDone, onMistake, onCorrect }: StepViewProps<Extract<Step, { type: 'make-move' }>>) {
  const [result, setResult] = useState<'solved' | 'revealed' | null>(null);
  return (
    <div className={styles.split}>
      <div className={styles.board}>
        <PuzzleBoard
          fen={step.fen}
          solution={step.solution}
          maxWidth={440}
          onMistake={onMistake}
          onFinish={(r) => {
            if (r.success) onCorrect();
            else onMistake();
            setResult(r.success ? 'solved' : 'revealed');
          }}
        />
      </div>
      <div className={styles.text}>
        {step.title && <h2>{step.title}</h2>}
        <RichText text={step.prompt} />
        {step.hint && !result && <p className="muted">Pista: {step.hint}</p>}
        {!result && <PhysicalBoard fen={step.fen} />}
        {/* Acertaste: solo la explicación; el «Ganaste» y «Continuar» van fijos abajo */}
        {result === 'solved' && step.explanation && <RichText text={step.explanation} />}
        {result === 'solved' && (
          <LessonAction>
            <WinBar label="Continuar" onContinue={onDone} />
          </LessonAction>
        )}
        {result === 'revealed' && (
          <Card tone="accent" title="Mira la solución" icon="eye">
            {step.explanation && <RichText text={step.explanation} />}
            <BoardTip />
            <LessonAction>
              <Button size="lg" block onClick={onDone}>
                Continuar
              </Button>
            </LessonAction>
          </Card>
        )}
      </div>
    </div>
  );
}
