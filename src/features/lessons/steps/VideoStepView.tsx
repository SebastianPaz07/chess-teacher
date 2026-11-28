import { Button } from '@/components/ui';
import { RichText } from '@/components/ui/RichText';
import { getResource } from '@/content/registry';
import type { Step } from '@/content/schema';
import { DriveFrame } from '@/features/library/components/ResourceViewer';
import { LessonAction } from './LessonAction';
import type { StepViewProps } from './stepRegistry';
import styles from './steps.module.css';

/** Clase grabada dentro de la lección. Se puede continuar sin verla entera. */
export function VideoStepView({ step, onDone }: StepViewProps<Extract<Step, { type: 'video' }>>) {
  const resource = getResource(step.resourceId);
  return (
    <div className={styles.video}>
      <p className="eyebrow" style={{ margin: 0 }}>
        Clase grabada · {Math.round(step.minutes)} min
      </p>
      <h2 style={{ margin: 0 }}>{step.title ?? resource?.title}</h2>
      {step.body && <RichText text={step.body} />}
      {resource && (
        <div className={styles.videoFrame}>
          <DriveFrame key={resource.id} resource={resource} />
        </div>
      )}
      <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
        Ten un tablero físico al lado: pausa el video y piensa cada posición antes de ver qué pasa.
      </p>
      <LessonAction>
        <Button size="md" block onClick={onDone}>
          Continuar
        </Button>
      </LessonAction>
    </div>
  );
}
