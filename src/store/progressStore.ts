import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Level } from '@/content/schema';
import { todayKey } from '@/lib/date';
import type { LessonRecord, MasteryRecord, ProgressSnapshot } from '@/services/scheduler/progression';
import { storeKey, zustandStorage } from '@/services/storage/localStorageAdapter';

interface ExerciseRecord {
  attempts: number;
  solved: number;
  lastAt: string;
}

interface ProgressState extends ProgressSnapshot {
  exercises: Record<string, ExerciseRecord>;
  openingLines: Record<string, { times: number; lastAt: string; bestMistakes: number }>;
  /** Punto donde quedó cada lección sin terminar, para retomarla */
  lessonDrafts: Record<string, { index: number; mistakes: number }>;
  saveLessonDraft: (lessonId: string, draft: { index: number; mistakes: number } | null) => void;
  completeLesson: (lessonId: string, mistakes: number) => LessonRecord;
  /** "Ya lo domino": marca lecciones como saltadas (sin XP ni estrellas) */
  skipLessons: (lessonIds: string[]) => void;
  /** Quita la marca de saltadas (las completadas de verdad no se tocan) */
  unskipLessons: (lessonIds: string[]) => void;
  recordAttempt: (exerciseId: string, tags: string[], success: boolean) => void;
  recordOpeningLine: (key: string, mistakes: number) => void;
  setPlacement: (level: Level) => void;
}

export const starsFor = (mistakes: number) => (mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1);

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      lessons: {},
      mastery: {},
      placementLevel: null,
      exercises: {},
      openingLines: {},
      lessonDrafts: {},

      saveLessonDraft: (lessonId, draft) =>
        set((s) => {
          const lessonDrafts = { ...s.lessonDrafts };
          if (draft) lessonDrafts[lessonId] = draft;
          else delete lessonDrafts[lessonId];
          return { lessonDrafts };
        }),

      completeLesson: (lessonId, mistakes) => {
        const old = get().lessons[lessonId];
        const prev = old?.skipped ? undefined : old;
        const stars = starsFor(mistakes);
        const record: LessonRecord = {
          stars: Math.max(stars, prev?.stars ?? 0),
          bestMistakes: Math.min(mistakes, prev?.bestMistakes ?? Infinity),
          completedAt: prev?.completedAt ?? todayKey(),
          times: (prev?.times ?? 0) + 1,
        };
        set((s) => ({ lessons: { ...s.lessons, [lessonId]: record } }));
        return record;
      },

      skipLessons: (ids) =>
        set((s) => {
          const lessons = { ...s.lessons };
          for (const id of ids) lessons[id] ??= { stars: 0, bestMistakes: 0, completedAt: todayKey(), times: 0, skipped: true };
          return { lessons };
        }),

      unskipLessons: (ids) =>
        set((s) => {
          const lessons = { ...s.lessons };
          for (const id of ids) if (lessons[id]?.skipped) delete lessons[id];
          return { lessons };
        }),

      recordAttempt: (exerciseId, tags, success) =>
        set((s) => {
          const mastery: Record<string, MasteryRecord> = { ...s.mastery };
          for (const t of tags) {
            const r = mastery[t] ?? { correct: 0, total: 0 };
            mastery[t] = { correct: r.correct + (success ? 1 : 0), total: r.total + 1 };
          }
          const prev = s.exercises[exerciseId] ?? { attempts: 0, solved: 0, lastAt: '' };
          return {
            mastery,
            exercises: { ...s.exercises, [exerciseId]: { attempts: prev.attempts + 1, solved: prev.solved + (success ? 1 : 0), lastAt: todayKey() } },
          };
        }),

      recordOpeningLine: (key, mistakes) =>
        set((s) => {
          const prev = s.openingLines[key];
          return {
            openingLines: {
              ...s.openingLines,
              [key]: { times: (prev?.times ?? 0) + 1, lastAt: todayKey(), bestMistakes: Math.min(mistakes, prev?.bestMistakes ?? Infinity) },
            },
          };
        }),

      setPlacement: (level) => set({ placementLevel: level }),
    }),
    { name: storeKey('progress'), storage: zustandStorage, version: 1 },
  ),
);
