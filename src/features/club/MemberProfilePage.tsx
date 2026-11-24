import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Badge, Button, Card, EmptyState, Loader, ProgressRing, StatPill } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { modules } from '@/content/registry';
import { ActivityCalendar } from '@/features/progress/components/ActivityCalendar';
import { rankForLevel } from '@/services/game/xp';
import { clubRepo } from '@/services/club';
import { ROLE_LABEL } from '@/services/club/logic';
import { useClubStore } from '@/store/clubStore';
import { Avatar } from './components/Avatar';
import { ChallengeItem, NewChallengeModal } from './components/Challenges';
import { timeAgo } from './format';
import { ClubGate } from './ClubGate';
import { useClubQuery } from './hooks/useClubQuery';
import styles from './club.module.css';

export function MemberProfilePage() {
  return (
    <ClubGate>
      <MemberProfile />
    </ClubGate>
  );
}

function MemberProfile() {
  const { memberId = '' } = useParams();
  const meId = useClubStore((s) => s.session?.userId ?? '');
  const detail = useClubQuery(() => clubRepo.getMember(memberId), [memberId]);
  const mine = useClubQuery(() => clubRepo.getMember(meId), [meId]);
  const members = useClubQuery(() => clubRepo.getMembers());
  const challenges = useClubQuery(() => clubRepo.listChallenges());
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [nudgeMsg, setNudgeMsg] = useState<string | null>(null);

  if (memberId === meId) return <Navigate to="/progreso" replace />;
  if (detail.loading && !detail.data) return <Loader />;
  const d = detail.data;
  if (!d) return <EmptyState icon="users" title="No encontramos a este compañero" action={<Button to="/club?tab=miembros">Ver miembros</Button>} />;

  const rank = rankForLevel(d.stats.level);
  const history = Object.fromEntries(d.activity.map((a) => [a.day, a.xp]));
  const me = mine.data;
  const byId = new Map(members.data?.map((m) => [m.member.id, m]) ?? []);
  const vs = (challenges.data ?? []).filter((c) => c.challengerId === memberId || c.opponentId === memberId);
  const record = vs.filter((c) => c.status === 'done').reduce((acc, c) => ({ w: acc.w + (c.winnerId === meId ? 1 : 0), l: acc.l + (c.winnerId === memberId ? 1 : 0) }), { w: 0, l: 0 });

  const nudge = async () => {
    try {
      await clubRepo.sendNudge(memberId);
      setNudgeMsg('¡Ánimo enviado!');
    } catch (e) {
      setNudgeMsg((e as Error).message);
    }
  };

  const rows: { label: string; mine?: number; theirs: number }[] = [
    { label: 'Nivel', mine: me?.stats.level, theirs: d.stats.level },
    { label: 'XP esta semana', mine: me?.weekXp, theirs: d.weekXp },
    { label: 'Rating', mine: me?.stats.rating, theirs: d.stats.rating },
    { label: 'Racha', mine: me?.streak, theirs: d.streak },
    { label: 'Ejercicios', mine: me?.stats.puzzlesSolved, theirs: d.stats.puzzlesSolved },
    { label: 'Lecciones', mine: me?.stats.lessonsCompleted, theirs: d.stats.lessonsCompleted },
  ];

  return (
    <div className="stack">
      <header className={styles.profileHead}>
        <Avatar avatar={d.member.avatar} name={d.member.name} size={72} active={d.practicedToday} />
        <div style={{ minWidth: 0 }}>
          <p className="eyebrow" style={{ margin: 0 }}>
            {rank.name} · nivel {d.stats.level}
          </p>
          <h1 className={styles.profileName}>{d.member.name}</h1>
          {d.member.motto && <p className="muted" style={{ margin: '4px 0 0', fontStyle: 'italic' }}>«{d.member.motto}»</p>}
          <div className="row" style={{ marginTop: 'var(--space-2)' }}>
            {d.practicedToday ? (
              <Badge tone="success" icon="fire">Practicó hoy</Badge>
            ) : (
              <Badge tone="neutral">{d.stats.lastActive ? `Última práctica ${timeAgo(`${d.stats.lastActive}T12:00:00`)}` : 'Sin actividad'}</Badge>
            )}
            {d.member.role !== 'member' && <Badge tone={d.member.role === 'owner' ? 'accent' : 'primary'}>{ROLE_LABEL[d.member.role]}</Badge>}
          </div>
        </div>
      </header>

      <div className="row">
        <Button icon="sword" onClick={() => setChallengeOpen(true)}>
          Retar
        </Button>
        {!d.practicedToday && (
          <Button variant="secondary" icon="wave" onClick={nudge} disabled={Boolean(nudgeMsg)}>
            {nudgeMsg ?? 'Animar a practicar'}
          </Button>
        )}
        {(record.w > 0 || record.l > 0) && (
          <Badge tone={record.w >= record.l ? 'success' : 'danger'}>
            Tus retos: {record.w}G – {record.l}P
          </Badge>
        )}
      </div>

      <div className={styles.kpis}>
        <StatPill icon="fire" value={d.streak} label={`racha · mejor ${d.stats.bestStreak}`} color="var(--color-streak)" />
        <StatPill icon="diamond" value={d.stats.xp} label="XP total" color="var(--color-xp)" />
        <StatPill icon="chart" value={d.stats.rating} label="rating" />
        <StatPill icon="trophy" value={d.stats.achievements} label="logros" />
      </div>

      <div className={styles.cols}>
        <div className={styles.section}>
          <Card title="Actividad" icon="calendar" subtitle="Últimas 12 semanas">
            <ActivityCalendar history={history} />
          </Card>
          <Card title="Avance por módulo" icon="map">
            <div className="stack" style={{ gap: 'var(--space-3)' }}>
              {modules.map((m) => {
                const v = d.stats.modules[m.id] ?? 0;
                const mineV = me?.stats.modules[m.id] ?? 0;
                return (
                  <div key={m.id} className="row" style={{ flexWrap: 'nowrap' }}>
                    <ProgressRing value={v} size={44} stroke={5} color={m.color}>
                      <Icon name={m.icon} />
                    </ProgressRing>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</strong>
                      <span className="muted" style={{ fontSize: '0.82rem' }}>
                        {Math.round(v * 100)}% · tú {Math.round(mineV * 100)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
        <div className={styles.section}>
          <Card title={`Tú vs ${d.member.name}`} icon="scales">
            <table className={styles.compare}>
              <thead>
                <tr>
                  <th />
                  <th>Tú</th>
                  <th>{d.member.name}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.label}>
                    <td>{r.label}</td>
                    <td className={r.mine !== undefined && r.mine > r.theirs ? styles.better : undefined}>{r.mine ?? '–'}</td>
                    <td className={r.mine !== undefined && r.theirs > r.mine ? styles.better : undefined}>{r.theirs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          {vs.length > 0 && (
            <Card title="Retos entre ustedes" icon="sword">
              <ul className={styles.feed}>
                {vs.slice(0, 5).map((c) => (
                  <ChallengeItem key={c.id} c={c} meId={meId} members={byId} />
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      {members.data && <NewChallengeModal open={challengeOpen} onClose={() => setChallengeOpen(false)} members={members.data} meId={meId} initialOpponent={memberId} />}
    </div>
  );
}
