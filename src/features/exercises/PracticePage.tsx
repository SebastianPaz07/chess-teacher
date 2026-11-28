import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { PieceScene } from '@/components/illustrations/PieceScene';
import { Button, EmptyState, Loader } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { loadedPuzzles, loadPuzzlesFor, puzzleThemeCounts, puzzleTotal } from '@/content/puzzles';
import { getExercise, modules } from '@/content/registry';
import type { Exercise } from '@/content/schema';
import { useCompleteDailyTask } from '@/features/daily-plan/hooks/useDailyPlan';
import { useExercisesReady } from '@/hooks/usePuzzles';
import { pickAdaptive, pickVaried } from '@/services/game/rating';
import { motifOf } from '@/services/lichess/themes';
import { takeFresh } from '@/services/lichess/lichessPuzzles';
import { isModuleUnlocked, masteryRatio } from '@/services/scheduler/progression';
import { useGameStore } from '@/store/gameStore';
import { useProgressStore } from '@/store/progressStore';
import { useSettingsStore } from '@/store/settingsStore';
import { THEME_GROUPS, themeGroup, themeLabel } from './themes';
import { FALLBACK_INFO, THEME_INFO } from './themeInfo';
import { ExerciseSession, type SessionResult } from './components/ExerciseSession';
import { SessionSummary } from './components/SessionSummary';
import styles from './PracticePage.module.css';

const SESSION_SIZE = 5;

export function PracticePage() {
  const [params] = useSearchParams();
  const daily = useCompleteDailyTask();
  const plan = useGameStore((s) => s.plan);
  const rating = useGameStore((s) => s.rating);
  const learnedBasics = useSettingsStore((s) => s.learnedBasics);
  const progress = useProgressStore();
  /** `undefined`: nada elegido todavía; `null`: mezcla; texto: un tema */
  const [theme, setTheme] = useState<string | null | undefined>(undefined);
  const [session, setSession] = useState<Exercise[] | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SessionResult[] | null>(null);
  const [round, setRound] = useState(0);
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(['tactica']));
  const toggleGroup = (id: string) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  /** Ejercicios de las lecciones desbloqueadas (van incluidos en la app) */
  const local = useMemo(() => modules.filter((m) => isModuleUnlocked(m, modules, progress)).flatMap((m) => m.exercises), [progress]);

  // La lista de temas sale del resumen: no hace falta cargar ningún puzzle
  const themes = useMemo(() => {
    const count: Record<string, number> = { ...puzzleThemeCounts };
    local.forEach((e) => e.themes.forEach((t) => (count[t] = (count[t] ?? 0) + 1)));
    return Object.entries(count).sort((a, b) => b[1] - a[1]);
  }, [local]);

  /** Al elegir un tema se van trayendo sus ejercicios, para que «Empezar» no espere */
  const choose = (t: string) => {
    setTheme(t);
    loadPuzzlesFor(rating, t, new Set(Object.keys(progress.exercises))).catch(() => undefined);
  };

  // Sesión del plan diario: se cargan solo sus ejercicios
  const dailyIds = params.get('daily') === 'practice' ? plan?.tasks.find((t) => t.kind === 'practice') : undefined;
  const ready = useExercisesReady(dailyIds?.kind === 'practice' ? dailyIds.exerciseIds : []);
  const dailySet = useMemo(() => {
    if (!ready || !dailyIds || dailyIds.kind !== 'practice') return null;
    const found = dailyIds.exerciseIds.map(getExercise).filter((e): e is Exercise => Boolean(e));
    if (found.length >= dailyIds.exerciseIds.length) return found;
    // Faltan ejercicios (p. ej. se limpió la caché del navegador): se completan con otros del
    // mismo nivel para que la sesión del plan nunca se pierda ni quede sin registrar.
    const have = new Set(found.map((e) => e.id));
    const seen = new Set(Object.keys(progress.exercises));
    const extra = pickAdaptive(
      // Si faltaba alguno, `useExercisesReady` ya cargó todos los puzzles
      [...local, ...(loadedPuzzles() ?? [])].filter((e) => !have.has(e.id)),
      rating,
      dailyIds.exerciseIds.length - found.length,
      seen,
    );
    return [...found, ...extra];
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // Fija la sesión: no debe cambiar mientras resuelves
  }, [dailyIds, ready]);

  /** Ronda nueva: primero ejercicios inéditos de Lichess; si no hay red, los del pool que aún no has visto. */
  const start = async () => {
    setLoading(true);
    // Sin tema elegido (seguir practicando tras el plan del día) toca la mezcla
    const picked = theme ?? null;
    const seen = new Set(Object.keys(progress.exercises));
    // En la mezcla, solo una parte llega de Lichess y el resto se elige por motivos distintos
    const [fresh, stored] = await Promise.all([
      takeFresh({ count: picked ? SESSION_SIZE : 2, rating, theme: picked, exclude: seen, timeoutMs: 4000 }),
      // Si no se pueden cargar, quedan los de las lecciones
      loadPuzzlesFor(rating, picked, seen).catch((): Exercise[] => []),
    ]);
    const pool = [...local, ...stored];
    const filtered = (picked ? pool.filter((e) => e.themes.includes(picked)) : pool).filter((e) => !fresh.some((f) => f.id === e.id));
    const need = Math.max(0, SESSION_SIZE - fresh.length);
    const fill = picked ? pickAdaptive(filtered, rating, need, seen) : pickVaried(filtered, rating, need, seen, Math.random, motifOf, 1, fresh);
    setSession([...fresh, ...fill]);
    setRetrying(false);
    setResults(null);
    setRound((r) => r + 1);
    setLoading(false);
  };

  /** Repetir ahora los ejercicios que fallaste en la ronda. */
  const retryMistakes = (failed: Exercise[]) => {
    setSession(failed);
    setRetrying(true);
    setResults(null);
    setRound((r) => r + 1);
  };

  const active = session ?? (dailySet && !results ? dailySet : null);

  // Principiante absoluto: primero aprende a mover las piezas
  if (!learnedBasics) {
    return (
      <EmptyState
        icon="piece-pawn-w"
        title="Primero, aprende a mover las piezas"
        description="Antes de resolver ejercicios necesitas conocer el tablero y cómo se mueve cada pieza. Son solo unos minutos."
        action={<Button size="lg" to="/leccion/fund-01-tablero">Empezar la lección</Button>}
      />
    );
  }

  if (loading) return <Loader label="Buscando ejercicios nuevos…" />;

  if (results) {
    return (
      <SessionSummary
        results={results}
        onRetryMistakes={retryMistakes}
        primary={daily.fromDaily ? { label: daily.continueLabel, to: daily.continueTo } : { label: 'Otra ronda con ejercicios nuevos', onClick: start }}
        secondary={daily.fromDaily ? { label: 'Seguir practicando', onClick: start } : { label: 'Volver al inicio', to: '/' }}
      />
    );
  }

  if (active?.length) {
    return (
      <ExerciseSession
        key={round}
        exercises={active}
        context={retrying ? 'review' : daily.fromDaily && !session ? 'daily' : 'practice'}
        onComplete={(r) => {
          if (daily.fromDaily && !session) daily.complete();
          setSession(null);
          setRetrying(false);
          setResults(r);
        }}
      />
    );
  }

  if (!ready) return <Loader />;
  const total = local.length + puzzleTotal;
  if (!total) return <EmptyState title="Aún no hay ejercicios desbloqueados" action={<Button to="/mapa/capitulos">Ver las lecciones</Button>} />;

  const grouped = THEME_GROUPS.map((g) => ({ ...g, items: themes.filter(([t]) => themeGroup(t) === g.id) })).filter((g) => g.items.length > 0);
  const selectedCount = theme === undefined ? 0 : theme === null ? total : (themes.find(([t]) => t === theme)?.[1] ?? 0);

  return (
    <div className={styles.page}>
      <PageHeader compact icon="puzzle" title="Resolver ejercicios" subtitle={`Siempre ejercicios nuevos, a tu nivel (rating ${rating}). Abre un tema y elige el que quieras practicar.`} />
      <div className={styles.group} role="radiogroup" aria-label="Tema de práctica">
        <button type="button" role="radio" aria-checked={theme === null} className={[styles.theme, styles.mix, theme === null && styles.on].filter(Boolean).join(' ')} onClick={() => setTheme(null)}>
          <PieceScene size={64} scene={{ b: 'r.bqk/...../..N../.P..B/R..QK', a: ['2,2>3,0'] }} />
          <span className={styles.themeBody}>
            <span className={styles.themeName}>Mezcla de todos los temas</span>
            <span className={styles.themeDesc}>Un poco de todo: la mejor forma de entrenar si no sabes por dónde empezar.</span>
          </span>
          <Radio on={theme === null} />
        </button>
        {grouped.map((g) => {
          const isOpen = openGroups.has(g.id) || g.items.some(([t]) => t === theme);
          const panelId = `group-${g.id}`;
          return (
            <section key={g.id} className={styles.accordion} aria-label={g.label}>
              <button type="button" className={styles.groupToggle} onClick={() => toggleGroup(g.id)} aria-expanded={isOpen} aria-controls={panelId}>
                <span className={styles.groupIcon}>
                  <Icon name={GROUP_ICON[g.id] ?? 'puzzle'} />
                </span>
                <span className={styles.groupTexts}>
                  <span className={styles.groupTitle}>{g.label}</span>
                  {g.description && <span className={styles.groupHint}>{g.description}</span>}
                </span>
                <span className={styles.groupCount}>{g.items.length}</span>
                <Icon name="caret-down" className={[styles.caret, isOpen && styles.caretOpen].filter(Boolean).join(' ')} />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div id={panelId} key="panel" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} style={{ overflow: 'hidden' }}>
                    <div className={styles.grid}>
                      {g.items.map(([t, n], i) => {
                        const m = progress.mastery[t];
                        const ratio = m && m.total > 0 ? masteryRatio(m) : null;
                        const on = theme === t;
                        const info = THEME_INFO[t] ?? FALLBACK_INFO;
                        return (
                          <motion.button
                            key={t}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            className={[styles.theme, on && styles.on].filter(Boolean).join(' ')}
                            onClick={() => choose(t)}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(i, 6) * 0.04 }}
                          >
                            <PieceScene size={84} scene={info.scene} />
                            <span className={styles.themeBody}>
                              <span className={styles.themeTop}>
                                <span className={styles.themeName}>{themeLabel(t)}</span>
                                <Radio on={on} />
                              </span>
                              <span className={styles.themeDesc}>{info.description}</span>
                              <span className={styles.themeMeta}>
                                <span>{n} disponibles</span>
                                {ratio !== null && (
                                  <span title={`Has intentado ${m?.total ?? 0} ejercicios con ${Math.round(ratio * 100)}% de aciertos`}>
                                    {Math.round(ratio * 100)}% de {m?.total ?? 0}
                                  </span>
                                )}
                              </span>
                              {ratio !== null && (
                                <span className={styles.mastery} aria-hidden>
                                  <span style={{ width: `${Math.round(ratio * 100)}%` }} />
                                </span>
                              )}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          );
        })}
      </div>
      <div className={styles.start}>
        <Button size="lg" block onClick={start} icon="play" disabled={selectedCount === 0}>
          {theme === undefined ? 'Elige un tema para empezar' : `Empezar ${SESSION_SIZE} ejercicios${theme ? ` de ${themeLabel(theme).toLowerCase()}` : ''}`}
        </Button>
      </div>
    </div>
  );
}

const GROUP_ICON: Record<string, string> = { tactica: 'crosshair', ataque: 'sword', finales: 'flag', partida: 'books', ventaja: 'scales', otros: 'puzzle' };

/** Indicador de selección: círculo vacío o marcado. */
function Radio({ on }: { on: boolean }) {
  return <span className={[styles.radio, on && styles.radioOn].filter(Boolean).join(' ')}>{on && <Icon name="check" size="0.85em" />}</span>;
}
