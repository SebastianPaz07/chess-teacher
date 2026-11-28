import type { ComponentType } from 'react';
import type { Step, StepType } from '@/content/schema';
import { BoardDemoStepView } from './BoardDemoStepView';
import { MakeMoveStepView } from './MakeMoveStepView';
import { QuizStepView } from './QuizStepView';
import { TextStepView } from './TextStepView';
import { VideoStepView } from './VideoStepView';

export interface StepViewProps<S extends Step = Step> {
  step: S;
  /** El alumno terminó el paso */
  onDone: () => void;
  /** Error en un paso evaluable (resta vida) */
  onMistake: () => void;
  /** Acierto en un paso evaluable (suma combo) */
  onCorrect: () => void;
}

/**
 * Registro tipo de paso → componente. Para añadir un nuevo tipo de paso:
 * 1) agrégalo al schema (StepSchema) 2) crea su vista 3) regístrala aquí.
 */
export const stepRegistry: { [K in StepType]: ComponentType<StepViewProps<Extract<Step, { type: K }>>> } = {
  text: TextStepView,
  'board-demo': BoardDemoStepView,
  'make-move': MakeMoveStepView,
  quiz: QuizStepView,
  video: VideoStepView,
};

export const isGraded = (step: Step) => step.type === 'make-move' || step.type === 'quiz';
