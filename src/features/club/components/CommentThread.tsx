import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button, Skeleton } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { clubRepo, type FeedComment, type Member } from '@/services/club';
import { WALL_TEXT_MAX } from '@/services/club/logic';
import { timeAgo } from '../format';
import { useClubQuery } from '../hooks/useClubQuery';
import { Avatar } from './Avatar';
import { DeleteConfirm } from './DeleteConfirm';
import styles from '../club.module.css';

interface Props {
  feedId: string;
  members: Map<string, Member>;
  meId: string;
  /** La entrada tiene algo sin leer */
  unread?: boolean;
}

/** Hilo de una entrada del muro: respuestas y caja para contestar. Abrirlo las marca como leídas. */
export function CommentThread({ feedId, members, meId, unread }: Props) {
  const comments = useClubQuery(() => clubRepo.getComments(feedId), [feedId]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<FeedComment | null>(null);
  // Se recuerdan las que llegaron sin leer para seguir resaltándolas mientras el hilo esté abierto
  const [fresh] = useState(() => new Set<string>());
  comments.data?.forEach((c) => c.isNew && fresh.add(c.id));

  const { data, reload } = comments;
  useEffect(() => {
    // Solo se avisa a la base de datos si de verdad hay algo sin leer
    if (!data || !(unread || data.some((c) => c.isNew))) return;
    clubRepo
      .markWallRead?.(feedId)
      .then((changed) => changed && reload())
      .catch(() => undefined);
  }, [data, unread, feedId, reload]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || !text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await clubRepo.addComment(feedId, text);
      setText('');
      comments.reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.thread}>
      {!comments.data && !comments.error && <Skeleton lines={2} height={36} />}
      {comments.data && comments.data.length > 0 && (
        <ul className={styles.comments} aria-live="polite">
          {comments.data.map((c) => {
            const author = members.get(c.memberId);
            const mine = c.memberId === meId;
            return (
              <li key={c.id} className={styles.comment}>
                <Avatar avatar={author?.avatar ?? 'piece-pawn'} name={author?.name ?? 'Alguien'} size={28} me={mine} />
                <div className={styles.commentBody}>
                  <div className={[styles.bubble, fresh.has(c.id) && styles.bubbleNew].filter(Boolean).join(' ')}>
                    {author && !mine ? (
                      <Link to={`/club/miembro/${c.memberId}`} className={styles.who}>
                        {author.name}
                      </Link>
                    ) : (
                      <span className={styles.who}>{mine ? 'Tú' : 'Alguien'}</span>
                    )}
                    <p className={styles.postText}>{c.text}</p>
                  </div>
                  <div className={styles.commentMeta}>
                    {fresh.has(c.id) && <span className={styles.newTag}>Nueva</span>}
                    <span>{timeAgo(c.createdAt)}</span>
                    {mine && (
                      <button type="button" className={styles.delete + ' ' + styles.deleteSmall} aria-label="Borrar mi respuesta" title="Borrar" onClick={() => setDeleting(c)}>
                        <Icon name="trash" />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <form className={styles.reply} onSubmit={send}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribe una respuesta" aria-label="Escribe una respuesta" maxLength={WALL_TEXT_MAX} />
        <Button type="submit" size="sm" loading={busy} disabled={!text.trim()}>
          Enviar
        </Button>
      </form>
      {(error ?? comments.error) && (
        <p className={styles.error} role="alert">
          {error ?? comments.error}
        </p>
      )}
      <DeleteConfirm
        open={Boolean(deleting)}
        title="¿Borrar la respuesta?"
        description="No se puede deshacer."
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          await clubRepo.deleteComment(deleting.id);
          comments.reload();
        }}
      />
    </div>
  );
}
