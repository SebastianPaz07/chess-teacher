import { useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { loadPuzzlesNear } from '@/content/puzzles';
import { modules } from '@/content/registry';
import type { Exercise } from '@/content/schema';
import { now, todayKey } from '@/lib/date';
import { cachedUnseen } from '@/services/lichess/lichessPuzzles';
import { difficultyStretch, effectiveLevel, generateDailyPlan, isCoreTask, practiceCountFor } from '@/services/scheduler/dailyPlan';
import { isDue } from '@/services/scheduler/sm2';
import { useGameStore } from '@/store/gameStore';
import { useProgressStore } from '@/store/progressStore';
import { useReviewStore } from '@/store/reviewStore';
import { useSettingsStore } from '@/store/settingsStore';
import { taskLink } from '../taskLink';
import { useWeekThemes } from './useWeekThemes';

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
  const { themes } = useWeekThemes();
  const theme = learnedBasics ? (themes[today] ?? null) : null;

  // El plan se congela por día, pero se regenera si cambia el nivel del
  // test (p. ej. al recalibrar) o la versión del generador.
  const key = `v8:${theme ?? '-'}:${learnedBasics ? 'b' : 'nb'}:${progress.placementLevel ?? '-'}:${dailyMinutes}:${restDay ? 'rest' : 'train'}:${focusAreas.join('+')}:${favoriteOpening ?? '-'}:${exploreOpenings.join('+')}`;
  const needsNew = !plan || plan.date !== today || plan.key !== key;

  const building = useRef<string | null>(null);

  useEffect(() => {
    ensureToday();
    const tag = `${today}|${key}`;
    if (!needsNew || building.current === tag) return;
    building.current = tag;
    const dueCards = Object.values(cards).filter((c) => isDue(c, today));
    const solvedIds = new Set(Object.keys(progress.exercises));
    // Ejercicios inéditos guardados en el dispositivo: el plan no consulta la red
    const need = practiceCountFor(effectiveLevel(progress, rating), restDay ? 10 : dailyMinutes);
    const freshPool = cachedUnseen({ rating, exclude: solvedIds }).slice(0, need * 2);
    const stretch = difficultyStretch(stats.puzzlesSolved, stats.puzzlesAttempted);
    const build = (puzzles: Exercise[], fresh: typeof freshPool) =>
      generateDailyPlan({
        date: today,
        modules,
        progress,
        dueCards,
        rating,
        dailyMinutes,
        solvedIds,
        trainedLines: progress.openingLines,
        lessonDrafts: progress.lessonDrafts,
        puzzlePool: puzzles,
        freshPool: fresh,
        focus: focusAreas,
        favoriteOpening,
        exploreOpenings,
        restDay,
        learnedBasics,
        stretch,
        theme,
      });
    // Quien aún no sabe mover las piezas no tiene ejercicios en su plan
    const nearby = learnedBasics ? loadPuzzlesNear(rating + stretch).catch((): Exercise[] => []) : Promise.resolve([]);
    void nearby.then((puzzles) => {
      // Mientras cargaba pudo cambiar el plan pedido
      if (building.current !== tag) return;
      let tasks;
      try {
        tasks = build(puzzles, freshPool);
      } catch (err) {
        // Nunca dejar la pantalla cargando: reintenta sin ejercicios externos
        console.error('No se pudo generar el plan con ejercicios guardados', err);
        tasks = build(puzzles, []);
      }
      setPlan(today, tasks, key);
    });
    // Solo al cambiar de día: el plan queda fijo durante la jornada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsNew, today, key]);

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
    theme,
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
