import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { clubRepo, type LeaderMetric, type LeaderPeriod, type LeaderRow, type MemberSummary } from '@/services/club';
import { useClubQuery } from '../hooks/useClubQuery';
import { Avatar } from './Avatar';
import { Podium } from './Podium';
import { RankUpBanner, useRankUp } from './RankUp';
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
  const selectMetric = (v: LeaderMetric) => {
    setMetric(v);
    const m = METRICS.find((x) => x.value === v)!;
    if (!m.periods.includes(period)) setPeriod(m.periods[0]);
  };
  const effectivePeriod = meta.periods.includes(period) ? period : meta.periods[0];
  // Guardado por filtro: al volver se pinta lo último visto mientras llega lo nuevo
  const q = useClubQuery(() => clubRepo.getLeaderboard(effectivePeriod, metric), [effectivePeriod, metric], true, `board:${effectivePeriod}:${metric}`);
  const today = new Map(members?.map((m) => [m.member.id, m]) ?? []);
  const mine = q.data?.find((r) => r.member.id === meId);
  const meVisible = q.data && q.data.length <= 8;
  const rankUp = useRankUp(`${effectivePeriod}:${metric}`, mine?.rank);
  const activeIds = new Set([...today.values()].filter((m) => m.practicedToday).map((m) => m.member.id));
  const rest = q.data?.slice(3) ?? [];

  return (
    <div className={styles.section}>
      <div className={styles.filterBar}>
        <div className={styles.segmented} role="group" aria-label="Periodo">
          {(['week', 'all'] as const).map((p) => (
            <button key={p} type="button" className={[styles.seg, effectivePeriod === p && styles.segOn].filter(Boolean).join(' ')} onClick={() => setPeriod(p)} disabled={!meta.periods.includes(p)} aria-pressed={effectivePeriod === p}>
              {p === 'week' ? 'Semana' : 'Total'}
            </button>
          ))}
        </div>
        <select className={styles.select} value={metric} onChange={(e) => selectMetric(e.target.value as LeaderMetric)} aria-label="Ordenar por">
          {METRICS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
      <RankUpBanner gained={rankUp.gained} rank={mine?.rank} onClose={rankUp.dismiss} />
      {metric !== 'rating' && metric !== 'streak' && <RivalNudge rows={q.data} members={members} meId={meId} unit={metric === 'puzzles' ? 'ejercicios' : metric === 'minutes' ? 'minutos' : 'XP'} />}
      {!q.data ? (
        <Skeleton lines={6} height={52} />
      ) : (
        <>
          <Podium rows={q.data} meId={meId} unit={meta.unit} activeIds={activeIds} />
          {rest.length > 0 && (
            <ol className={styles.list} start={4}>
              {rest.map((r) => (
                <LeaderItem key={r.member.id} row={r} me={r.member.id === meId} unit={meta.unit} active={today.get(r.member.id)?.practicedToday} />
              ))}
            </ol>
          )}
        </>
      )}
      {mine && mine.rank > 3 && !meVisible && (
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
