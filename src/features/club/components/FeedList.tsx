import { Link } from 'react-router-dom';
import { EmptyState, Skeleton } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { CLUB_FEED_ID, type FeedItem, type MemberSummary } from '@/services/club';
import { timeAgo } from '../format';
import { Avatar } from './Avatar';
import styles from '../club.module.css';

interface Props {
  items: FeedItem[] | undefined;
  members: MemberSummary[] | undefined;
  meId: string;
}

/** Actividad del club: «Valentina completó la lección…». */
export function FeedList({ items, members, meId }: Props) {
  if (!items || !members) return <Skeleton lines={5} height={44} />;
  if (!items.length) return <EmptyState icon="users" title="Aún no hay actividad" description="Cuando alguien del club practique, aparecerá aquí." />;
  const byId = new Map(members.map((m) => [m.member.id, m.member]));
  return (
    <ul className={styles.feed} aria-live="polite">
      {items.map((f) => {
        const m = byId.get(f.memberId);
        const isClub = f.memberId === CLUB_FEED_ID;
        return (
          <li key={f.id} className={styles.feedItem}>
            {isClub ? (
              <span className={styles.clubIcon}>
                <Icon name={f.icon} />
              </span>
            ) : (
              <Avatar avatar={m?.avatar ?? 'piece-pawn'} name={m?.name ?? '—'} size={36} me={f.memberId === meId} />
            )}
            <div style={{ minWidth: 0 }}>
              <p className={styles.feedText}>
                {isClub ? (
                  <strong>{f.text}</strong>
                ) : (
                  <>
                    <Link to={f.memberId === meId ? '/progreso' : `/club/miembro/${f.memberId}`}>{f.memberId === meId ? 'Tú' : (m?.name ?? 'Alguien')}</Link> {f.text}
                  </>
                )}
              </p>
              <span className={styles.feedTime}>
                <Icon name={f.icon} size="0.95em" /> {timeAgo(f.createdAt)}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
