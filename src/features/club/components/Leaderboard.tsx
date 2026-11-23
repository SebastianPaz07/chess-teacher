import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { clubRepo, type LeaderMetric, type LeaderPeriod, type LeaderRow, type MemberSummary } from '@/services/club';
import { useClubQuery } from '../hooks/useClubQuery';
import { Avatar } from './Avatar';
import { RivalNudge } from './RivalNudge';
import styles from '../club.module.css';

/** Lo que más pesa es estudiar: ejercicios y minutos. XP, racha y rating como referencia general. */
const METRICS: { value: LeaderMetric; label: string; unit: string; periods: LeaderPeriod[] }[] = [
  { value: 'puzzles', label: 'Ejercicios', unit: '', periods: ['week', 'all'] },
  { value: 'minutes', label: 'Minutos', unit: 'min', periods: ['week'] },
  { value: 'streak', label: 'Racha', unit: 'd', periods: ['all'] },
  { value: 'rating', label: 'Rating', unit: '', periods: ['all'] },
  { value: 'xp', label: 'XP', unit: 'XP', periods: ['week', 'all'] },
];

interface Props {
  meId: string;
  members: MemberSummary[] | undefined;
}

export function Leaderboard({ meId, members, initialMetric = 'puzzles' }: Props & { initialMetric?: LeaderMetric }) {
  const [period, setPeriod] = useState<LeaderPeriod>('week');
  const [metric, setMetric] = useState<LeaderMetric>(initialMetric);
  const meta = METRICS.find((m) => m.value === metric)!;
  const effectivePeriod = meta.periods.includes(period) ? period : meta.periods[0];
  const q = useClubQuery(() => clubRepo.getLeaderboard(effectivePeriod, metric), [effectivePeriod, metric]);
  const today = new Map(members?.map((m) => [m.member.id, m]) ?? []);
  const mine = q.data?.find((r) => r.member.id === meId);
  const meVisible = q.data && q.data.length <= 8;

  return (
    <div className={styles.section}>
      <div className={styles.filters} role="group" aria-label="Periodo">
        {(['week', 'all'] as const).map((p) => (
          <button key={p} type="button" className={[styles.chip, effectivePeriod === p && styles.chipOn].filter(Boolean).join(' ')} onClick={() => setPeriod(p)} disabled={!meta.periods.includes(p)} aria-pressed={effectivePeriod === p}>
            {p === 'week' ? 'Esta semana' : 'Total'}
          </button>
        ))}
      </div>
      <div className={styles.filters} role="group" aria-label="Métrica">
        {METRICS.map((m) => (
          <button key={m.value} type="button" className={[styles.chip, metric === m.value && styles.chipOn].filter(Boolean).join(' ')} onClick={() => setMetric(m.value)} aria-pressed={metric === m.value}>
            {m.label}
          </button>
        ))}
      </div>
      {metric !== 'rating' && metric !== 'streak' && <RivalNudge rows={q.data} members={members} meId={meId} unit={metric === 'puzzles' ? 'ejercicios' : metric === 'minutes' ? 'minutos' : 'XP'} />}
      {!q.data ? (
        <Skeleton lines={6} height={52} />
      ) : (
        <ol className={styles.list}>
          {q.data.map((r) => (
            <LeaderItem key={r.member.id} row={r} me={r.member.id === meId} unit={meta.unit} active={today.get(r.member.id)?.practicedToday} />
          ))}
        </ol>
      )}
      {mine && !meVisible && (
        <div className={styles.stickyMe}>
          <LeaderItem row={mine} me unit={meta.unit} active={today.get(meId)?.practicedToday} />
        </div>
      )}
      <p className="muted" style={{ fontSize: '0.82rem', margin: 0 }}>
        {metric === 'minutes'
          ? 'Minutos de estudio activo (con la app abierta en una práctica). La semana va de lunes a domingo.'
          : effectivePeriod === 'week'
            ? 'La semana va de lunes a domingo. La flecha compara con ayer.'
            : 'Acumulado desde que entraste al club.'}
      </p>
    </div>
  );
}

function LeaderItem({ row, me, unit, active }: { row: LeaderRow; me: boolean; unit: string; active?: boolean }) {
  const delta = row.prevRank !== null ? row.prevRank - row.rank : 0;
  return (
    <li>
      <Link to={me ? '/progreso' : `/club/miembro/${row.member.id}`} className={[styles.row, me && styles.rowMe].filter(Boolean).join(' ')}>
        <span className={[styles.rank, row.rank === 1 && styles.rank1].filter(Boolean).join(' ')}>{row.rank === 1 ? <Icon name="crown" /> : row.rank}</span>
        <span className={styles.rowMain}>
          <Avatar avatar={row.member.avatar} name={row.member.name} size={36} me={me} active={active} />
          <span className={styles.rowText}>
            <span className={styles.rowName}>{me ? `${row.member.name} (tú)` : row.member.name}</span>
          </span>
        </span>
        <span className={styles.rowEnd}>
          <span className={[styles.move, delta > 0 && styles.up, delta < 0 && styles.down].filter(Boolean).join(' ')} aria-label={delta ? `${delta > 0 ? 'Sube' : 'Baja'} ${Math.abs(delta)}` : undefined}>
            {delta > 0 && (
              <>
                <Icon name="caret-up" size="1em" />
                {delta}
              </>
            )}
            {delta < 0 && (
              <>
                <Icon name="caret-down" size="1em" />
                {-delta}
              </>
            )}
          </span>
          <span className={styles.value}>
            {row.value}
            {unit && <small className="muted"> {unit}</small>}
          </span>
        </span>
      </Link>
    </li>
  );
}
