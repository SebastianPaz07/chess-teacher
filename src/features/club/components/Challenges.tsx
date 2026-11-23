import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, EmptyState, Modal, Skeleton } from '@/components/ui';
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

export function ChallengesTab({ challenges, members, meId }: TabProps) {
  const [picker, setPicker] = useState<{ opponentId?: string; rematchOf?: string } | null>(null);
  if (!challenges || !members) return <Skeleton lines={4} height={70} />;
  const byId = new Map(members.map((m) => [m.member.id, m]));
  const pendingMine = challenges.filter((c) => c.status === 'open' && !c.results.some((r) => r.memberId === meId));
  const waiting = challenges.filter((c) => c.status === 'open' && c.results.some((r) => r.memberId === meId));
  const history = challenges.filter((c) => c.status !== 'open');

  // Balance por rival: ganados – perdidos
  const balance = new Map<string, { w: number; l: number; d: number }>();
  for (const c of history.filter((x) => x.status === 'done')) {
    const rival = c.challengerId === meId ? c.opponentId : c.challengerId;
    const b = balance.get(rival) ?? { w: 0, l: 0, d: 0 };
    if (c.winnerId === meId) b.w++;
    else if (c.winnerId === null) b.d++;
    else b.l++;
    balance.set(rival, b);
  }

  return (
    <div className={styles.section}>
      <Button icon="sword" block size="lg" onClick={() => setPicker({})}>
        Retar a un compañero
      </Button>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Por jugar {pendingMine.length > 0 && <Badge tone="danger">{pendingMine.length}</Badge>}</h3>
        {pendingMine.length === 0 ? (
          <p className="muted">No tienes retos pendientes.</p>
        ) : (
          <ul className={styles.feed}>
            {pendingMine.map((c) => (
              <ChallengeItem key={c.id} c={c} meId={meId} members={byId} />
            ))}
          </ul>
        )}
      </section>

      {waiting.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Esperando al rival</h3>
          <ul className={styles.feed}>
            {waiting.map((c) => (
              <ChallengeItem key={c.id} c={c} meId={meId} members={byId} />
            ))}
          </ul>
        </section>
      )}

      {balance.size > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Tu balance</h3>
          <div className={styles.balance}>
            {[...balance.entries()].map(([id, b]) => (
              <Badge key={id} tone={b.w > b.l ? 'success' : b.w < b.l ? 'danger' : 'neutral'}>
                {byId.get(id)?.member.name ?? '—'} · {b.w}G {b.l}P{b.d ? ` ${b.d}E` : ''}
              </Badge>
            ))}
          </div>
        </section>
      )}

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Historial</h3>
        {history.length === 0 ? (
          <EmptyState icon="sword" title="Todavía no hay retos" description="Reta a alguien del club: los dos juegan los mismos ejercicios y gana quien resuelva más." />
        ) : (
          <ul className={styles.feed}>
            {history.slice(0, 20).map((c) => (
              <ChallengeItem key={c.id} c={c} meId={meId} members={byId} onRematch={c.status === 'done' ? (opponentId, rematchOf) => setPicker({ opponentId, rematchOf }) : undefined} />
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
