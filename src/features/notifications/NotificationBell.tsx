import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { timeAgo } from '@/features/club/format';
import { useClubStore } from '@/store/clubStore';
import { unreadCount, useNotificationsStore } from './notificationsStore';
import styles from './NotificationBell.module.css';

/** Campana de avisos del club: retos, ánimos, ranking y novedades de tus compañeros. */
export function NotificationBell() {
  const status = useClubStore((s) => s.status);
  const meId = useClubStore((s) => s.session?.userId ?? '');
  const version = useClubStore((s) => s.version);
  const notices = useNotificationsStore((s) => s.notices);
  const seenAt = useNotificationsStore((s) => s.seenAt);
  const load = useNotificationsStore((s) => s.load);
  const markSeen = useNotificationsStore((s) => s.markSeen);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();

  // Carga al entrar y cuando el club cambia; el store no repite antes de 90 s
  useEffect(() => {
    if (status === 'ready') void load(meId);
  }, [status, meId, version, load]);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    void load(meId);
    const close = (e: Event) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open, load, meId]);

  if (status !== 'ready') return null;
  const unread = unreadCount(notices, seenAt);

  const toggle = () => {
    // Al cerrar se marcan como vistas (mientras está abierta se distingue lo nuevo)
    if (open) markSeen();
    setOpen(!open);
  };

  return (
    <div className={styles.wrap} ref={ref}>
      <button type="button" className={styles.btn} aria-label={unread ? `Notificaciones: ${unread} nuevas` : 'Notificaciones'} aria-haspopup="dialog" aria-expanded={open} onClick={toggle}>
        <Icon name="bell" size="1.2rem" />
        {unread > 0 && <span className={styles.badge}>{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className={styles.panel} role="dialog" aria-label="Notificaciones">
          <div className={styles.head}>
            <strong>Notificaciones</strong>
            <button type="button" className={styles.link} onClick={markSeen}>
              Marcar como vistas
            </button>
          </div>
          {notices.length === 0 ? (
            <p className={styles.empty}>Todo tranquilo por ahora. Aquí verás retos, ánimos y movimientos del ranking.</p>
          ) : (
            <ul className={styles.list}>
              {notices.map((n) => (
                <li key={n.id}>
                  <Link
                    to={n.to}
                    className={[styles.item, n.at > seenAt && styles.fresh].filter(Boolean).join(' ')}
                    onClick={() => {
                      markSeen();
                      setOpen(false);
                    }}
                  >
                    <span className={[styles.icon, n.action && styles.iconAction].filter(Boolean).join(' ')}>
                      <Icon name={n.icon} />
                    </span>
                    <span className={styles.text}>
                      <strong>{n.title}</strong>
                      {n.detail && <small>{n.detail}</small>}
                    </span>
                    <span className={styles.time}>{timeAgo(n.at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
