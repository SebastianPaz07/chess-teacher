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

/** Mínimo entre envíos: el club no necesita tiempo real, sí no saturar la base de datos. */
const MIN_INTERVAL_MS = 2 * 60_000;
/** Espera tras el último cambio antes de enviar (agrupa ráfagas de ejercicios). */
const SETTLE_MS = 20_000;

/**
 * Sincronización local-first: las stores siguen siendo la fuente de verdad
 * y el club recibe una "foto" agrupada: tras una pausa de 20 s sin cambios,
 * y nunca más de una vez cada 2 minutos. Al cerrar o ocultar la pestaña se
 * envía lo pendiente. Los segundos de estudio por sí solos no disparan envíos.
 */
export function startClubSync() {
  if (started) return;
  started = true;
  let t: ReturnType<typeof setTimeout> | null = null;
  let dirty = false;
  let lastSent = 0;

  const flush = () => {
    if (t) clearTimeout(t);
    t = null;
    if (!dirty) return;
    dirty = false;
    lastSent = Date.now();
    void publishNow();
  };
  const schedule = () => {
    dirty = true;
    if (t) clearTimeout(t);
    const wait = Math.max(SETTLE_MS, lastSent + MIN_INTERVAL_MS - Date.now());
    t = setTimeout(flush, wait);
  };

  useGameStore.subscribe((s, prev) => {
    const a = s.activityLog?.[todayKey()];
    const b = prev.activityLog?.[todayKey()];
    const activityChanged = a?.puzzles !== b?.puzzles || a?.lessons !== b?.lessons || a?.reviews !== b?.reviews;
    if (s.xp !== prev.xp || s.rating !== prev.rating || s.streak !== prev.streak || activityChanged) schedule();
  });
  useProgressStore.subscribe((s, prev) => {
    if (s.lessons !== prev.lessons) schedule();
  });
  onGameEvent((e, rewards, prev) => {
    for (const d of feedFromEvent(e, rewards, prev)) clubRepo.postFeed(d).catch(() => undefined);
  });
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());
  window.addEventListener('pagehide', flush);
  // El primer envío lo hace el store del club cuando confirma que hay club
  lastSent = Date.now();
}
