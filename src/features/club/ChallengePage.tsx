import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, Button, Card, EmptyState, Loader } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
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
            // Aviso general para el club: quién le ganó a quién (el que juega último lo publica)
            if (updated.status === 'done' && rival) {
              const text = updated.winnerId === meId ? `le ganó a ${rival.member.name} en un reto` : updated.winnerId === null ? `empató con ${rival.member.name} en un reto` : `perdió contra ${rival.member.name} en un reto`;
              clubRepo.postFeed({ kind: 'challenge', icon: 'trophy', text }).catch(() => undefined);
            }
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
  const done = c.status === 'done';
  const won = done && c.winnerId === meId;
  const lost = done && c.winnerId !== null && c.winnerId !== meId;
  const outcome = !done ? 'wait' : won ? 'win' : lost ? 'lose' : 'draw';
  const headline =
    c.status === 'open' ? `Esperando a ${rival?.name ?? 'tu rival'}` : done ? (won ? '¡Ganaste el reto!' : c.winnerId === null ? 'Empate' : `Ganó ${rival?.name}`) : c.status === 'declined' ? 'Reto rechazado' : 'El reto venció';
  const eyebrow = `${c.kind === 'rush' ? 'Rush de 3 min' : `${c.puzzleIds.length} ejercicios`} · ${done ? 'Reto terminado' : c.status === 'open' ? 'En juego' : 'Cerrado'}`;
  const total = c.kind === 'puzzles' ? c.puzzleIds.length : undefined;
  const showTheirs = Boolean(theirs && (mine || done));

  return (
    <Card className={styles.result}>
      <div className={[styles.resultHead, styles[`res_${outcome}`]].join(' ')}>
        <span className={styles.resultIcon}>
          <Icon name={outcome === 'win' ? 'trophy' : outcome === 'draw' ? 'handshake' : outcome === 'lose' ? 'sword' : 'timer'} />
        </span>
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2 className={styles.resultTitle}>{headline}</h2>
        </div>
      </div>

      <div className={styles.scoreboard}>
        <Player name="Tú" avatar={me?.avatar ?? 'piece-knight'} me winner={won} score={mine?.solved} stats={mine} total={total} empty="Sin jugar" />
        <span className={styles.scoreVs}>vs</span>
        <Player name={rival?.name ?? 'Rival'} avatar={rival?.avatar ?? 'piece-pawn'} winner={lost} score={showTheirs ? theirs?.solved : undefined} stats={showTheirs ? theirs : undefined} total={total} empty={theirs ? 'Ya jugó' : 'Por jugar'} />
      </div>

      {c.status === 'open' && <p className={styles.resultNote}>Te avisaremos en las notificaciones cuando juegue. {timeLeft(c.expiresAt)}.</p>}
      {done && (
        <div className={styles.resultFoot}>
          <Badge tone="xp" icon="diamond">
            {won ? '+80 XP' : '+30 XP por jugar'}
          </Badge>
        </div>
      )}
    </Card>
  );
}

function Player({ name, avatar, me, winner, score, stats, total, empty }: { name: string; avatar: string; me?: boolean; winner?: boolean; score?: number; stats?: { solved: number; mistakes: number; timeMs: number }; total?: number; empty: string }) {
  return (
    <div className={[styles.player, winner && styles.playerWin].filter(Boolean).join(' ')}>
      {winner && <span className={styles.crown}>Ganador</span>}
      <Avatar avatar={avatar} name={name} size={52} me={me} />
      <strong className={styles.playerName}>{name}</strong>
      <span className={styles.playerScore}>
        {score ?? '–'}
        {score !== undefined && total ? <small>/{total}</small> : null}
      </span>
      {stats ? (
        <span className={styles.playerStats}>
          {stats.mistakes} {stats.mistakes === 1 ? 'fallo' : 'fallos'} · {formatMs(stats.timeMs)}
        </span>
      ) : (
        <span className={styles.playerStats}>{empty}</span>
      )}
    </div>
  );
}
