import { motion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, EmptyState, Modal, Skeleton } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { clubRepo, type Challenge, type ChallengeKind, type MemberSummary } from '@/services/club';
import { formatMs, timeAgo, timeLeft } from '../format';
import { Avatar } from './Avatar';
import styles from '../club.module.css';

interface ItemProps {
  c: Challenge;
  meId: string;
  members: Map<string, MemberSummary>;
  onRematch?: (opponentId: string, rematchOf: string) => void;
}

/** Un reto: quién contra quién, estado y acción siguiente. */
export function ChallengeItem({ c, meId, members, onRematch }: ItemProps) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const rivalId = c.challengerId === meId ? c.opponentId : c.challengerId;
  const rival = members.get(rivalId)?.member;
  const me = members.get(meId)?.member;
  const mine = c.results.find((r) => r.memberId === meId);
  const theirs = c.results.find((r) => r.memberId === rivalId);
  const iChallenged = c.challengerId === meId;
  const kindLabel = c.kind === 'rush' ? 'Rush 3 min' : `${c.puzzleIds.length} ejercicios`;
  // El resultado del rival solo se ve cuando ya jugaste
  const showTheirs = Boolean(mine) || c.status === 'done';

  const decline = async () => {
    setBusy(true);
    await clubRepo.declineChallenge(c.id).finally(() => setBusy(false));
  };

  return (
    <li className={styles.challenge}>
      <div className={styles.vs}>
        <span className={styles.side}>
          <Avatar avatar={me?.avatar ?? 'piece-knight'} name="Tú" size={32} me />
          <span className={[styles.rowName, c.winnerId === meId && styles.winner].filter(Boolean).join(' ')}>Tú</span>
        </span>
        <span className={styles.vsScore}>
          {mine ? mine.solved : '–'} : {showTheirs && theirs ? theirs.solved : '–'}
        </span>
        <span className={`${styles.side} ${styles.sideRight}`}>
          <span className={[styles.rowName, c.winnerId === rivalId && styles.winner].filter(Boolean).join(' ')}>{rival?.name ?? 'Compañero'}</span>
          <Avatar avatar={rival?.avatar ?? 'piece-pawn'} name={rival?.name ?? ''} size={32} />
        </span>
      </div>
      <div className={styles.challengeActions}>
        <Badge tone={c.kind === 'rush' ? 'accent' : 'primary'} icon={c.kind === 'rush' ? 'lightning' : 'puzzle'}>
          {kindLabel}
        </Badge>
        {c.status === 'open' && !mine && (
          <>
            <Button size="sm" icon="play" onClick={() => navigate(`/club/reto/${c.id}`)}>
              {iChallenged ? 'Jugar mi parte' : 'Aceptar y jugar'}
            </Button>
            {!iChallenged && (
              <Button size="sm" variant="ghost" onClick={decline} loading={busy}>
                Rechazar
              </Button>
            )}
            <span className="muted" style={{ fontSize: '0.8rem' }}>
              {theirs ? `${rival?.name} ya jugó · ` : ''}
              {timeLeft(c.expiresAt)}
            </span>
          </>
        )}
        {c.status === 'open' && mine && (
          <span className="muted" style={{ fontSize: '0.85rem' }}>
            Esperando a {rival?.name}… · tu tiempo {formatMs(mine.timeMs)}
          </span>
        )}
        {c.status === 'done' && (
          <>
            <strong style={{ fontSize: '0.9rem' }} className={c.winnerId === meId ? styles.winner : undefined}>
              {c.winnerId === meId ? '¡Ganaste!' : c.winnerId === null ? 'Empate' : `Ganó ${rival?.name}`}
            </strong>
            <Button size="sm" variant="ghost" onClick={() => navigate(`/club/reto/${c.id}`)}>
              Ver
            </Button>
            {onRematch && (
              <Button size="sm" variant="secondary" icon="handshake" onClick={() => onRematch(rivalId, c.id)}>
                Revancha
              </Button>
            )}
            <span className="muted" style={{ fontSize: '0.8rem' }}>{timeAgo(c.results[c.results.length - 1]?.finishedAt ?? c.createdAt)}</span>
          </>
        )}
        {c.status === 'declined' && <span className="muted" style={{ fontSize: '0.85rem' }}>Rechazado</span>}
        {c.status === 'expired' && <span className="muted" style={{ fontSize: '0.85rem' }}>Venció sin jugarse</span>}
      </div>
    </li>
  );
}

interface TabProps {
  challenges: Challenge[] | undefined;
  members: MemberSummary[] | undefined;
  meId: string;
}

function BlockHead({ icon, title, count, tone }: { icon: string; title: string; count?: number; tone: 'danger' | 'accent' | 'neutral' }) {
  return (
    <header className={styles.blockHead}>
      <span className={[styles.blockIcon, styles[`tone_${tone}`]].join(' ')}>
        <Icon name={icon} />
      </span>
      <h3 className={styles.blockTitle}>{title}</h3>
      {count !== undefined && count > 0 && <Badge tone={tone === 'danger' ? 'danger' : 'neutral'}>{count}</Badge>}
    </header>
  );
}

/** Reto que te falta jugar: destaca y tiene un único botón claro. */
function PendingCard({ c, meId, members, index }: { c: Challenge; meId: string; members: Map<string, MemberSummary>; index: number }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const iChallenged = c.challengerId === meId;
  const rivalId = iChallenged ? c.opponentId : c.challengerId;
  const rival = members.get(rivalId)?.member;
  const rivalPlayed = c.results.some((r) => r.memberId === rivalId);
  const decline = async () => {
    setBusy(true);
    await clubRepo.declineChallenge(c.id).finally(() => setBusy(false));
  };
  return (
    <motion.li className={styles.pendingCard} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}>
      <div className={styles.pendingTop}>
        <Badge tone="danger" icon="sword">Por jugar</Badge>
        <span className="muted">{timeLeft(c.expiresAt)}</span>
      </div>
      <div className={styles.pendingBody}>
        <Avatar avatar={rival?.avatar ?? 'piece-pawn'} name={rival?.name ?? ''} size={44} />
        <div className={styles.pendingText}>
          <strong>{iChallenged ? `Retaste a ${rival?.name ?? 'un compañero'}` : `${rival?.name ?? 'Un compañero'} te retó`}</strong>
          <span className="muted">
            {c.kind === 'rush' ? 'Rush 3 min' : `${c.puzzleIds.length} ejercicios`}
            {rivalPlayed ? ' · ya jugó, ¡te toca!' : ''}
          </span>
        </div>
      </div>
      <div className={styles.pendingActions}>
        <Button icon="play" onClick={() => navigate(`/club/reto/${c.id}`)}>
          {iChallenged ? 'Jugar mi parte' : 'Aceptar y jugar'}
        </Button>
        {!iChallenged && (
          <Button size="sm" variant="ghost" onClick={decline} loading={busy}>
            Rechazar
          </Button>
        )}
      </div>
    </motion.li>
  );
}

/** Fila compacta: lo esencial; al tocarla se ven los detalles. */
function ChallengeRow({ c, meId, members, index }: { c: Challenge; meId: string; members: Map<string, MemberSummary>; index: number }) {
  const navigate = useNavigate();
  const rivalId = c.challengerId === meId ? c.opponentId : c.challengerId;
  const rival = members.get(rivalId)?.member;
  const mine = c.results.find((r) => r.memberId === meId);
  const theirs = c.results.find((r) => r.memberId === rivalId);
  const name = rival?.name ?? 'tu compañero';
  let headline: string;
  let tone: 'win' | 'lose' | 'draw' | 'wait' | 'off' = 'off';
  if (c.status === 'open') {
    headline = `Esperando a ${name}`;
    tone = 'wait';
  } else if (c.status === 'done') {
    headline = c.winnerId === meId ? `Ganaste a ${name}` : c.winnerId === null ? `Empataste con ${name}` : `Ganó ${name}`;
    tone = c.winnerId === meId ? 'win' : c.winnerId === null ? 'draw' : 'lose';
  } else {
    headline = c.status === 'declined' ? `Rechazado · ${name}` : `Venció sin jugarse · ${name}`;
  }
  const sub =
    c.status === 'done' && mine && theirs
      ? `${mine.solved} – ${theirs.solved} · ${timeAgo(c.results[c.results.length - 1]?.finishedAt ?? c.createdAt)}`
      : c.status === 'open'
        ? `${mine ? `Tu resultado: ${mine.solved}` : ''} · ${timeLeft(c.expiresAt)}`
        : timeAgo(c.createdAt);
  const icon = tone === 'win' ? 'trophy' : tone === 'draw' ? 'handshake' : tone === 'lose' ? 'sword' : tone === 'wait' ? 'timer' : 'close';
  return (
    <motion.li initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index, 8) * 0.04 }}>
      <button type="button" className={[styles.challengeRow, styles[`row_${tone}`]].join(' ')} onClick={() => navigate(`/club/reto/${c.id}`)} aria-label={`${headline}. Ver detalles`}>
        <span className={styles.rowBadge}>
          <Icon name={icon} />
        </span>
        <span className={styles.rowTextCol}>
          <strong>{headline}</strong>
          <span className="muted">{sub}</span>
        </span>
        <Icon name="caret-right" />
      </button>
    </motion.li>
  );
}

export function ChallengesTab({ challenges, members, meId }: TabProps) {
  const [picker, setPicker] = useState<{ opponentId?: string; rematchOf?: string } | null>(null);
  if (!challenges || !members) return <Skeleton lines={4} height={70} />;
  const byId = new Map(members.map((m) => [m.member.id, m]));
  const pendingMine = challenges.filter((c) => c.status === 'open' && !c.results.some((r) => r.memberId === meId));
  const waiting = challenges.filter((c) => c.status === 'open' && c.results.some((r) => r.memberId === meId));
  const history = challenges.filter((c) => c.status !== 'open');

  return (
    <div className={styles.retosWrap}>
      <Button icon="sword" block size="lg" onClick={() => setPicker({})}>
        Retar a un compañero
      </Button>

      <section className={[styles.block, pendingMine.length > 0 && styles.blockHot].filter(Boolean).join(' ')} aria-label="Por jugar">
        <BlockHead icon="sword" title="Por jugar" count={pendingMine.length} tone="danger" />
        {pendingMine.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>Estás al día: no tienes retos pendientes.</p>
        ) : (
          <ul className={styles.cardList}>
            {pendingMine.map((c, i) => (
              <PendingCard key={c.id} c={c} meId={meId} members={byId} index={i} />
            ))}
          </ul>
        )}
      </section>

      {waiting.length > 0 && (
        <section className={styles.block} aria-label="Esperando al rival">
          <BlockHead icon="timer" title="Esperando al rival" count={waiting.length} tone="accent" />
          <ul className={styles.cardList}>
            {waiting.map((c, i) => (
              <ChallengeRow key={c.id} c={c} meId={meId} members={byId} index={i} />
            ))}
          </ul>
        </section>
      )}

      <section className={styles.block} aria-label="Historial">
        <BlockHead icon="clock" title="Historial" tone="neutral" />
        {history.length === 0 ? (
          <EmptyState scene={{ b: 'r...R/...../..N../...../K...k', a: ['2,2>4,0'] }} title="Todavía no hay retos" description="Reta a alguien del club: los dos juegan los mismos ejercicios y gana quien resuelva más." />
        ) : (
          <ul className={styles.cardList}>
            {history.slice(0, 20).map((c, i) => (
              <ChallengeRow key={c.id} c={c} meId={meId} members={byId} index={i} />
            ))}
          </ul>
        )}
      </section>

      <NewChallengeModal key={`${picker?.opponentId}-${picker?.rematchOf}`} open={picker !== null} onClose={() => setPicker(null)} members={members} meId={meId} initialOpponent={picker?.opponentId} rematchOf={picker?.rematchOf} />
    </div>
  );
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  members: MemberSummary[];
  meId: string;
  initialOpponent?: string;
  rematchOf?: string;
}

export function NewChallengeModal({ open, onClose, members, meId, initialOpponent, rematchOf }: ModalProps) {
  const navigate = useNavigate();
  const [opponent, setOpponent] = useState<string | undefined>(initialOpponent);
  const [kind, setKind] = useState<ChallengeKind>('puzzles');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chosen = opponent ?? initialOpponent;
  const rivals = members.filter((m) => m.member.id !== meId);

  const create = async () => {
    if (!chosen) return;
    setBusy(true);
    setError(null);
    try {
      const c = await clubRepo.createChallenge(chosen, kind, rematchOf);
      onClose();
      navigate(`/club/reto/${c.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={rematchOf ? 'Revancha' : 'Nuevo reto'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button icon="sword" onClick={create} disabled={!chosen} loading={busy}>
            Retar y jugar mi parte
          </Button>
        </>
      }
    >
      <div className="stack" style={{ gap: 'var(--space-3)' }}>
        <p className="eyebrow" style={{ margin: 0 }}>Rival</p>
        <ul className={styles.list} style={{ maxHeight: 260, overflowY: 'auto' }}>
          {rivals.map((m) => (
            <li key={m.member.id}>
              <button
                type="button"
                className={[styles.row, chosen === m.member.id && styles.rowMe].filter(Boolean).join(' ')}
                style={{ width: '100%', background: chosen === m.member.id ? undefined : 'transparent', border: 'none', borderBottom: '1px solid var(--color-border)', cursor: 'pointer', textAlign: 'left' }}
                onClick={() => setOpponent(m.member.id)}
                aria-pressed={chosen === m.member.id}
              >
                <Avatar avatar={m.member.avatar} name={m.member.name} size={32} active={m.practicedToday} />
                <span className={styles.rowText}>
                  <span className={styles.rowName}>{m.member.name}</span>
                  <span className={styles.rowSub}>Rating {m.stats.rating} · nivel {m.stats.level}</span>
                </span>
                <span>{chosen === m.member.id ? '✓' : ''}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="eyebrow" style={{ margin: 0 }}>Formato</p>
        <div className={styles.filters}>
          <button type="button" className={[styles.chip, kind === 'puzzles' && styles.chipOn].filter(Boolean).join(' ')} onClick={() => setKind('puzzles')} aria-pressed={kind === 'puzzles'}>
            5 ejercicios
          </button>
          <button type="button" className={[styles.chip, kind === 'rush' && styles.chipOn].filter(Boolean).join(' ')} onClick={() => setKind('rush')} aria-pressed={kind === 'rush'}>
            Rush 3 min
          </button>
        </div>
        <p className="muted" style={{ fontSize: '0.85rem', margin: 0 }}>
          {kind === 'puzzles'
            ? 'Los mismos 5 ejercicios para los dos, a la medida de ambos ratings. Gana quien resuelva más; si empatan, quien falle menos y luego el más rápido.'
            : 'Tres minutos, la misma lista de ejercicios de dificultad creciente y 3 vidas. Gana quien resuelva más.'}{' '}
          Tu rival tiene 72 horas para responder.
        </p>
        {error && <p style={{ color: 'var(--color-danger)', margin: 0 }}>{error}</p>}
      </div>
    </Modal>
  );
}
