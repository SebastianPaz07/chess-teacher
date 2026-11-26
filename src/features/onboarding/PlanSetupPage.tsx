import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card, ProgressBar } from '@/components/ui';
import { allOpenings } from '@/content/registry';
import { Icon } from '@/components/ui/Icon';
import type { Level } from '@/content/schema';
import { practiceCountFor } from '@/services/scheduler/dailyPlan';
import { ratingFromElo, type EloSource } from '@/services/scheduler/placement';
import { useAuthStore } from '@/store/authStore';
import { useClubStore } from '@/store/clubStore';
import { useGameStore } from '@/store/gameStore';
import { useProgressStore } from '@/store/progressStore';
import { useSettingsStore, type FocusArea } from '@/store/settingsStore';
import { formatDays, WEEK_DAYS } from './days';
import { OpeningPicker } from './OpeningPicker';
import styles from './PlanSetupPage.module.css';

type LevelChoice = 'keep' | 'new' | 'casual' | 'club' | 'strong' | 'elo' | 'test';

const LEVELS: { id: Exclude<LevelChoice, 'keep' | 'elo' | 'test'>; title: string; detail: string; level: Level; rating: number; icon: string }[] = [
  { id: 'new', title: 'Estoy empezando', detail: 'Sé mover las piezas (o casi).', level: 'principiante', rating: 600, icon: 'piece-pawn' },
  { id: 'casual', title: 'Juego por diversión', detail: 'Conozco las reglas y algunos trucos.', level: 'principiante', rating: 900, icon: 'piece-knight' },
  { id: 'club', title: 'Juego seguido', detail: 'Veo táctica básica y conozco aperturas.', level: 'intermedio', rating: 1300, icon: 'piece-bishop' },
  { id: 'strong', title: 'Juego torneos', detail: 'Calculo variantes y tengo repertorio.', level: 'avanzado', rating: 1750, icon: 'piece-rook' },
];

const FOCUS: { id: FocusArea; title: string; detail: string; icon: string }[] = [
  { id: 'tactica', title: 'Táctica', detail: 'Mates, horquillas, clavadas, cálculo.', icon: 'sword' },
  { id: 'teoria', title: 'Teoría', detail: 'Más lecciones y aperturas cada día.', icon: 'book-open' },
  { id: 'finales', title: 'Finales', detail: 'Peones, torres, conversión de ventaja.', icon: 'flag' },
  { id: 'medio-juego', title: 'Medio juego', detail: 'Ataque, defensa y planes estratégicos.', icon: 'strategy' },
];

const MINUTES = [10, 15, 20, 30, 45, 60];
const MAX_EXPLORE = 3;
type StepKey = 'level' | 'focus' | 'openings' | 'explore' | 'time' | 'days' | 'summary';
const LEVEL_NAME: Record<Level, string> = { principiante: 'principiante', intermedio: 'intermedio', avanzado: 'avanzado' };

/** Plan de entrenamiento personalizado: nivel → tiempo por día → días de la semana → resumen. */
export function PlanSetupPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Llegada desde un enlace de invitación a un club: al terminar el plan se vuelve a la invitación
  const nextParam = params.get('next');
  const joinNext = nextParam && /^\/(unirse|crear-club)\//.test(nextParam) ? nextParam : null;
  const settings = useSettingsStore();
  const rating = useGameStore((s) => s.rating);
  const placementDone = useGameStore((s) => s.stats.placementDone);
  const placementLevel = useProgressStore((s) => s.placementLevel);
  const setPlacement = useProgressStore((s) => s.setPlacement);
  const dispatch = useGameStore((s) => s.dispatch);

  const firstRun = !settings.onboarded;
  const clubStatus = useClubStore((s) => s.status);
  const auth = useAuthStore();
  // Con Supabase manda la sesión real; en modo demo, la sesión del club simulado
  const signedIn = auth.enabled ? auth.status === 'signed-in' : clubStatus !== 'signed-out' && clubStatus !== 'loading';
  const hasLevel = placementDone || Boolean(placementLevel);
  const [step, setStep] = useState(0);
  const [focus, setFocus] = useState<FocusArea[]>(settings.focusAreas);
  const [favorite, setFavorite] = useState<string | null>(settings.favoriteOpening);
  const [explore, setExplore] = useState<string[]>(settings.exploreOpenings);
  const [choice, setChoice] = useState<LevelChoice | null>(hasLevel ? 'keep' : null);
  const [elo, setElo] = useState('');
  const [source, setSource] = useState<EloSource>('lichess');
  const [minutes, setMinutes] = useState(settings.onboarded ? settings.dailyMinutes : 20);
  const [days, setDays] = useState<number[]>(settings.onboarded ? settings.trainingDays : [1, 2, 3, 4, 5]);

  const eloNum = Number(elo);
  const resolved: { level: Level; rating: number } | null =
    choice === 'keep'
      ? { level: placementLevel ?? 'principiante', rating }
      : choice === 'elo'
        ? eloNum >= 100
          ? ratingFromElo(eloNum, source)
          : null
        : choice === 'test'
          ? { level: 'principiante', rating: 800 }
          : (LEVELS.find((l) => l.id === choice) ?? null);

  // Quien ya sabe lo básico puede afinar el plan: qué reforzar y qué apertura repasar
  const hasBasics = Boolean(resolved) && choice !== 'new' && choice !== 'test';
  const steps: StepKey[] = ['level', ...(hasBasics ? (['focus', 'openings', 'explore'] as StepKey[]) : []), 'time', 'days', 'summary'];
  const key = steps[Math.min(step, steps.length - 1)];
  const last = step >= steps.length - 1;
  // Cada paso empieza arriba, aunque el anterior fuera una lista larga
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);
  const canNext = key === 'level' ? Boolean(resolved) : key === 'days' ? days.length > 0 : true;
  const favOpening = allOpenings.find((o) => o.id === favorite);
  const explored = explore.filter((id) => id !== favorite);
  const weekly = minutes * days.length;
  const level = resolved?.level ?? 'principiante';
  const exercises = practiceCountFor(level, minutes);

  const save = () => {
    settings.update({ dailyMinutes: minutes, trainingDays: [...days].sort(), onboarded: true, learnedBasics: choice !== 'new', focusAreas: hasBasics ? focus : [], favoriteOpening: hasBasics ? favorite : null, exploreOpenings: hasBasics ? explored : [] });
    if (choice && choice !== 'keep' && choice !== 'test' && resolved) {
      setPlacement(resolved.level);
      dispatch({ type: 'PLACEMENT_DONE', rating: resolved.rating, level: resolved.level });
    }
    const dest = joinNext ?? (choice === 'test' ? '/test-nivel' : choice === 'new' ? '/leccion/fund-01-tablero' : '/');
    // Primer arranque sin cuenta: invitamos a registrarse (se puede continuar sin cuenta)
    navigate(firstRun && !signedIn ? `/entrar?inicio=1&next=${encodeURIComponent(dest)}` : dest, { replace: true });
  };

  const toggleFocus = (f: FocusArea) => setFocus((fs) => (fs.includes(f) ? fs.filter((x) => x !== f) : [...fs, f]));
  const toggleExplore = (id: string) => setExplore((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : xs.length >= MAX_EXPLORE ? xs : [...xs, id]));
  // La que se va a repasar deja libre su cupo en «conocer otras»
  const chooseFavorite = (id: string | null) => {
    setFavorite(id);
    setExplore((xs) => xs.filter((x) => x !== id));
  };
  const toggleDay = (d: number) => setDays((ds) => (ds.includes(d) ? ds.filter((x) => x !== d) : [...ds, d]));

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <p className="eyebrow" style={{ margin: 0 }}>
          Tu plan de entrenamiento · paso {step + 1} de {steps.length}
        </p>
        <ProgressBar value={(step + 1) / steps.length} height={3} />
      </header>

      {key === 'level' && (
        <section className={styles.step}>
          <h1 className={styles.title}>¿Cuál es tu nivel hoy?</h1>
          <p className="muted">Así empezamos donde te corresponde, sin repetir lo que ya sabes.</p>
          <div className={styles.options} role="radiogroup">
            {hasLevel && (
              <Option selected={choice === 'keep'} onClick={() => setChoice('keep')} icon="check-circle" title="Mantener mi nivel actual" detail={`Rating de entrenamiento ${rating}${placementLevel ? ` · ${LEVEL_NAME[placementLevel]}` : ''}`} />
            )}
            {LEVELS.map((l) => (
              <Option key={l.id} selected={choice === l.id} onClick={() => setChoice(l.id)} icon={l.icon} title={l.title} detail={l.detail} />
            ))}
            <Option selected={choice === 'elo'} onClick={() => setChoice('elo')} icon="chart" title="Tengo Elo" detail="Lichess, Chess.com o FIDE." />
            {choice === 'elo' && (
              <div className={styles.elo}>
                <input type="number" inputMode="numeric" min={100} max={3000} value={elo} onChange={(e) => setElo(e.target.value)} placeholder="Ej. 1450" aria-label="Tu Elo" autoFocus />
                <select value={source} onChange={(e) => setSource(e.target.value as EloSource)} aria-label="Plataforma">
                  <option value="lichess">Lichess</option>
                  <option value="chesscom">Chess.com</option>
                  <option value="fide">FIDE</option>
                </select>
              </div>
            )}
            <Option selected={choice === 'test'} onClick={() => setChoice('test')} icon="compass" title="No lo sé: hazme un test" detail="10 ejercicios adaptativos al terminar el plan." />
          </div>
        </section>
      )}

      {key === 'focus' && (
        <section className={styles.step}>
          <h1 className={styles.title}>¿Qué quieres reforzar?</h1>
          <p className="muted">Elige una o varias áreas y le damos más peso en tu plan. Si no eliges ninguna, el plan es equilibrado.</p>
          <div className={styles.options}>
            {FOCUS.map((f) => (
              <Option key={f.id} multi selected={focus.includes(f.id)} onClick={() => toggleFocus(f.id)} icon={f.icon} title={f.title} detail={f.detail} />
            ))}
          </div>
        </section>
      )}

      {key === 'openings' && (
        <section className={styles.step}>
          <h1 className={styles.title}>¿Qué apertura quieres repasar?</h1>
          <p className="muted">Elige una y la practicas más en tu plan.</p>
          <OpeningPicker
            label="Apertura a repasar"
            selected={favorite ? [favorite] : []}
            onToggle={chooseFavorite}
            initialSide={favOpening?.side}
            none={{ label: 'Ninguna por ahora', onClick: () => chooseFavorite(null) }}
          />
        </section>
      )}

      {key === 'explore' && (
        <section className={styles.step}>
          <h1 className={styles.title}>¿Quieres conocer otras?</h1>
          <p className="muted">Opcional: hasta {MAX_EXPLORE} aperturas nuevas.</p>
          <p className={styles.picked} aria-live="polite">
            <strong>
              {explored.length} de {MAX_EXPLORE}
            </strong>
            {explored.length > 0 && ` · ${explored.map((id) => allOpenings.find((o) => o.id === id)?.name).join(', ')}`}
          </p>
          <OpeningPicker label="Aperturas por conocer" multi max={MAX_EXPLORE} selected={explored} onToggle={toggleExplore} exclude={favorite} initialSide={favOpening?.side} />
        </section>
      )}

      {key === 'time' && (
        <section className={styles.step}>
          <h1 className={styles.title}>¿Cuánto tiempo tienes al día?</h1>
          <p className="muted">Mejor poco y constante que mucho de vez en cuando.</p>
          <div className={styles.grid3}>
            {MINUTES.map((m) => (
              <button key={m} type="button" className={[styles.tile, minutes === m && styles.tileOn].filter(Boolean).join(' ')} onClick={() => setMinutes(m)} aria-pressed={minutes === m}>
                <strong>{m}</strong>
                <span>min</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {key === 'days' && (
        <section className={styles.step}>
          <h1 className={styles.title}>¿Qué días entrenarás?</h1>
          <p className="muted">Los demás días son de descanso: tu racha no se rompe por no practicar en ellos.</p>
          <div className={styles.days}>
            {WEEK_DAYS.map((d) => (
              <button key={d.value} type="button" className={[styles.day, days.includes(d.value) && styles.dayOn].filter(Boolean).join(' ')} onClick={() => toggleDay(d.value)} aria-pressed={days.includes(d.value)} aria-label={d.long}>
                {d.short}
              </button>
            ))}
          </div>
          <div className="row">
            <Button size="sm" variant="ghost" onClick={() => setDays([1, 2, 3, 4, 5])}>
              Entre semana
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDays([1, 3, 5])}>
              3 días
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDays([0, 1, 2, 3, 4, 5, 6])}>
              Todos
            </Button>
          </div>
        </section>
      )}

      {key === 'summary' && (
        <section className={styles.step}>
          <h1 className={styles.title}>Tu plan</h1>
          <Card tone="primary">
            <div className={styles.summary}>
              <div>
                <strong className={styles.big}>{minutes}</strong>
                <span>min por sesión</span>
              </div>
              <div>
                <strong className={styles.big}>{days.length}</strong>
                <span>días · {formatDays(days)}</span>
              </div>
              <div>
                <strong className={styles.big}>{weekly}</strong>
                <span>min por semana</span>
              </div>
            </div>
          </Card>
          <Card title="Cada sesión" icon="calendar">
            <ul className={styles.list}>
              <li>
                <Icon name="review" /> Repaso de lo que estás por olvidar
              </li>
              {minutes > 10 && (
                <li>
                  <Icon name="book-open" /> Una lección del curso ({LEVEL_NAME[level]})
                </li>
              )}
              <li>
                <Icon name="puzzle" /> {exercises} ejercicios a tu nivel
              </li>
              {minutes > 10 && (
                <li>
                  <Icon name="books" /> Una línea de apertura{favOpening ? `: sobre todo ${favOpening.name}` : ''}
                </li>
              )}
              {hasBasics && focus.length > 0 && (
                <li>
                  <Icon name="target" /> Más peso en: {focus.map((f) => FOCUS.find((x) => x.id === f)?.title.toLowerCase()).join(', ')}
                </li>
              )}
              {minutes >= 20 && level !== 'principiante' && (
                <li>
                  <Icon name="classic" /> Partida clásica «adivina la jugada» (algunos días)
                </li>
              )}
            </ul>
            <p className="muted" style={{ margin: 'var(--space-3) 0 0', fontSize: '0.88rem' }}>
              Los días de descanso tendrás una sesión ligera opcional de 10 min. Puedes cambiar el plan cuando quieras en Ajustes.
            </p>
          </Card>
        </section>
      )}

      <footer className={[styles.footer, firstRun && styles.footerBare].filter(Boolean).join(' ')}>
        {step > 0 ? (
          <Button variant="ghost" onClick={() => setStep(step - 1)}>
            Atrás
          </Button>
        ) : settings.onboarded ? (
          <Button variant="ghost" to="/">
            Cancelar
          </Button>
        ) : (
          <span />
        )}
        {!last ? (
          <Button size="lg" onClick={() => setStep(step + 1)} disabled={!canNext} icon="arrow-right">
            Siguiente
          </Button>
        ) : (
          <Button size="lg" onClick={save} icon="play">
            {choice === 'test' ? 'Guardar y hacer el test' : 'Empezar mi plan'}
          </Button>
        )}
      </footer>
    </div>
  );
}

function Option({ selected, onClick, icon, title, detail, multi }: { selected: boolean; onClick: () => void; icon: string; title: string; detail: string; multi?: boolean }) {
  return (
    <button type="button" role={multi ? 'checkbox' : 'radio'} aria-checked={selected} className={[styles.option, selected && styles.optionOn].filter(Boolean).join(' ')} onClick={onClick}>
      <span className={styles.optionIcon}>
        <Icon name={icon} />
      </span>
      <span className={styles.optionText}>
        <strong>{title}</strong>
        <span>{detail}</span>
      </span>
      <span aria-hidden>{selected ? <Icon name="check" /> : null}</span>
    </button>
  );
}
