import { useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { modules } from '@/content/registry';
import { usePuzzles } from '@/hooks/usePuzzles';
import { now, todayKey } from '@/lib/date';
import { fetchLichessPuzzles } from '@/services/lichess/lichessPuzzles';
import { effectiveLevel, generateDailyPlan, practiceCountFor } from '@/services/scheduler/dailyPlan';
import { isDue } from '@/services/scheduler/sm2';
import { useGameStore } from '@/store/gameStore';
import { useProgressStore } from '@/store/progressStore';
import { useReviewStore } from '@/store/reviewStore';
import { useSettingsStore } from '@/store/settingsStore';

/** Plan del día: se genera una vez por fecha y queda congelado. */
export function useDailyPlan() {
  const today = todayKey();
  const plan = useGameStore((s) => s.plan);
  const setPlan = useGameStore((s) => s.setPlan);
  const ensureToday = useGameStore((s) => s.ensureToday);
  const tasksDone = useGameStore((s) => (s.daily.date === today ? s.daily.tasksDone : []));
  const rating = useGameStore((s) => s.rating);
  const progress = useProgressStore();
  const cards = useReviewStore((s) => s.cards);
  const dailyMinutes = useSettingsStore((s) => s.dailyMinutes);
  const trainingDays = useSettingsStore((s) => s.trainingDays);
  const focusAreas = useSettingsStore((s) => s.focusAreas);
  const favoriteOpening = useSettingsStore((s) => s.favoriteOpening);
  const exploreOpenings = useSettingsStore((s) => s.exploreOpenings);
  const restDay = trainingDays.length > 0 && !trainingDays.includes(now().getDay());

  // El plan se congela por día, pero se regenera si cambia el nivel del
  // test (p. ej. al recalibrar) o la versión del generador.
  const key = `v4:${progress.placementLevel ?? '-'}:${dailyMinutes}:${restDay ? 'rest' : 'train'}:${focusAreas.join('+')}:${favoriteOpening ?? '-'}:${exploreOpenings.join('+')}`;
  const needsNew = !plan || plan.date !== today || plan.key !== key;
  const { puzzles, ready: puzzlesReady } = usePuzzles();

  const building = useRef<string | null>(null);

  useEffect(() => {
    ensureToday();
    if (!needsNew || !puzzlesReady || building.current === `${today}|${key}`) return;
    building.current = `${today}|${key}`;
    const dueCards = Object.values(cards).filter((c) => isDue(c, today));
    const solvedIds = new Set(Object.keys(progress.exercises));
    // Ejercicios nuevos de Lichess para hoy (si no hay red, se usan los incluidos en la app)
    const need = practiceCountFor(effectiveLevel(progress, rating), restDay ? 10 : dailyMinutes);
    fetchLichessPuzzles({
      count: need,
      rating,
      exclude: solvedIds,
      timeoutMs: 5000,
    }).then((freshPool) => {
      const tasks = generateDailyPlan({
        date: today,
        modules,
        progress,
        dueCards,
        rating,
        dailyMinutes,
        solvedIds,
        trainedLines: progress.openingLines,
        puzzlePool: puzzles,
        freshPool,
        focus: focusAreas,
        favoriteOpening,
        exploreOpenings,
        restDay,
      });
      setPlan(today, tasks, key);
    });
    // Solo al cambiar de día: el plan queda fijo durante la jornada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsNew, today, key, puzzlesReady]);

  const tasks = useMemo(() => (plan && plan.date === today ? plan.tasks : []), [plan, today]);
  const done = tasks.filter((t) => tasksDone.includes(t.id)).length;
  return {
    tasks,
    tasksDone,
    done,
    total: tasks.length,
    ratio: tasks.length ? done / tasks.length : 0,
    ready: !needsNew,
    restDay,
    dailyMinutes,
  };
}

/**
 * Para pantallas abiertas desde el plan del día (?daily=<taskId>):
 * devuelve una función que marca la tarea como completada.
 */
export function useCompleteDailyTask() {
  const [params] = useSearchParams();
  const taskId = params.get('daily');
  const dispatch = useGameStore((s) => s.dispatch);
  const total = useGameStore((s) => s.plan?.tasks.length ?? 0);
  return {
    fromDaily: Boolean(taskId),
    complete: () => {
      if (taskId) dispatch({ type: 'DAILY_TASK_DONE', taskId }, { dailyTotal: total });
    },
  };
}
