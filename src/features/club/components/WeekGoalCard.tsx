import { Badge, Button, Card, ProgressBar, Skeleton } from '@/components/ui';
import type { ClubWeek, MemberSummary } from '@/services/club';
import { WEEK_METRIC_LABEL } from '@/services/club/logic';
import { addDays, diffDays, todayKey } from '@/lib/date';
import { Avatar } from './Avatar';
import styles from '../club.module.css';

interface Props {
  week: ClubWeek | undefined;
  members: MemberSummary[] | undefined;
  meId: string;
  compact?: boolean;
}

/** Meta colectiva + desafío semanal (los mismos 10 ejercicios para todos). */
export function WeekGoalCard({ week, members, meId, compact }: Props) {
  if (!week || !members) return <Skeleton lines={3} height={40} />;
  const meta = WEEK_METRIC_LABEL[week.metric];
  const ratio = week.progress / Math.max(1, week.target);
  const daysLeft = diffDays(todayKey(), addDays(week.weekStart, 6));
  const top = members
    .map((m) => ({ m, v: week.contributions[m.member.id] ?? 0 }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v);
  const played = week.results.some((r) => r.memberId === meId);
  const myResult = week.results.find((r) => r.memberId === meId);
  const best = [...week.results].sort((a, b) => b.solved - a.solved || a.timeMs - b.timeMs)[0];
  const bestName = best && members.find((m) => m.member.id === best.memberId)?.member.name;

  return (
    <>
      <Card
        tone={ratio >= 1 ? 'success' : 'default'}
        icon={meta.icon}
        title="Meta del club esta semana"
        subtitle={`${meta.verb} ${week.target} ${meta.label} entre todos · ${daysLeft <= 0 ? 'último día' : `quedan ${daysLeft + 1} días`}`}
      >
        <div className="stack" style={{ gap: 'var(--space-3)' }}>
          <p className={styles.goalNum}>
            {week.progress}
            <small> / {week.target} {meta.label}</small>
          </p>
          <ProgressBar value={ratio} color={ratio >= 1 ? 'var(--color-success)' : 'var(--color-accent)'} height={10} />
          {ratio >= 1 && <p style={{ margin: 0, fontWeight: 600 }}>¡Meta cumplida! Todo lo que sumen ahora es récord.</p>}
          {!compact && top.length > 0 && (
            <div className={styles.contrib}>
              {top.slice(0, 7).map(({ m, v }) => (
                <span key={m.member.id}>
                  <Avatar avatar={m.member.avatar} name={m.member.name} size={20} me={m.member.id === meId} /> {v}
                </span>
              ))}
            </div>
          )}
          {week.goalsMet > 0 && <Badge tone="success" icon="trophy">{week.goalsMet} {week.goalsMet === 1 ? 'meta cumplida' : 'metas cumplidas'}</Badge>}
        </div>
      </Card>
      {!compact && (
        <Card
          tone={played ? 'default' : 'accent'}
          icon="users"
          title="Desafío de la semana"
          subtitle={`${week.puzzleIds.length} ejercicios iguales para todo el club. Una sola oportunidad.`}
          actions={!played ? <Button to="/club/semana" size="sm" icon="play">Jugar</Button> : undefined}
        >
          <div className="row">
            {myResult && <Badge tone="primary" icon="check">Tu resultado: {myResult.solved}/{week.puzzleIds.length}</Badge>}
            <span className="muted" style={{ fontSize: '0.88rem' }}>
              {week.results.length} de {members.length} ya jugaron
              {best && bestName ? ` · va ganando ${best.memberId === meId ? 'tú' : bestName} (${best.solved}/${week.puzzleIds.length})` : ''}
            </span>
          </div>
        </Card>
      )}
    </>
  );
}
