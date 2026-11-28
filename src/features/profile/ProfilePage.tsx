import { useState } from 'react';
import { MenuCards } from '@/components/layout/MenuCards';
import { Button, Card } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { AVATAR_CHOICES } from '@/features/club/components/Avatar';
import { RatingInfoModal } from '@/features/gamification/components/RatingInfoModal';
import { useGameSummary } from '@/features/gamification/hooks/useGameSummary';
import { clubRepo } from '@/services/club';
import { ACHIEVEMENTS } from '@/services/game/achievements';
import { useAuthStore } from '@/store/authStore';
import { useClubStore } from '@/store/clubStore';
import { useGameStore } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import styles from './ProfilePage.module.css';

/** Perfil: cuenta, puntaje y avatar, con accesos a progreso, logros y ajustes. */
export function ProfilePage() {
  const session = useClubStore((s) => s.session);
  const profile = useClubStore((s) => s.profile);
  const authStatus = useAuthStore((s) => s.status);
  const playerName = useSettingsStore((s) => s.playerName);
  const medals = useGameStore((s) => Object.keys(s.achievements).length);
  const g = useGameSummary();
  const [ratingOpen, setRatingOpen] = useState(false);
  const signedIn = !!session || authStatus === 'signed-in';
  // Sin nombre todavía: la parte del correo antes de la @ (el correo completo va debajo)
  const name = profile?.name || playerName || session?.email.split('@')[0] || 'Mi perfil';

  const pickAvatar = async (avatar: string) => {
    if (!profile || avatar === profile.avatar) return;
    await clubRepo.saveMyProfile({ name: profile.name, avatar });
    await useClubStore.getState().refresh();
  };

  const logout = async () => {
    await useAuthStore.getState().signOut();
    if (clubRepo.isDemo) await clubRepo.signOut();
    await useClubStore.getState().refresh();
  };

  return (
    <div className={`stack ${styles.page}`}>
      <header className={styles.head}>
        <span className={styles.avatar}>
          <Icon name={signedIn && profile ? profile.avatar : 'user'} />
        </span>
        <div className={styles.who}>
          <h1 className={styles.name}>{name}</h1>
          <p className="muted">
            Nivel {g.level} · {g.rank.name}
          </p>
          {session?.email && <p className={`muted ${styles.email}`}>{session.email}</p>}
        </div>
      </header>

      <button type="button" className={styles.rating} onClick={() => setRatingOpen(true)}>
        <Icon name="chart" />
        <span>
          Tu puntaje
          <small>Qué es y cómo sube</small>
        </span>
        <strong className="num">{g.rating}</strong>
      </button>

      {!signedIn && (
        <Card tone="primary" title="Guarda tu avance" subtitle="Con una cuenta puedes entrar a tu club y no perder tu progreso.">
          <div className="row">
            <Button to="/entrar?next=%2Fperfil" icon="user">
              Iniciar sesión
            </Button>
            <Button to="/entrar?next=%2Fperfil&registro=1" variant="secondary" icon="user-plus">
              Crear cuenta
            </Button>
          </div>
        </Card>
      )}

      {signedIn && (
        <Card title="Tu avatar">
          {profile ? (
            <div className={styles.avatars} role="radiogroup" aria-label="Elige tu avatar">
              {AVATAR_CHOICES.map((a) => (
                <button key={a} type="button" role="radio" aria-checked={profile.avatar === a} className={[styles.option, profile.avatar === a && styles.optionOn].filter(Boolean).join(' ')} onClick={() => void pickAvatar(a)}>
                  <Icon name={a} />
                </button>
              ))}
            </div>
          ) : (
            <Button to="/club" variant="secondary" icon="user-plus">
              Crear mi perfil y avatar
            </Button>
          )}
        </Card>
      )}

      <MenuCards
        label="Tu cuenta"
        items={[
          { to: '/progreso', icon: 'progress', title: 'Progreso', detail: 'Tu actividad, tus temas y lo que ya dominas.' },
          { to: '/logros', icon: 'trophy', title: 'Logros', detail: 'Tus medallas y el camino de rangos.', meta: `${medals}/${ACHIEVEMENTS.length} medallas` },
          { to: '/ajustes', icon: 'settings', title: 'Ajustes', detail: 'Tu nombre, tu plan, el tema, el sonido y tus datos.' },
        ]}
      />

      {signedIn && (
        <Button variant="ghost" icon="sign-out" onClick={() => void logout()}>
          Cerrar sesión
        </Button>
      )}
      <RatingInfoModal open={ratingOpen} onClose={() => setRatingOpen(false)} />
    </div>
  );
}
