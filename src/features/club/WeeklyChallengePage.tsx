import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, Button, Card, Loader } from '@/components/ui';
import { celebrate } from '@/features/gamification/components/RewardsCenter';
import { clubRepo } from '@/services/club';
import { useClubClaimsStore, useClubStore } from '@/store/clubStore';
import { useGameStore } from '@/store/gameStore';
import { Avatar } from './components/Avatar';
import { ChallengeRunner } from './components/ChallengeRunner';
import { formatMs } from './format';
import { ClubGate } from './ClubGate';
import { useClubQuery } from './hooks/useClubQuery';
import styles from './club.module.css';

export function WeeklyChallengePage() {
  return (
    <ClubGate>
      <WeeklyChallenge />
    </ClubGate>
  );
}

function WeeklyChallenge() {
  const meId = useClubStore((s) => s.session?.userId ?? '');
  const week = useClubQuery(() => clubRepo.getClubWeek());
  const members = useClubQuery(() => clubRepo.getMembers());
  const dispatch = useGameStore((s) => s.dispatch);
  const claimWeek = useClubClaimsStore((s) => s.claimWeek);
  const [error, setError] = useState<string | null>(null);

  if (!week.data || !members.data) return <Loader />;
  const w = week.data;
  const played = w.results.some((r) => r.memberId === meId);
  const byId = new Map(members.data.map((m) => [m.member.id, m.member]));
  const ranking = [...w.results].sort((a, b) => b.solved - a.solved || a.timeMs - b.timeMs);
  const pendingNames = members.data.filter((m) => !w.results.some((r) => r.memberId === m.member.id)).map((m) => (m.member.id === meId ? 'tú' : m.member.name));

  if (!played) {
    return (
      <ChallengeRunner
        puzzleIds={w.puzzleIds}
        kind="puzzles"
        intro={<PageHeader icon="users" eyebrow="Desafío de la semana" title="Los mismos ejercicios para todo el club" subtitle={`${w.results.length} de ${members.data.length} ya jugaron. Gana quien resuelva más; si empatan, el más rápido.`} />}
        side={
          <Card title="Así va el club" icon="ranking">
            <p className="muted" style={{ margin: 0 }}>
              El ranking se revela cuando termines.
            </p>
          </Card>
        }
        onDone={async (r) => {
          try {
            await clubRepo.submitWeekResult({ solved: r.solved, timeMs: r.timeMs });
            if (claimWeek(w.weekStart)) dispatch({ type: 'WEEKLY_CHALLENGE_FINISHED', weekStart: w.weekStart, solved: r.solved, total: w.puzzleIds.length });
            if (r.solved >= w.puzzleIds.length * 0.7) celebrate('small');
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      />
    );
  }

  return (
    <div className="stack" style={{ maxWidth: 640, margin: '0 auto', width: '100%' }}>
      <PageHeader icon="users" eyebrow="Desafío de la semana" title="Ranking del desafío" subtitle={`Semana del ${w.weekStart}. Cierra el domingo.`} />
      {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}
      <ol className={styles.list}>
        {ranking.map((r, i) => {
          const m = byId.get(r.memberId);
          const me = r.memberId === meId;
          return (
            <li key={r.memberId} className={[styles.row, me && styles.rowMe].filter(Boolean).join(' ')}>
              <span className={[styles.rank, i === 0 && styles.rank1].filter(Boolean).join(' ')}>{i + 1}</span>
              <span className={styles.rowMain}>
                <Avatar avatar={m?.avatar ?? 'piece-pawn'} name={m?.name ?? ''} size={36} me={me} />
                <span className={styles.rowText}>
                  <span className={styles.rowName}>{me ? 'Tú' : m?.name}</span>
                  <span className={styles.rowSub}>{formatMs(r.timeMs)}</span>
                </span>
              </span>
              <span className={styles.value}>
                {r.solved}
                <small className="muted">/{w.puzzleIds.length}</small>
              </span>
            </li>
          );
        })}
      </ol>
      {pendingNames.length > 0 && <p className="muted">Falta por jugar: {pendingNames.join(', ')}.</p>}
      <div className="row">
        <Badge tone="xp" icon="diamond">+10 XP por ejercicio resuelto</Badge>
        <Button variant="secondary" to="/club">
          Volver al club
        </Button>
      </div>
    </div>
  );
}
