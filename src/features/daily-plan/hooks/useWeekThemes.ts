import { useEffect, useMemo } from 'react';
import { todayKey, weekStart } from '@/lib/date';
import { effectiveLevel } from '@/services/scheduler/dailyPlan';
import { weakTopics } from '@/services/scheduler/progression';
import { weekThemes } from '@/services/scheduler/weekPlan';
import { useGameStore } from '@/store/gameStore';
import { useProgressStore } from '@/store/progressStore';
import { useSettingsStore } from '@/store/settingsStore';

/** Temas de la semana en curso: se fijan al empezarla y solo cambian si cambias tu plan. */
export function useWeekThemes() {
  const start = weekStart(todayKey());
  const stored = useGameStore((s) => s.week);
  const setWeek = useGameStore((s) => s.setWeek);
  const rating = useGameStore((s) => s.rating);
  const progress = useProgressStore();
  const trainingDays = useSettingsStore((s) => s.trainingDays);
  const focus = useSettingsStore((s) => s.focusAreas);
  const favorite = useSettingsStore((s) => s.favoriteOpening);
  const explore = useSettingsStore((s) => s.exploreOpenings);

  const level = effectiveLevel(progress, rating);
  const key = `v1:${level}:${trainingDays.join('')}:${focus.join('+')}:${favorite ?? '-'}:${explore.join('+')}`;
  const valid = stored && stored.weekStart === start && stored.key === key;

  const themes = useMemo(
    () => (valid ? stored.themes : weekThemes({ weekStart: start, level, trainingDays, focus, weak: weakTopics(progress), hasOpening: Boolean(favorite) || explore.length > 0 })),
    // Los puntos débiles solo cuentan al armar la semana
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [valid, stored, start, key],
  );

  useEffect(() => {
    if (!valid) setWeek({ weekStart: start, key, themes });
  }, [valid, start, key, themes, setWeek]);

  return { themes, weekStart: start, level };
}
