import { z } from 'zod';
import {
  ClassicGameSchema,
  ExerciseSchema,
  LessonSchema,
  ModuleMetaSchema,
  OpeningSchema,
  ResourceSchema,
  type ClassicGame,
  type Exercise,
  type Lesson,
  type Module,
  type Opening,
  type Resource,
} from './schema';
import resourcesJson from './resources.json';

/**
 * Auto-descubrimiento de módulos: basta con crear una carpeta nueva en
 * src/content/modules/<id>/ con su module.json. No hay que registrar nada.
 */
const metaFiles = import.meta.glob('./modules/*/module.json', { eager: true, import: 'default' });
const lessonFiles = import.meta.glob('./modules/*/lessons/*.json', { eager: true, import: 'default' });
const exerciseFiles = import.meta.glob('./modules/*/exercises.json', { eager: true, import: 'default' });
const openingFiles = import.meta.glob('./modules/*/openings.json', { eager: true, import: 'default' });
const gameFiles = import.meta.glob('./modules/*/games.json', { eager: true, import: 'default' });

const folderOf = (path: string) => path.split('/')[2];

function parse<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, data: unknown, path: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(`Contenido inválido en ${path}:\n${result.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n')}`);
  }
  return result.data;
}

function filesFor(files: Record<string, unknown>, folder: string) {
  return Object.entries(files).filter(([p]) => folderOf(p) === folder);
}

function buildModules(): Module[] {
  const modules: Module[] = [];
  for (const [path, raw] of Object.entries(metaFiles)) {
    const folder = folderOf(path);
    const meta = parse(ModuleMetaSchema, raw, path);
    const moduleTags = [meta.category, ...meta.tags];

    const lessons: Lesson[] = filesFor(lessonFiles, folder)
      .map(([p, data]) => ({ ...parse(LessonSchema, data, p), moduleId: meta.id }))
      .sort((a, b) => a.order - b.order);

    const exercises: Exercise[] = filesFor(exerciseFiles, folder).flatMap(([p, data]) =>
      parse(z.array(ExerciseSchema), data, p).map((e) => ({
        ...e,
        moduleId: meta.id,
        tags: [...new Set([...moduleTags, ...e.themes])],
      })),
    );
    const openings: Opening[] = filesFor(openingFiles, folder).flatMap(([p, data]) =>
      parse(z.array(OpeningSchema), data, p).map((o) => ({ ...o, moduleId: meta.id })),
    );
    const games: ClassicGame[] = filesFor(gameFiles, folder).flatMap(([p, data]) =>
      parse(z.array(ClassicGameSchema), data, p).map((g) => ({ ...g, moduleId: meta.id })),
    );

    modules.push({ ...meta, lessons, exercises, openings, games });
  }
  return modules.sort((a, b) => a.order - b.order);
}

export const modules: Module[] = buildModules();

export const allLessons: Lesson[] = modules.flatMap((m) => m.lessons);
export const allExercises: Exercise[] = modules.flatMap((m) => m.exercises);
export const allOpenings: Opening[] = modules.flatMap((m) => m.openings);
export const allGames: ClassicGame[] = modules.flatMap((m) => m.games);

const lessonIndex = new Map(allLessons.map((l) => [l.id, l]));
const exerciseIndex = new Map(allExercises.map((e) => [e.id, e]));
const openingIndex = new Map(allOpenings.map((o) => [o.id, o]));
const moduleIndex = new Map(modules.map((m) => [m.id, m]));

export const getModule = (id: string) => moduleIndex.get(id);
export const getLesson = (id: string) => lessonIndex.get(id);
/** Ejercicios cargados de forma diferida (puzzles importados). */
const extraIndex = new Map<string, Exercise>();
export function registerExercises(list: Exercise[]) {
  for (const e of list) extraIndex.set(e.id, e);
}
export const getExercise = (id: string) => exerciseIndex.get(id) ?? extraIndex.get(id);
export const getOpening = (id: string) => openingIndex.get(id);
export const getGame = (id: string) => allGames.find((g) => g.id === id);

/** Catálogo del Drive (generado con `npm run inventory`). */
export const driveRootFolderId: string = resourcesJson.rootFolderId;
export const resources: Resource[] = z.array(ResourceSchema).parse(resourcesJson.resources);

const resourceIndex = new Map(resources.map((r) => [r.id, r]));
export const getResource = (id: string) => resourceIndex.get(id);

export function resourcesByTags(tags: string[], limit = 6): Resource[] {
  if (!tags.length) return [];
  return resources
    .map((r) => ({ r, score: r.tags.filter((t) => tags.includes(t)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || (a.r.type === 'video' ? -1 : 1))
    .slice(0, limit)
    .map((x) => x.r);
}
