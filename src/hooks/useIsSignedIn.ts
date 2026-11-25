import { useAuthStore } from '@/store/authStore';
import { useClubStore } from '@/store/clubStore';

/** ¿Hay una cuenta activa? Con Supabase manda la sesión real; en modo demo, la del club simulado. */
export function useIsSignedIn(): boolean {
  const auth = useAuthStore();
  const clubStatus = useClubStore((s) => s.status);
  return auth.enabled ? auth.status === 'signed-in' : clubStatus !== 'signed-out' && clubStatus !== 'loading';
}
