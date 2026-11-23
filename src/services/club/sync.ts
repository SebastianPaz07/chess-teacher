import { modules } from '@/content/registry';
import { now, todayKey } from '@/lib/date';
import { onGameEvent, useGameStore } from '@/store/gameStore';
import { useProgressStore } from '@/store/progressStore';
import { feedFromEvent } from './feed';
import { clubRepo } from './index';
import { toDailyActivity, toMemberStats } from './mapping';

let started = false;

/** Publica ya mismo mi progreso al club (también se llama tras iniciar sesión). */
export function publishNow() {
  const g = useGameStore.getState();
  const p = useProgressStore.getState();
  return clubRepo
    .publishMyProgress({ stats: toMemberStats(g, p, modules, now().toISOString()), activity: toDailyActivity(g, todayKey()) })
    .catch((e) => console.warn('No se pudo sincronizar con el club', e));
}

/**
 * Sincronización local-first: las stores siguen siendo la fuente de verdad
 * y el club recibe una "foto" con un pequeño retardo tras cada cambio.
 */
export function startClubSync() {
  if (started) return;
  started = true;
  let t: ReturnType<typeof setTimeout> | null = null;
  const schedule = () => {
    if (t) clearTimeout(t);
    t = setTimeout(publishNow, 1500);
  };
  useGameStore.subscribe((s, prev) => {
    if (s.xp !== prev.xp || s.rating !== prev.rating || s.streak !== prev.streak || s.activityLog !== prev.activityLog) schedule();
  });
  useProgressStore.subscribe((s, prev) => {
    if (s.lessons !== prev.lessons) schedule();
  });
  onGameEvent((e, rewards, prev) => {
    for (const d of feedFromEvent(e, rewards, prev)) clubRepo.postFeed(d).catch(() => undefined);
  });
  publishNow();
}
