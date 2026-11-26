import { useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { modules } from '@/content/registry';
import { usePuzzles } from '@/hooks/usePuzzles';
import { now, todayKey } from '@/lib/date';
import { cachedUnseen, topUpInBackground } from '@/services/lichess/lichessPuzzles';
import { difficultyStretch, effectiveLevel, generateDailyPlan, isCoreTask, practiceCountFor } from '@/services/scheduler/dailyPlan';
import { isDue } from '@/services/scheduler/sm2';
import { useGameStore } from '@/store/gameStore';
import { useProgressStore } from '@/store/progressStore';
import { useReviewStore } from '@/store/reviewStore';
import { useSettingsStore } from '@/store/settingsStore';
import { taskLink } from '../taskLink';

/** Plan del día: se genera una vez por fecha y queda congelado. */
export function useDailyPlan() {
  const today = todayKey();
  const plan = useGameStore((s) => s.plan);
  const setPlan = useGameStore((s) => s.setPlan);
  const ensureToday = useGameStore((s) => s.ensureToday);
  const tasksDone = useGameStore((s) => (s.daily.date === today ? s.daily.tasksDone : []));
  const rating = useGameStore((s) => s.rating);
  const stats = useGameStore((s) => s.stats);
  const progress = useProgressStore();
  const cards = useReviewStore((s) => s.cards);
  const dailyMinutes = useSettingsStore((s) => s.dailyMinutes);
  const trainingDays = useSettingsStore((s) => s.trainingDays);
  const focusAreas = useSettingsStore((s) => s.focusAreas);
  const favoriteOpening = useSettingsStore((s) => s.favoriteOpening);
  const exploreOpenings = useSettingsStore((s) => s.exploreOpenings);
  const learnedBasics = useSettingsStore((s) => s.learnedBasics);
  const restDay = trainingDays.length > 0 && !trainingDays.includes(now().getDay());

  // El plan se congela por día, pero se regenera si cambia el nivel del
  // test (p. ej. al recalibrar) o la versión del generador.
  const key = `v6:${learnedBasics ? 'b' : 'nb'}:${progress.placementLevel ?? '-'}:${dailyMinutes}:${restDay ? 'rest' : 'train'}:${focusAreas.join('+')}:${favoriteOpening ?? '-'}:${exploreOpenings.join('+')}`;
  const needsNew = !plan || plan.date !== today || plan.key !== key;
  const { puzzles, ready: puzzlesReady } = usePuzzles();

  const building = useRef<string | null>(null);

  useEffect(() => {
    ensureToday();
    if (!needsNew || !puzzlesReady || building.current === `${today}|${key}`) return;
    building.current = `${today}|${key}`;
    const dueCards = Object.values(cards).filter((c) => isDue(c, today));
    const solvedIds = new Set(Object.keys(progress.exercises));
    // Ejercicios inéditos guardados en el dispositivo: sin esperar a la red.
    // El plan se muestra al instante; la caché se reabastece en segundo plano.
    const need = practiceCountFor(effectiveLevel(progress, rating), restDay ? 10 : dailyMinutes);
    const freshPool = cachedUnseen({ rating, exclude: solvedIds }).slice(0, need * 2);
    const build = (fresh: typeof freshPool) =>
      generateDailyPlan({
        date: today,
        modules,
        progress,
        dueCards,
        rating,
        dailyMinutes,
        solvedIds,
        trainedLines: progress.openingLines,
        puzzlePool: puzzles,
        freshPool: fresh,
        focus: focusAreas,
        favoriteOpening,
        exploreOpenings,
        restDay,
        learnedBasics,
        stretch: difficultyStretch(stats.puzzlesSolved, stats.puzzlesAttempted),
      });
    let tasks;
    try {
      tasks = build(freshPool);
    } catch (err) {
      // Nunca dejar la pantalla cargando: reintenta sin ejercicios externos
      console.error('No se pudo generar el plan con ejercicios guardados', err);
      tasks = build([]);
    }
    setPlan(today, tasks, key);
    topUpInBackground(rating, solvedIds);
    // Solo al cambiar de día: el plan queda fijo durante la jornada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsNew, today, key, puzzlesReady]);

  const allTasks = useMemo(() => (plan && plan.date === today ? plan.tasks : []), [plan, today]);
  // Los pasos del plan son los que se pueden completar; las recomendaciones son extras opcionales
  const tasks = useMemo(() => allTasks.filter(isCoreTask), [allTasks]);
  const extras = useMemo(() => allTasks.filter((t) => !isCoreTask(t)), [allTasks]);
  const done = tasks.filter((t) => tasksDone.includes(t.id)).length;
  return {
    tasks,
    extras,
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
  const plan = useGameStore((s) => s.plan);
  const tasksDone = useGameStore((s) => s.daily.tasksDone);
  const core = plan?.tasks.filter(isCoreTask) ?? [];
  const nextTask = taskId ? core.find((t) => t.id !== taskId && !tasksDone.includes(t.id)) : undefined;
  return {
    fromDaily: Boolean(taskId),
    complete: () => {
      if (taskId) dispatch({ type: 'DAILY_TASK_DONE', taskId }, { dailyTotal: core.length });
    },
    /** Siguiente paso pendiente del plan (para seguir la sesión sin volver al Inicio) */
    next: nextTask ? { to: taskLink(nextTask), title: nextTask.title, label: `Siguiente paso: ${nextTask.title}` } : null,
    /** Destino y texto para el botón principal al terminar un paso */
    continueTo: nextTask ? taskLink(nextTask) : '/',
    continueLabel: nextTask ? `Siguiente paso: ${nextTask.title}` : 'Volver al plan de hoy',
  };
}
