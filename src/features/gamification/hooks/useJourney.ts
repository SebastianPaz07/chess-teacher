import { todayKey } from '@/lib/date';
import { daysLearning, journeyMessage, studyLabel, studySeconds } from '@/services/game/journey';
import { useGameStore } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';

/** Frase de trayectoria («Llevas 3 semanas…») y tiempo total de estudio. */
export function useJourney() {
  const history = useGameStore((s) => s.history);
  const activityLog = useGameStore((s) => s.activityLog);
  const startedAt = useSettingsStore((s) => s.startedAt);
  const fromZero = useSettingsStore((s) => s.startedFromZero);
  const days = daysLearning({ startedAt, history, activityLog }, todayKey());
  const seconds = studySeconds(activityLog);
  return { message: journeyMessage(days, fromZero), studied: studyLabel(seconds) };
}
