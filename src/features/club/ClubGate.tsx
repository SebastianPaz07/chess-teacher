import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader } from '@/components/ui';
import { useClubStore } from '@/store/clubStore';
import { ClubOnboarding } from './ClubOnboarding';

/** Protege las pantallas del club: sesión → perfil → club → contenido. */
export function ClubGate({ children }: { children: ReactNode }) {
  const status = useClubStore((s) => s.status);
  const location = useLocation();
  if (status === 'loading') return <Loader label="Abriendo el club…" />;
  if (status === 'signed-out') return <Navigate to={`/entrar?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (status !== 'ready') return <ClubOnboarding />;
  return <>{children}</>;
}
