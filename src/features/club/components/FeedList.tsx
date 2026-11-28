import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, Skeleton } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { CLUB_FEED_ID, clubRepo, type FeedItem, type Member } from '@/services/club';
import { timeAgo } from '../format';
import { useClubStore } from '@/store/clubStore';
import { Avatar } from './Avatar';
import { CommentThread } from './CommentThread';
import { DeleteConfirm } from './DeleteConfirm';
import styles from '../club.module.css';

interface Props {
  items: FeedItem[] | undefined;
  members: Member[] | undefined;
  meId: string;
  /** Entrada que se abre al llegar desde un aviso (`/club?post=…`) */
  openId?: string | null;
}

/** Muro del club: publicaciones de la gente y actividad («Valentina completó la lección…»). */
export function FeedList({ items, members, meId, openId }: Props) {
  if (!items || !members) return <Skeleton lines={5} height={44} />;
  if (!items.length) return <EmptyState icon="users" title="Aún no hay actividad" description="Cuando alguien del club publique o practique, aparecerá aquí." />;
  const byId = new Map(members.map((m) => [m.id, m]));
  return (
    <ul className={styles.feed}>
      {items.map((f) => (
        <FeedEntry key={f.id} item={f} members={byId} meId={meId} linked={f.id === openId} />
      ))}
    </ul>
  );
}

function FeedEntry({ item: f, members, meId, linked }: { item: FeedItem; members: Map<string, Member>; meId: string; linked: boolean }) {
  const ref = useRef<HTMLLIElement>(null);
  const [open, setOpen] = useState(linked);
  const [confirm, setConfirm] = useState(false);
  const reload = useClubStore((s) => s.forceReload);
  const m = members.get(f.memberId);
  const isClub = f.memberId === CLUB_FEED_ID;
  const isPost = f.kind === 'post';
  const name = f.memberId === meId ? 'Tú' : (m?.name ?? 'Alguien');
  const profile = f.memberId === meId ? '/progreso' : `/club/miembro/${f.memberId}`;

  useEffect(() => {
    if (!linked) return;
    setOpen(true);
    ref.current?.scrollIntoView({ block: 'center' });
  }, [linked]);

  return (
    <li ref={ref} className={[styles.feedItem, (f.isNew || Boolean(f.newReplies)) && styles.feedUnread, linked && styles.feedLinked].filter(Boolean).join(' ')}>
      {isClub ? (
        <span className={styles.clubIcon}>
          <Icon name={f.icon} />
        </span>
      ) : (
        <Avatar avatar={m?.avatar ?? 'piece-pawn'} name={m?.name ?? '—'} size={36} me={f.memberId === meId} />
      )}
      <div style={{ minWidth: 0 }}>
        {isPost ? (
          <>
            <p className={styles.feedText}>
              <Link to={profile}>{name}</Link> <span className={styles.postTime}>· {timeAgo(f.createdAt)}</span>
              {f.isNew && <span className={styles.newTag}>Nuevo</span>}
            </p>
            <p className={styles.postText}>{f.text}</p>
          </>
        ) : (
          <>
            <p className={styles.feedText}>
              {isClub ? (
                <strong>{f.text}</strong>
              ) : (
                <>
                  <Link to={profile}>{name}</Link> {f.text}
                </>
              )}
            </p>
            <span className={styles.feedTime}>
              <Icon name={f.icon} size="0.95em" /> {timeAgo(f.createdAt)}
            </span>
          </>
        )}
        {clubRepo.hasWall && (
          <>
            <div className={styles.actions}>
              <LikeButton item={f} onDone={reload} />
              <button type="button" className={styles.action} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
                <Icon name="comment" /> {f.commentCount ? `${f.commentCount} ${f.commentCount === 1 ? 'respuesta' : 'respuestas'}` : 'Responder'}
                {Boolean(f.newReplies) && <span className={styles.newTag}>{f.newReplies === 1 ? '1 nueva' : `${f.newReplies} nuevas`}</span>}
              </button>
              {isPost && f.memberId === meId && (
                <button type="button" className={[styles.action, styles.actionEnd, styles.delete].join(' ')} aria-label="Borrar mi publicación" title="Borrar" onClick={() => setConfirm(true)}>
                  <Icon name="trash" />
                </button>
              )}
            </div>
            {open && <CommentThread feedId={f.id} members={members} meId={meId} unread={f.isNew || Boolean(f.newReplies)} />}
            <DeleteConfirm
              open={confirm}
              title="¿Borrar la publicación?"
              description="También se borran sus respuestas. No se puede deshacer."
              onClose={() => setConfirm(false)}
              onConfirm={async () => {
                await clubRepo.deletePost(f.id);
                reload();
              }}
            />
          </>
        )}
      </div>
    </li>
  );
}

/** «Me gusta» que responde al instante y se revierte si falla. */
function LikeButton({ item, onDone }: { item: FeedItem; onDone: () => void }) {
  const saved = Boolean(item.likedByMe);
  const [wanted, setWanted] = useState<boolean | null>(null);
  const busy = useRef(false);
  const liked = wanted ?? saved;
  const count = (item.likes ?? 0) + Number(liked) - Number(saved);

  // Cuando los datos ya reflejan mi cambio, vuelven a mandar ellos
  useEffect(() => {
    if (wanted === saved) setWanted(null);
  }, [wanted, saved]);

  const toggle = async () => {
    if (busy.current) return;
    busy.current = true;
    setWanted(!liked);
    try {
      await clubRepo.toggleLike(item.id);
      onDone();
    } catch {
      setWanted(null);
    } finally {
      busy.current = false;
    }
  };

  return (
    <button type="button" className={[styles.action, liked && styles.actionOn].filter(Boolean).join(' ')} aria-pressed={liked} aria-label={`Me gusta: ${count}`} onClick={toggle}>
      <Icon name="heart" weight={liked ? 'fill' : 'regular'} /> {count > 0 ? count : 'Me gusta'}
    </button>
  );
}
