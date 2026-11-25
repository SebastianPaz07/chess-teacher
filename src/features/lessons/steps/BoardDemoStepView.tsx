import { BoardStepper } from '@/components/chess';
import { Button } from '@/components/ui';
import { RichText } from '@/components/ui/RichText';
import type { Step } from '@/content/schema';
import type { StepViewProps } from './stepRegistry';
import { LessonAction } from './LessonAction';
import styles from './steps.module.css';

export function BoardDemoStepView({ step, onDone }: StepViewProps<Extract<Step, { type: 'board-demo' }>>) {
  return (
    <div className={styles.split}>
      <div className={styles.board}>
        <BoardStepper fen={step.fen} moves={step.moves} notes={step.notes} arrows={step.arrows} maxWidth={440} />
      </div>
      <div className={styles.text}>
        {step.title && <h2>{step.title}</h2>}
        {step.body && <RichText text={step.body} />}
        {step.moves.length > 0 && <p className="muted">Usa los controles para recorrer las jugadas.</p>}
        <LessonAction>
          <Button size="md" block onClick={onDone}>
            Continuar
          </Button>
        </LessonAction>
      </div>
    </div>
  );
}
