import { useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui';
import { clubRepo, type Member } from '@/services/club';
import { WALL_TEXT_MAX } from '@/services/club/logic';
import { Avatar } from './Avatar';
import styles from '../club.module.css';

/** Caja para publicar un mensaje en el muro del club. */
export function PostComposer({ me, onPosted }: { me: Member | undefined; onPosted: () => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const field = useRef<HTMLTextAreaElement>(null);

  // La caja empieza en una línea y crece con el texto (el tope lo pone el CSS)
  useLayoutEffect(() => {
    const el = field.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`;
  }, [text]);

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (busy || !text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await clubRepo.createPost(text);
      setText('');
      onPosted();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className={styles.composer} onSubmit={submit}>
      <Avatar avatar={me?.avatar ?? 'piece-knight'} name={me?.name ?? 'Tú'} size={40} me />
      <textarea
        ref={field}
        className={styles.textarea}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && (e.ctrlKey || e.metaKey) && void submit()}
        placeholder="¿Qué quieres compartir?"
        aria-label="Escribe una publicación para el club"
        maxLength={WALL_TEXT_MAX}
        rows={1}
      />
      <Button type="submit" size="sm" className={styles.send} icon="arrow-right" loading={busy} disabled={!text.trim()} aria-label="Publicar" title="Publicar" />
      {/* El contador solo aparece cuando queda poco espacio */}
      {text.length >= WALL_TEXT_MAX - 50 && (
        <span className={styles.counter}>
          {text.length}/{WALL_TEXT_MAX}
        </span>
      )}
      {error && (
        <p className={[styles.error, styles.composerError].join(' ')} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
