import { Link } from 'react-router-dom';
import { Button, Card, Skeleton } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { clubRepo } from '@/services/club';
import { useClubStore } from '@/store/clubStore';
import { useClubQuery } from '../hooks/useClubQuery';
import { useDeferred } from '../hooks/useDeferred';
import { useInView } from '../hooks/useInView';
import { Avatar } from './Avatar';
import { Podium } from './Podium';
import { RankUpBanner, useRankUp } from './RankUp';
import { RivalNudge } from './RivalNudge';
import styles from '../club.module.css';

/**
 * Competencia del club en "Hoy": ranking semanal por ejercicios (con
 * minutos de estudio), el rival a superar, quién practicó, retos y ánimos.
 */
export function ClubCard() {
  const status = useClubStore((s) => s.status);
  const [ref, near] = useInView(true);
  const load = useDeferred(false, near && status === 'ready');
  if (status === 'loading') return <Skeleton lines={3} height={40} />;
  if (status !== 'ready') {
    return (
      <Card tone="primary" icon="users" title="Estudia en equipo" subtitle="Únete a tu club: ranking semanal por ejercicios y minutos de estudio, rachas, retos 1 vs 1 y una meta entre todos.">
        <Button to="/club" size="sm">
          {status === 'signed-out' ? 'Entrar al club' : 'Elegir mi club'}
        </Button>
      </Card>
    );
  }
  // No consulta nada hasta que la persona se acerca a esta parte de la página
  return load ? (
    <ClubSummary />
  ) : (
    <div ref={ref}>
      <Skeleton lines={3} height={40} />
    </div>
  );
}

function ClubSummary() {
  const club = useClubStore((s) => s.club)!;
  const meId = useClubStore((s) => s.session?.userId ?? '');
  const members = useClubQuery(() => clubRepo.getMembers(), [], true, 'members');
  const board = useClubQuery(() => clubRepo.getLeaderboard('week', 'puzzles'), [], true, 'board:week:puzzles');
  const challenges = useClubQuery(() => clubRepo.listChallenges(), [], true, 'challenges');
  const nudges = useClubQuery(() => clubRepo.getNudges());

  const byId = new Map(members.data?.map((m) => [m.member.id, m]) ?? []);
  const practiced = members.data?.filter((m) => m.practicedToday).length ?? 0;
  const pending = challenges.data?.filter((c) => c.status === 'open' && !c.results.some((r) => r.memberId === meId)).length ?? 0;
  const unread = nudges.data?.filter((n) => !n.read) ?? [];
  const topXp = members.data ? [...members.data].sort((a, b) => b.stats.xp - a.stats.xp)[0] : undefined;
  const rows = board.data ?? [];
  const mineIdx = rows.findIndex((r) => r.member.id === meId);
  // Podio (top 3) y debajo el 4º y tu fila si quedas fuera
  const visible = rows.filter((_, i) => i >= 3 && (i < 4 || i === mineIdx));
  const rankUp = useRankUp('week:puzzles', mineIdx >= 0 ? rows[mineIdx].rank : undefined);
  const activeIds = new Set((members.data ?? []).filter((m) => m.practicedToday).map((m) => m.member.id));

  return (
    <Card
      title={`${club.name} · esta semana`}
      icon="ranking"
      actions={
        <Link to="/club?tab=ranking" aria-label="Ver ranking completo">
          <Icon name="arrow-right" />
        </Link>
      }
    >
      {!members.data || !board.data ? (
        <Skeleton lines={4} height={32} />
      ) : (
        <div className={styles.homeCard}>
          <RankUpBanner gained={rankUp.gained} rank={mineIdx >= 0 ? rows[mineIdx].rank : undefined} onClose={rankUp.dismiss} />
          {pending > 0 && (
            <Link to="/club?tab=retos" className={styles.notice}>
              <Icon name="sword" /> <span>{pending === 1 ? 'Tienes un reto por jugar' : `Tienes ${pending} retos por jugar`}</span>
              <Icon name="caret-right" />
            </Link>
          )}
          {unread.length > 0 && (
            <Link to="/club" className={styles.alert} style={{ borderTop: 'none', paddingTop: 0 }}>
              <Icon name="wave" /> {byId.get(unread[0].fromId)?.member.name ?? 'Alguien'} {unread.length > 1 ? `y ${unread.length - 1} más te animan` : 'te anima'} a practicar
            </Link>
          )}
          <Podium rows={rows} meId={meId} unit="ejerc." compact activeIds={activeIds} />
          {visible.length > 0 && (
          <ol className={styles.mini} start={4}>
            {visible.map((r) => {
              const m = byId.get(r.member.id);
              const me = r.member.id === meId;
              return (
                <li key={r.member.id}>
                  <Link to={me ? '/progreso' : `/club/miembro/${r.member.id}`} className={[styles.miniRow, me && styles.miniMe].filter(Boolean).join(' ')}>
                    <span className="num" style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>
                      {r.rank}
                    </span>
                    <Avatar avatar={r.member.avatar} name={r.member.name} size={26} me={me} active={m?.practicedToday} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{me ? 'Tú' : r.member.name}</span>
                    <strong className={styles.miniNum}>{r.value}</strong>
                    <span className={styles.miniSub}>{m?.weekMinutes ?? 0}</span>
                  </Link>
                </li>
              );
            })}
          </ol>
          )}
          <RivalNudge rows={rows} members={members.data} meId={meId} unit="ejercicios" />
          <p className="muted" style={{ margin: 0, fontSize: '0.82rem' }}>
            <Icon name="fire" /> {practiced}/{members.data.length} practicaron hoy
            {topXp && (
              <>
                {' '}
                · Mejor puntaje general: <strong>{topXp.member.id === meId ? 'tú' : topXp.member.name}</strong> ({topXp.stats.xp} XP)
              </>
            )}
          </p>
        </div>
      )}
    </Card>
  );
}
