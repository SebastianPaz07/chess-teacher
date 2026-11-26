import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Badge, Button, Card, Modal, Skeleton, Tabs } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { rankForLevel } from '@/services/game/xp';
import { clubRepo, type Member, type MemberSummary } from '@/services/club';
import { canManage, canRemove, ROLE_LABEL } from '@/services/club/logic';
import { useClubStore } from '@/store/clubStore';
import { Avatar } from './components/Avatar';
import { ChallengesTab } from './components/Challenges';
import { CopyCode } from './components/CopyCode';
import { FeedList } from './components/FeedList';
import { InviteButton } from './components/InviteButton';
import { Leaderboard } from './components/Leaderboard';
import { WeekGoalCard } from './components/WeekGoalCard';
import { copyText } from './copy';
import { timeAgo } from './format';
import { ClubGate } from './ClubGate';
import { useChallengeRewards } from './hooks/useChallengeRewards';
import { useClubQuery } from './hooks/useClubQuery';
import styles from './club.module.css';

type Tab = 'hoy' | 'ranking' | 'retos' | 'miembros';

export function ClubPage() {
  return (
    <ClubGate>
      <ClubHome />
    </ClubGate>
  );
}

function ClubHome() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'hoy';
  const setTab = (t: Tab) => setParams(t === 'hoy' ? {} : { tab: t }, { replace: true });
  const club = useClubStore((s) => s.club)!;
  const meId = useClubStore((s) => s.session?.userId ?? '');

  const isAdmin = useClubQuery(() => clubRepo.isAdmin()).data ?? false;
  const refresh = useClubStore((s) => s.refresh);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  const members = useClubQuery(() => clubRepo.getMembers());
  const myRole = members.data?.find((m) => m.member.id === meId)?.member.role;
  const challenges = useClubQuery(() => clubRepo.listChallenges());
  useChallengeRewards(challenges.data, meId);
  const pending = challenges.data?.filter((c) => c.status === 'open' && !c.results.some((r) => r.memberId === meId)).length ?? 0;

  return (
    <div className="stack">
      <header className={styles.clubHead}>
        <p className="eyebrow" style={{ margin: 0 }}>
          Tu club
        </p>
        <h1 className={styles.clubName}>{club.name}</h1>
        <div className={styles.clubMeta}>
          <span>
            <Icon name="users" /> {members.data?.length ?? '…'} miembros
          </span>
        </div>
        <div className={styles.clubActions}>
          <CopyCode code={club.inviteCode} />
          <InviteButton club={club} variant="secondary" />
          {isAdmin && <CreatorLinkButton />}
        </div>
        {myRole && myRole !== 'member' && (
          <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
            Eres {ROLE_LABEL[myRole].toLowerCase()} de este club y también participas como un jugador más.
          </p>
        )}
      </header>

      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        items={[
          { value: 'hoy', label: 'Hoy' },
          { value: 'ranking', label: 'Ranking' },
          { value: 'retos', label: pending ? `Retos (${pending})` : 'Retos' },
          { value: 'miembros', label: 'Miembros' },
        ]}
      />

      {tab === 'hoy' && <TodayTab members={members.data} meId={meId} onGoChallenges={() => setTab('retos')} pending={pending} />}
      {tab === 'ranking' && <Leaderboard meId={meId} members={members.data} />}
      {tab === 'retos' && <ChallengesTab challenges={challenges.data} members={members.data} meId={meId} />}
      {tab === 'miembros' && <MembersTab members={members.data} meId={meId} />}

      <div className={styles.leaveRow}>
        <Button variant="ghost" size="sm" icon="sign-out" onClick={() => setConfirmLeave(true)}>
          Salir del club
        </Button>
      </div>

      <Modal
        open={confirmLeave}
        onClose={() => !leaving && setConfirmLeave(false)}
        size="sm"
        title="¿Salir del club?"
        showClose
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmLeave(false)} disabled={leaving}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={leaving}
              onClick={async () => {
                setLeaving(true);
                setLeaveError(null);
                try {
                  await clubRepo.leaveClub();
                  await refresh();
                  setConfirmLeave(false);
                } catch (e) {
                  setLeaveError((e as Error).message);
                } finally {
                  setLeaving(false);
                }
              }}
            >
              Salir
            </Button>
          </>
        }
      >
        <div className="stack">
          <p style={{ margin: 0 }}>Dejarás de aparecer en el ranking y en las novedades de {club.name}. Tu progreso personal no se pierde y podrás volver con el código de invitación.</p>
          {myRole === 'owner' && (
            <p className="muted" style={{ margin: 0 }}>
              Eres el organizador: si hay más miembros, el cargo pasará a quien lleve más tiempo en el club (primero los colaboradores). Si eres la única persona, el club se eliminará.
            </p>
          )}
          {leaveError && <p style={{ margin: 0, color: 'var(--color-danger)' }}>{leaveError}</p>}
        </div>
      </Modal>

      {import.meta.env.DEV && clubRepo.isDemo && (
        <p className={styles.demo}>
          <Icon name="flask" /> Modo demo: tus compañeros son simulados y viven en este navegador. Desde Ajustes puedes adelantar días o hacer que te reten.
        </p>
      )}
    </div>
  );
}

function TodayTab({ members, meId, pending, onGoChallenges }: { members: MemberSummary[] | undefined; meId: string; pending: number; onGoChallenges: () => void }) {
  const navigate = useNavigate();
  const [feedLimit, setFeedLimit] = useState(12);
  const feed = useClubQuery(() => clubRepo.getFeed(feedLimit), [feedLimit]);
  const week = useClubQuery(() => clubRepo.getClubWeek());
  const nudges = useClubQuery(() => clubRepo.getNudges());
  const unread = nudges.data?.filter((n) => !n.read) ?? [];
  const byId = new Map(members?.map((m) => [m.member.id, m.member]) ?? []);

  return (
    <div className={styles.cols}>
      <div className={styles.section}>
        {unread.length > 0 && (
          <Card tone="accent" icon="wave" title={unread.length === 1 ? `${byId.get(unread[0].fromId)?.name ?? 'Alguien'} te anima a practicar` : `${unread.length} compañeros te animan a practicar`}>
            <div className="row">
              <Button size="sm" onClick={() => clubRepo.markNudgesRead().then(() => navigate('/'))}>
                Practicar ahora
              </Button>
              <Button size="sm" variant="ghost" onClick={() => clubRepo.markNudgesRead()}>
                Entendido
              </Button>
            </div>
          </Card>
        )}
        {pending > 0 && (
          <button type="button" className={styles.notice} onClick={onGoChallenges}>
            <Icon name="sword" /> <span>{pending === 1 ? 'Tienes un reto por jugar' : `Tienes ${pending} retos por jugar`}</span>
            <small>Ver</small>
          </button>
        )}
        <PracticedToday members={members} meId={meId} />
        <WeekGoalCard week={week.data} members={members} meId={meId} />
      </div>
      <section className={styles.section} aria-labelledby="feed-title">
        <div className={styles.sectionHead}>
          <h2 id="feed-title" className={styles.sectionTitle}>
            Actividad
          </h2>
        </div>
        <FeedList items={feed.data} members={members} meId={meId} />
        {feed.data && feed.data.length >= feedLimit && (
          <Button variant="ghost" onClick={() => setFeedLimit((n) => n + 20)}>
            Ver más actividad
          </Button>
        )}
      </section>
    </div>
  );
}

/** «Practicaron hoy 4/7»: los que faltan aparecen atenuados con botón para animarlos. */
function PracticedToday({ members, meId }: { members: MemberSummary[] | undefined; meId: string }) {
  const [sent, setSent] = useState<Record<string, string>>({});
  if (!members) return <Skeleton lines={2} height={60} />;
  const done = members.filter((m) => m.practicedToday);
  const missing = members.filter((m) => !m.practicedToday && m.member.id !== meId);
  const meDone = members.find((m) => m.member.id === meId)?.practicedToday;

  const nudge = async (id: string) => {
    try {
      await clubRepo.sendNudge(id);
      setSent((s) => ({ ...s, [id]: '¡Ánimo enviado!' }));
    } catch (e) {
      setSent((s) => ({ ...s, [id]: (e as Error).message }));
    }
  };

  return (
    <Card title="¿Quién practicó hoy?" icon="fire">
      <div className={styles.today}>
        <p className={styles.todayCount}>
          {done.length}
          <small> / {members.length} del club</small>
        </p>
        {!meDone && (
          <p style={{ margin: 0 }}>
            Aún no sumas tu práctica de hoy. <Link to="/">Haz tu plan</Link> y mantén la racha.
          </p>
        )}
        <div className={styles.faces}>
          {done.map((m) => (
            <Link key={m.member.id} to={m.member.id === meId ? '/progreso' : `/club/miembro/${m.member.id}`} className={styles.face}>
              <Avatar avatar={m.member.avatar} name={m.member.name} size={44} me={m.member.id === meId} active />
              <span>{m.member.id === meId ? 'Tú' : m.member.name}</span>
            </Link>
          ))}
        </div>
        {missing.length > 0 && (
          <>
            <p className="eyebrow" style={{ margin: 0 }}>
              Faltan
            </p>
            <ul className={styles.list}>
              {missing.map((m) => (
                <li key={m.member.id} className={styles.row}>
                  <Avatar avatar={m.member.avatar} name={m.member.name} size={34} idle />
                  <span className={styles.rowText}>
                    <span className={styles.rowName}>{m.member.name}</span>
                    <span className={styles.rowSub}>{sent[m.member.id] ?? (m.streak > 0 ? `Racha de ${m.streak} ${m.streak === 1 ? 'día' : 'días'} en juego` : m.stats.lastActive ? `Practicó por última vez ${timeAgo(`${m.stats.lastActive}T12:00:00`)}` : 'Aún no practica')}</span>
                  </span>
                  <Button size="sm" variant="ghost" icon="wave" onClick={() => nudge(m.member.id)} disabled={Boolean(sent[m.member.id])} aria-label={`Animar a ${m.member.name}`}>
                    Animar
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Card>
  );
}

/** Admin de la plataforma: copia el link para que otra persona cree su propio club. */
function CreatorLinkButton() {
  const [copied, setCopied] = useState(false);
  const run = async () => {
    const token = await clubRepo.createClubInvite();
    if (await copyText(`${window.location.origin}/crear-club/${token}`, 'Copia el link para crear un club')) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    }
  };
  return (
    <Button size="sm" variant="ghost" icon={copied ? 'check' : 'seal'} onClick={run}>
      {copied ? 'Link copiado' : 'Link para crear clubes'}
    </Button>
  );
}

function MembersTab({ members, meId }: { members: MemberSummary[] | undefined; meId: string }) {
  const [managing, setManaging] = useState<Member | null>(null);
  if (!members) return <Skeleton lines={6} height={56} />;
  const meMember = members.find((m) => m.member.id === meId)?.member;
  const sorted = [...members].sort(
    (a, b) => Number(b.member.role === 'owner') - Number(a.member.role === 'owner') || Number(b.practicedToday) - Number(a.practicedToday) || b.streak - a.streak || b.stats.xp - a.stats.xp,
  );
  return (
    <>
      <ul className={styles.list}>
        {sorted.map((m) => {
          const rank = rankForLevel(m.stats.level);
          const me = m.member.id === meId;
          const manageable = !me && canManage(meMember?.role) && (meMember?.role === 'owner' ? m.member.role !== 'owner' : canRemove(meMember, m.member));
          return (
            <li key={m.member.id} className={styles.memberItem}>
              <Link to={me ? '/progreso' : `/club/miembro/${m.member.id}`} className={[styles.row, me && styles.rowMe].filter(Boolean).join(' ')}>
                <Avatar avatar={m.member.avatar} name={m.member.name} size={42} me={me} active={m.practicedToday} />
                <span className={styles.rowText}>
                  <span className={styles.rowName}>
                    {me ? `${m.member.name} (tú)` : m.member.name}{' '}
                    {m.member.role !== 'member' && <Badge tone={m.member.role === 'owner' ? 'accent' : 'primary'}>{ROLE_LABEL[m.member.role]}</Badge>}
                  </span>
                  <span className={styles.rowSub}>
                    Nivel {m.stats.level} · {rank.name} · rating {m.stats.rating}
                  </span>
                </span>
                <span className={styles.rowEnd}>
                  <Badge tone={m.streak > 0 ? 'accent' : 'neutral'} icon="fire">
                    {m.streak}
                  </Badge>
                </span>
              </Link>
              {manageable && (
                <button type="button" className={styles.iconBtn} onClick={() => setManaging(m.member)} aria-label={`Gestionar a ${m.member.name}`}>
                  <Icon name="dots-vertical" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <ManageMemberModal member={managing} actor={meMember} onClose={() => setManaging(null)} />
    </>
  );
}

function ManageMemberModal({ member, actor, onClose }: { member: Member | null; actor: Member | undefined; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<void>) => {
    setError(null);
    try {
      await fn();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <Modal open={Boolean(member)} onClose={onClose} size="sm" title={member ? `Gestionar a ${member.name}` : undefined}>
      {member && (
        <div className="stack" style={{ gap: 'var(--space-2)' }}>
          <p className="muted" style={{ margin: 0 }}>
            Rol actual: {ROLE_LABEL[member.role]}
          </p>
          {actor?.role === 'owner' &&
            (member.role === 'manager' ? (
              <Button variant="secondary" icon="user" block onClick={() => run(() => clubRepo.setMemberRole(member.id, 'member'))}>
                Quitar como colaborador
              </Button>
            ) : (
              <Button variant="secondary" icon="shield" block onClick={() => run(() => clubRepo.setMemberRole(member.id, 'manager'))}>
                Nombrar colaborador
              </Button>
            ))}
          {canRemove(actor, member) && (
            <Button variant="danger" icon="user-minus" block onClick={() => run(() => clubRepo.removeMember(member.id))}>
              Sacar del club
            </Button>
          )}
          {error && <p style={{ color: 'var(--color-danger)', margin: 0 }}>{error}</p>}
        </div>
      )}
    </Modal>
  );
}
