import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ProgressRing, StatPill } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { useGameSummary } from '@/features/gamification/hooks/useGameSummary';
import { RatingInfoModal } from '@/features/gamification/components/RatingInfoModal';
import { AVATAR_CHOICES } from '@/features/club/components/Avatar';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import { clubRepo } from '@/services/club';
import { useAuthStore } from '@/store/authStore';
import { useClubStore } from '@/store/clubStore';
import styles from './TopBar.module.css';

/** Icono de perfil: menú para entrar, registrarse o cerrar sesión. */
function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  const clubSession = useClubStore((s) => s.session);
  const profile = useClubStore((s) => s.profile);
  const authStatus = useAuthStore((s) => s.status);
  const g = useGameSummary();
  const [ratingOpen, setRatingOpen] = useState(false);
  const signedIn = !!clubSession || authStatus === 'signed-in';
  const next = encodeURIComponent(pathname === '/entrar' ? '/' : pathname);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
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
  }, [open]);

  const pickAvatar = async (avatar: string) => {
    if (!profile || avatar === profile.avatar) return;
    await clubRepo.saveMyProfile({ name: profile.name, avatar });
    await useClubStore.getState().refresh();
  };

  const logout = async () => {
    setOpen(false);
    await useAuthStore.getState().signOut();
    if (clubRepo.isDemo) await clubRepo.signOut();
    await useClubStore.getState().refresh();
  };

  return (
    <div className={styles.profile} ref={ref}>
      <button type="button" className={styles.profileBtn} aria-label="Perfil" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {signedIn && profile ? <Icon name={profile.avatar} size="1.3rem" /> : <Icon name="user" size="1.25rem" weight={signedIn ? 'fill' : 'regular'} />}
      </button>
      {open && (
        <div className={styles.menu} role="menu">
          <button
            role="menuitem"
            type="button"
            className={styles.ratingRow}
            title="Toca para ver qué es tu puntaje y cómo funciona"
            onClick={() => {
              setOpen(false);
              setRatingOpen(true);
            }}
          >
            <Icon name="chart" />
            <span>
              Tu puntaje
              <small>Qué es y cómo sube</small>
            </span>
            <strong className="num">{g.rating}</strong>
          </button>
          {signedIn ? (
            <>
              <div className={styles.menuHead}>{profile?.name || clubSession?.email || 'Mi cuenta'}</div>
              {profile ? (
                <div className={styles.avatars} role="radiogroup" aria-label="Elige tu avatar">
                  {AVATAR_CHOICES.map((a) => (
                    <button key={a} type="button" role="radio" aria-checked={profile.avatar === a} className={[styles.avatarOpt, profile.avatar === a && styles.avatarOn].filter(Boolean).join(' ')} onClick={() => void pickAvatar(a)}>
                      <Icon name={a} size="1.3rem" />
                    </button>
                  ))}
                </div>
              ) : (
                <Link role="menuitem" to="/club" className={styles.menuItem}>
                  <Icon name="user-plus" /> Crear mi perfil y avatar
                </Link>
              )}
              <Link role="menuitem" to="/progreso" className={styles.menuItem}>
                <Icon name="chart" /> Mi progreso
              </Link>
              <Link role="menuitem" to="/ajustes" className={styles.menuItem}>
                <Icon name="settings" /> Ajustes
              </Link>
              <button role="menuitem" type="button" className={styles.menuItem} onClick={() => void logout()}>
                <Icon name="sign-out" /> Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <Link role="menuitem" to={`/entrar?next=${next}`} className={styles.menuItem}>
                <Icon name="user" /> Iniciar sesión
              </Link>
              <Link role="menuitem" to={`/entrar?next=${next}&registro=1`} className={styles.menuItem}>
                <Icon name="user-plus" /> Crear cuenta
              </Link>
            </>
          )}
        </div>
      )}
      <RatingInfoModal open={ratingOpen} onClose={() => setRatingOpen(false)} />
    </div>
  );
}

/** Cabecera tipo "mancheta": marca en móvil, nivel y cifras clave del día. */
export function TopBar() {
  const g = useGameSummary();
  return (
    <header className={styles.bar}>
      <Link to="/" className={styles.brand} aria-label="Inicio">
        <span className={styles.logo} aria-hidden>
          ♞
        </span>
        <span className={styles.brandText}>
          Chess
          <br />
          Team
        </span>
      </Link>
      <Link to="/progreso" className={styles.level} title={`Nivel ${g.level} · ${g.rank.name}`}>
        <ProgressRing value={g.levelRatio} size={36} stroke={3} color="var(--color-accent)">
          <span className={styles.rankIcon}>
            <Icon name={g.rank.icon} size="1.1rem" />
          </span>
        </ProgressRing>
        <span className={styles.levelText}>
          <strong>
            Nivel {g.level} · {g.rank.name}
          </strong>
          <span className="muted num">
            {g.levelCurrent}/{g.levelNeeded} XP
          </span>
        </span>
      </Link>
      <div className={styles.stats}>
        <StatPill icon="fire" value={g.streak} color={g.streak > 0 ? 'var(--color-streak)' : undefined} title={`Racha: ${g.streak} días · Mejor: ${g.streakBest}`} />
        {g.freezes > 0 && (
          <span className={styles.hideSm}>
            <StatPill icon="shield" value={g.freezes} title="Protectores de racha" />
          </span>
        )}
        <span className={styles.hideSm}>
          <StatPill icon="diamond" value={g.xpToday} label="XP hoy" color="var(--color-xp)" title="XP ganada hoy" />
        </span>
      </div>
      <NotificationBell />
      <ProfileMenu />
    </header>
  );
}
