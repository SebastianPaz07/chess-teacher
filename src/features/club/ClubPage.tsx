import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Badge, Button, Card, Skeleton, Tabs } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { rankForLevel } from '@/services/game/xp';
import { clubRepo, type MemberSummary } from '@/services/club';
import { useClubStore } from '@/store/clubStore';
import { Avatar } from './components/Avatar';
import { ChallengesTab } from './components/Challenges';
import { FeedList } from './components/FeedList';
import { InviteButton } from './components/InviteButton';
import { Leaderboard } from './components/Leaderboard';
import { WeekGoalCard } from './components/WeekGoalCard';
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

  const members = useClubQuery(() => clubRepo.getMembers());
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
          <span>
            Código <span className={styles.code}>{club.inviteCode}</span>
          </span>
          <InviteButton club={club} />
        </div>
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

      {clubRepo.isDemo && (
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
          <Card tone="primary" icon="sword" title={pending === 1 ? 'Tienes un reto por jugar' : `Tienes ${pending} retos por jugar`}>
            <Button size="sm" onClick={onGoChallenges}>
              Ver retos
            </Button>
          </Card>
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

function MembersTab({ members, meId }: { members: MemberSummary[] | undefined; meId: string }) {
  if (!members) return <Skeleton lines={6} height={56} />;
  const sorted = [...members].sort((a, b) => Number(b.practicedToday) - Number(a.practicedToday) || b.streak - a.streak || b.stats.xp - a.stats.xp);
  return (
    <ul className={styles.list}>
      {sorted.map((m) => {
        const rank = rankForLevel(m.stats.level);
        const me = m.member.id === meId;
        return (
          <li key={m.member.id}>
            <Link to={me ? '/progreso' : `/club/miembro/${m.member.id}`} className={[styles.row, me && styles.rowMe].filter(Boolean).join(' ')}>
              <Avatar avatar={m.member.avatar} name={m.member.name} size={42} me={me} active={m.practicedToday} />
              <span className={styles.rowText}>
                <span className={styles.rowName}>
                  {me ? `${m.member.name} (tú)` : m.member.name} {m.member.role === 'admin' && <Badge tone="accent">admin</Badge>}
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
          </li>
        );
      })}
    </ul>
  );
}
