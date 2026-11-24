import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, Card, Loader } from '@/components/ui';
import { clubRepo } from '@/services/club';
import { useClubStore } from '@/store/clubStore';
import { ClubOnboarding } from './ClubOnboarding';
import styles from './club.module.css';

/** Link para crear un club: /crear-club/:token (lo comparte el administrador). */
export function CreateClubPage() {
  const { token = '' } = useParams();
  const status = useClubStore((s) => s.status);
  const [valid, setValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (status === 'loading' || status === 'signed-out') return;
    let alive = true;
    clubRepo.redeemCreatorToken(token).then((ok) => alive && setValid(ok));
    return () => {
      alive = false;
    };
  }, [status, token]);

  if (status === 'loading') return <Loader />;
  if (status === 'signed-out') return <Navigate to={`/entrar?next=${encodeURIComponent(`/crear-club/${token}`)}`} replace />;
  if (status === 'ready') return <Navigate to="/club" replace />;
  if (valid === null) return <Loader />;
  if (!valid) {
    return (
      <div className={styles.auth}>
        <PageHeader icon="lock" title="Este link no es válido" subtitle="Pide al administrador que te envíe un link nuevo para crear tu club." />
        <Button to="/club" variant="secondary">
          Unirme con un código
        </Button>
      </div>
    );
  }
  return (
    <>
      <Card tone="accent" icon="seal" title="Te invitaron a crear un club" subtitle="Serás el organizador: podrás invitar participantes y nombrar colaboradores." />
      <ClubOnboarding />
    </>
  );
}
