import { getLesson, getModule } from '@/content/registry';
import type { GameState } from '@/services/game/engine';
import type { GameEvent, Reward } from '@/services/game/events';
import type { FeedKind } from './types';

export interface FeedDraft {
  kind: FeedKind;
  icon: string;
  text: string;
}

const STREAK_MILESTONES = [3, 7, 14, 21, 30, 50, 100, 200, 365];

/**
 * Qué publica el club de mi actividad. Solo lo destacable: así el feed
 * cuenta historias ("subió de nivel") y no cada ejercicio suelto.
 */
export function feedFromEvent(e: GameEvent, rewards: Reward[], prev: Pick<GameState, 'stats'>): FeedDraft[] {
  const out: FeedDraft[] = [];
  if (e.type === 'LESSON_COMPLETED') {
    const title = getLesson(e.lessonId)?.title ?? 'una lección';
    out.push({ kind: 'lesson', icon: 'book-open', text: `completó la lección «${title}»${e.mistakes === 0 ? ' sin errores' : ''}` });
  }
  if (e.type === 'MODULE_COMPLETED') out.push({ kind: 'module', icon: 'medal', text: `terminó el módulo «${getModule(e.moduleId)?.title ?? e.moduleId}»` });
  if (e.type === 'RUSH_FINISHED' && e.score > prev.stats.rushBest && e.score >= 5) out.push({ kind: 'rush', icon: 'lightning', text: `batió su récord de Rush táctico: ${e.score} puntos` });
  for (const r of rewards) {
    if (r.kind === 'level-up') out.push({ kind: 'level', icon: r.newRank ? r.rankIcon : 'crown', text: r.newRank ? `ascendió a ${r.rankName} (nivel ${r.level})` : `subió al nivel ${r.level}` });
    if (r.kind === 'achievement' && !['challenge-1'].includes(r.id)) out.push({ kind: 'achievement', icon: r.icon, text: `desbloqueó el logro «${r.title}»` });
    if (r.kind === 'streak' && STREAK_MILESTONES.includes(r.days)) out.push({ kind: 'streak', icon: 'fire', text: `lleva una racha de ${r.days} días` });
  }
  return out;
}
