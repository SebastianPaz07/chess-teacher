import { generateDailyPlan, isCoreTask, type DailyPlanInput, type DailyTask } from './dailyPlan';
import type { ReviewCard } from './sm2';
import type { ThemeId } from './weekPlan';

export interface PlannedDay {
  date: string;
  theme: ThemeId | null;
  /** past: ya pasó · today: plan real de hoy · next: previsión */
  when: 'past' | 'today' | 'next';
  tasks: DailyTask[];
}

export interface WeekProjectionInput extends Omit<DailyPlanInput, 'date' | 'theme' | 'restDay' | 'dueCards'> {
  today: string;
  themes: Record<string, ThemeId | null>;
  cards: ReviewCard[];
  /** Plan ya generado para hoy */
  todayTasks: DailyTask[];
}

/**
 * Previsión de la semana: se simula cada día que falta suponiendo que cumples el
 * anterior (las lecciones avanzan y las líneas de apertura se van estudiando).
 */
export function projectWeek({ today, themes, cards, todayTasks, ...base }: WeekProjectionInput): PlannedDay[] {
  const lessons = { ...base.progress.lessons };
  const trainedLines = { ...base.trainedLines };
  const solved = new Set(base.solvedIds);
  const lessonDrafts = { ...base.lessonDrafts };

  const assumeDone = (tasks: DailyTask[], date: string) => {
    for (const t of tasks) {
      if (t.kind === 'lesson') {
        const total = base.modules.flatMap((m) => m.lessons).find((l) => l.id === t.lessonId)?.steps.length ?? 0;
        if (t.toStep >= total) {
          lessons[t.lessonId] = { stars: 3, bestMistakes: 0, completedAt: date, times: 1 };
          delete lessonDrafts[t.lessonId];
        } else lessonDrafts[t.lessonId] = { index: t.toStep };
      }
      if (t.kind === 'opening') trainedLines[`${t.openingId}#${t.lineIndex}`] = true;
      if (t.kind === 'practice') t.exerciseIds.forEach((id) => solved.add(id));
    }
  };

  return Object.entries(themes).map(([date, theme]) => {
    if (date < today) return { date, theme, when: 'past' as const, tasks: [] };
    if (date === today) {
      const tasks = todayTasks.filter(isCoreTask);
      assumeDone(tasks, date);
      return { date, theme, when: 'today' as const, tasks };
    }
    if (!theme) return { date, theme, when: 'next' as const, tasks: [] };
    const tasks = generateDailyPlan({
      ...base,
      date,
      theme,
      progress: { ...base.progress, lessons },
      trainedLines,
      lessonDrafts,
      solvedIds: solved,
      // Solo los repasos que vencen justo ese día: los anteriores se hacen antes
      dueCards: cards.filter((c) => c.due === date),
    }).filter(isCoreTask);
    assumeDone(tasks, date);
    return { date, theme, when: 'next' as const, tasks };
  });
}
