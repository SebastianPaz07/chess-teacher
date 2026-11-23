import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, Button, Card, EmptyState, Loader } from '@/components/ui';
import { clubRepo, type Challenge, type MemberSummary } from '@/services/club';
import { useClubStore } from '@/store/clubStore';
import { celebrate } from '@/features/gamification/components/RewardsCenter';
import { Avatar } from './components/Avatar';
import { ChallengeRunner } from './components/ChallengeRunner';
import { NewChallengeModal } from './components/Challenges';
import { formatMs, timeLeft } from './format';
import { ClubGate } from './ClubGate';
import { useChallengeRewards } from './hooks/useChallengeRewards';
import { useClubQuery } from './hooks/useClubQuery';
import styles from './club.module.css';

export function ChallengePage() {
  return (
    <ClubGate>
      <ChallengeView />
    </ClubGate>
  );
}

function ChallengeView() {
  const { challengeId = '' } = useParams();
  const meId = useClubStore((s) => s.session?.userId ?? '');
  const q = useClubQuery(() => clubRepo.getChallenge(challengeId), [challengeId]);
  const members = useClubQuery(() => clubRepo.getMembers());
  const all = useClubQuery(() => clubRepo.listChallenges());
  useChallengeRewards(all.data, meId);
  const [error, setError] = useState<string | null>(null);
  const [rematch, setRematch] = useState(false);

  if (q.loading && !q.data) return <Loader />;
  const c = q.data;
  if (!c) return <EmptyState icon="sword" title="Este reto no existe" action={<Button to="/club?tab=retos">Ver mis retos</Button>} />;
  const rivalId = c.challengerId === meId ? c.opponentId : c.challengerId;
  const byId = new Map(members.data?.map((m) => [m.member.id, m]) ?? []);
  const rival = byId.get(rivalId);
  const mine = c.results.find((r) => r.memberId === meId);
  const title = `Reto contra ${rival?.member.name ?? 'tu compañero'}`;

  if (c.status === 'open' && !mine) {
    return (
      <ChallengeRunner
        puzzleIds={c.puzzleIds}
        kind={c.kind}
        intro={<PageHeader icon="sword" eyebrow={c.kind === 'rush' ? 'Rush de 3 minutos' : `${c.puzzleIds.length} ejercicios`} title={title} subtitle={`${c.challengerId === meId ? 'Lanzaste el reto.' : `${rival?.member.name} te retó.`} ${timeLeft(c.expiresAt)} para jugarlo.`} />}
        side={rival && <RivalCard rival={rival} />}
        onDone={async (r) => {
          try {
            const updated = await clubRepo.submitChallengeResult(c.id, r);
            if (updated.status === 'done' && updated.winnerId === meId) celebrate('big');
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      />
    );
  }

  return (
    <div className="stack" style={{ maxWidth: 640, margin: '0 auto', width: '100%' }}>
      <PageHeader icon="sword" title={title} subtitle={c.kind === 'rush' ? 'Rush de 3 minutos' : `${c.puzzleIds.length} ejercicios`} />
      {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}
      <ResultCard c={c} meId={meId} byId={byId} />
      <div className="row">
        {c.status === 'done' && (
          <Button icon="handshake" onClick={() => setRematch(true)}>
            Revancha
          </Button>
        )}
        <Button variant="secondary" to="/club?tab=retos">
          Mis retos
        </Button>
      </div>
      {members.data && <NewChallengeModal open={rematch} onClose={() => setRematch(false)} members={members.data} meId={meId} initialOpponent={rivalId} rematchOf={c.id} />}
    </div>
  );
}

function RivalCard({ rival }: { rival: MemberSummary }) {
  return (
    <Card title={rival.member.name} icon={<Avatar avatar={rival.member.avatar} name={rival.member.name} size={32} />} subtitle={`Rating ${rival.stats.rating} · nivel ${rival.stats.level}`}>
      <p className="muted" style={{ margin: 0 }}>
        Juega exactamente estos mismos ejercicios. Su resultado se revela cuando termines.
      </p>
    </Card>
  );
}

function ResultCard({ c, meId, byId }: { c: Challenge; meId: string; byId: Map<string, MemberSummary> }) {
  const rivalId = c.challengerId === meId ? c.opponentId : c.challengerId;
  const rival = byId.get(rivalId)?.member;
  const me = byId.get(meId)?.member;
  const mine = c.results.find((r) => r.memberId === meId);
  const theirs = c.results.find((r) => r.memberId === rivalId);
  const tone = c.status !== 'done' ? 'default' : c.winnerId === meId ? 'success' : c.winnerId === null ? 'accent' : 'danger';
  const headline =
    c.status === 'open' ? `Esperando a ${rival?.name ?? 'tu rival'}…` : c.status === 'done' ? (c.winnerId === meId ? '¡Ganaste el reto!' : c.winnerId === null ? 'Empate' : `Ganó ${rival?.name}`) : c.status === 'declined' ? 'Reto rechazado' : 'El reto venció';

  return (
    <Card tone={tone} className={styles.result}>
      <p className={styles.resultBig}>{headline}</p>
      <div className={styles.vs} style={{ marginTop: 'var(--space-4)' }}>
        <div className="stack" style={{ alignItems: 'center', gap: 4 }}>
          <Avatar avatar={me?.avatar ?? 'piece-knight'} name="Tú" size={56} me />
          <strong>Tú</strong>
          {mine ? <Stats r={mine} total={c.kind === 'puzzles' ? c.puzzleIds.length : undefined} /> : <span className="muted">Sin jugar</span>}
        </div>
        <span className={styles.vsScore} style={{ fontSize: '2rem' }}>
          {mine?.solved ?? '–'} : {theirs && (mine || c.status === 'done') ? theirs.solved : '?'}
        </span>
        <div className="stack" style={{ alignItems: 'center', gap: 4 }}>
          <Avatar avatar={rival?.avatar ?? 'piece-pawn'} name={rival?.name ?? ''} size={56} />
          <strong>{rival?.name}</strong>
          {theirs && (mine || c.status === 'done') ? <Stats r={theirs} total={c.kind === 'puzzles' ? c.puzzleIds.length : undefined} /> : <span className="muted">{theirs ? 'Ya jugó' : 'Por jugar'}</span>}
        </div>
      </div>
      {c.status === 'open' && <p className="muted" style={{ marginTop: 'var(--space-4)' }}>Te avisaremos en el club cuando juegue. {timeLeft(c.expiresAt)}.</p>}
      {c.status === 'done' && c.winnerId === meId && <Badge tone="xp" icon="diamond">+80 XP</Badge>}
      {c.status === 'done' && c.winnerId !== meId && <Badge tone="xp" icon="diamond">+30 XP por jugar</Badge>}
    </Card>
  );
}

function Stats({ r, total }: { r: { solved: number; mistakes: number; timeMs: number }; total?: number }) {
  return (
    <span className="muted" style={{ fontSize: '0.82rem', textAlign: 'center' }}>
      {r.solved}
      {total ? `/${total}` : ''} resueltos · {r.mistakes} fallos · {formatMs(r.timeMs)}
    </span>
  );
}
