import { z } from 'zod';

/**
 * Esquema del contenido. Cada módulo vive en src/content/modules/<id>/:
 *   module.json         → ModuleMeta
 *   lessons/*.json      → Lesson (ordenadas por `order`)
 *   exercises.json      → Exercise[]   (opcional)
 *   openings.json       → Opening[]    (opcional)
 *   games.json          → ClassicGame[] (opcional)
 */

export const LevelSchema = z.enum(['principiante', 'intermedio', 'avanzado']);
export type Level = z.infer<typeof LevelSchema>;
export const LEVEL_RANK: Record<Level, number> = { principiante: 0, intermedio: 1, avanzado: 2 };

const Arrow = z.tuple([z.string(), z.string()]);

const SourceRef = z.object({
  title: z.string(),
  /** Tags del catálogo del Drive (resources.json) para mostrar material relacionado */
  resourceTags: z.array(z.string()).default([]),
});

const TextStep = z.object({
  type: z.literal('text'),
  title: z.string().optional(),
  body: z.string(),
  fen: z.string().optional(),
  arrows: z.array(Arrow).optional(),
});

const BoardDemoStep = z.object({
  type: z.literal('board-demo'),
  title: z.string().optional(),
  fen: z.string().default('start'),
  /** Jugadas SAN que el alumno recorre paso a paso */
  moves: z.array(z.string()).default([]),
  /** Comentario por índice de jugada (0 = antes de la primera) */
  notes: z.record(z.string()).default({}),
  arrows: z.array(Arrow).optional(),
  body: z.string().optional(),
});

const MakeMoveStep = z.object({
  type: z.literal('make-move'),
  title: z.string().optional(),
  fen: z.string(),
  prompt: z.string(),
  /** Jugadas SAN alternando alumno / respuesta automática */
  solution: z.array(z.string()).min(1),
  hint: z.string().optional(),
  explanation: z.string().optional(),
});

const QuizStep = z.object({
  type: z.literal('quiz'),
  title: z.string().optional(),
  question: z.string(),
  fen: z.string().optional(),
  options: z.array(z.string()).min(2),
  answer: z.number().int().min(0),
  explanation: z.string().optional(),
});

/** Clase grabada de la carpeta de Drive, se ve dentro de la app */
const VideoStep = z.object({
  type: z.literal('video'),
  title: z.string().optional(),
  resourceId: z.string(),
  body: z.string().optional(),
});

export const StepSchema = z.discriminatedUnion('type', [TextStep, BoardDemoStep, MakeMoveStep, QuizStep, VideoStep]);
export type Step = z.infer<typeof StepSchema>;
export type StepType = Step['type'];

export const LessonSchema = z.object({
  id: z.string(),
  order: z.number(),
  title: z.string(),
  summary: z.string(),
  icon: z.string().default('piece-pawn'),
  xp: z.number().default(50),
  minutes: z.number().default(8),
  tags: z.array(z.string()).default([]),
  sources: z.array(SourceRef).default([]),
  /** Ejercicios que pasan a repaso al completar la lección */
  practice: z.array(z.string()).default([]),
  steps: z.array(StepSchema).min(1),
});
export type Lesson = z.infer<typeof LessonSchema> & { moduleId: string };

export const ExerciseSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  fen: z.string(),
  solution: z.array(z.string()).min(1),
  themes: z.array(z.string()).min(1),
  rating: z.number(),
  hint: z.string().optional(),
  explanation: z.string().optional(),
  source: z.string().optional(),
});
export type Exercise = z.infer<typeof ExerciseSchema> & { moduleId: string; tags: string[] };

export const OpeningLineSchema = z.object({
  name: z.string(),
  /** Variante a la que pertenece: las líneas se muestran agrupadas por ella */
  group: z.string().optional(),
  moves: z.array(z.string()).min(1),
  notes: z.record(z.string()).default({}),
});
export type OpeningLine = z.infer<typeof OpeningLineSchema>;

export const OpeningSchema = z.object({
  id: z.string(),
  name: z.string(),
  side: z.enum(['w', 'b']),
  /** Icono propio de la apertura en listas y encabezados */
  icon: z.string(),
  eco: z.string().optional(),
  description: z.string(),
  ideas: z.array(z.string()).default([]),
  resourceTags: z.array(z.string()).default([]),
  lines: z.array(OpeningLineSchema).min(1),
});
export type Opening = z.infer<typeof OpeningSchema> & { moduleId: string };

export const ClassicGameSchema = z.object({
  id: z.string(),
  white: z.string(),
  black: z.string(),
  year: z.number(),
  event: z.string().optional(),
  description: z.string(),
  /** Bando que practica el alumno */
  side: z.enum(['w', 'b']),
  moves: z.array(z.string()).min(1),
  notes: z.record(z.string()).default({}),
});
export type ClassicGame = z.infer<typeof ClassicGameSchema> & { moduleId: string };

export const ModuleMetaSchema = z.object({
  id: z.string(),
  order: z.number(),
  title: z.string(),
  description: z.string(),
  icon: z.string(),
  color: z.string().default('#1f6f5c'),
  level: LevelSchema,
  category: z.enum(['fundamentos', 'tactica', 'estrategia', 'aperturas', 'finales', 'entrenamiento']),
  prerequisites: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
});
export type ModuleMeta = z.infer<typeof ModuleMetaSchema>;

export interface Module extends ModuleMeta {
  lessons: Lesson[];
  exercises: Exercise[];
  openings: Opening[];
  games: ClassicGame[];
}

export const ResourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(['pdf', 'video', 'other']),
  folder: z.string(),
  tags: z.array(z.string()),
});
export type Resource = z.infer<typeof ResourceSchema>;
