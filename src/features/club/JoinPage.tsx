import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Loader } from '@/components/ui';
import { clubRepo } from '@/services/club';
import { useClubStore } from '@/store/clubStore';
import { ClubOnboarding } from './ClubOnboarding';
import styles from './club.module.css';

/** Enlace de invitación: /unirse/K7PQ2M (se comparte por WhatsApp). */
export function JoinPage() {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const status = useClubStore((s) => s.status);
  const club = useClubStore((s) => s.club);
  const refresh = useClubStore((s) => s.refresh);
  const [busy, setBusy] = useState(false);
  const upper = code.toUpperCase();

  if (status === 'loading') return <Loader />;
  if (status === 'signed-out') return <Navigate to={`/entrar?next=${encodeURIComponent(`/unirse/${upper}`)}`} replace />;
  if (status !== 'ready') return <ClubOnboarding initialCode={upper} />;
  if (club?.inviteCode === upper) return <Navigate to="/club" replace />;

  const switchClub = async () => {
    setBusy(true);
    await clubRepo.leaveClub();
    await clubRepo.joinClub(upper);
    await refresh();
    navigate('/club', { replace: true });
  };

  return (
    <div className={styles.auth}>
      <Card tone="accent" icon="users" title={`Invitación al club ${upper}`} subtitle={`Ahora estás en «${club?.name}». Solo puedes pertenecer a un club a la vez.`}>
        <div className="row">
          <Button onClick={switchClub} loading={busy}>
            Cambiarme de club
          </Button>
          <Button variant="ghost" to="/club">
            Quedarme en {club?.name}
          </Button>
        </div>
      </Card>
    </div>
  );
}
