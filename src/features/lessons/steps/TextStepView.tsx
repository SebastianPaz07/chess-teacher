import { ChessBoard } from '@/components/chess';
import { Button } from '@/components/ui';
import type { Step } from '@/content/schema';
import { RichText } from '@/components/ui/RichText';
import type { StepViewProps } from './stepRegistry';
import styles from './steps.module.css';

export function TextStepView({ step, onDone }: StepViewProps<Extract<Step, { type: 'text' }>>) {
  return (
    <div className={step.fen ? styles.split : styles.single}>
      {step.fen && (
        <div className={styles.board}>
          <ChessBoard fen={step.fen} arrows={step.arrows} maxWidth={440} />
        </div>
      )}
      <div className={styles.text}>
        {step.title && <h2>{step.title}</h2>}
        <RichText text={step.body} />
        <Button size="lg" onClick={onDone}>
          Continuar
        </Button>
      </div>
    </div>
  );
}
