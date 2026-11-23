import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, Card } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { clubRepo } from '@/services/club';
import { useClubStore } from '@/store/clubStore';
import styles from '@/features/club/club.module.css';

/**
 * Entrar con enlace mágico: escribes tu correo y te llega un enlace.
 * En el modo demo el "correo" se simula con un botón.
 */
export function LoginPage() {
  const [params] = useSearchParams();
  const next = params.get('next') || '/club';
  const navigate = useNavigate();
  const status = useClubStore((s) => s.status);
  const refresh = useClubStore((s) => s.refresh);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status !== 'loading' && status !== 'signed-out' && !sent) return <Navigate to={next} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await clubRepo.requestMagicLink(email);
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const openLink = async () => {
    setBusy(true);
    await clubRepo.confirmMagicLink(email);
    await refresh();
    navigate(next, { replace: true });
  };

  return (
    <div className={styles.auth}>
      <PageHeader icon="users" eyebrow="Club de ajedrez" title="Entra a tu club" subtitle="Practica con tus compañeros: rankings, rachas, retos y una meta semanal entre todos." />
      {!sent ? (
        <Card>
          <form className="stack" onSubmit={submit}>
            <label className={styles.field}>
              <span>Tu correo</span>
              <input type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@correo.com" />
            </label>
            {error && <p style={{ color: 'var(--color-danger)', margin: 0 }}>{error}</p>}
            <Button type="submit" size="lg" block icon="envelope" loading={busy}>
              Enviarme el enlace
            </Button>
            <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
              Sin contraseñas: te enviamos un enlace para entrar. Tu progreso sigue guardado en este dispositivo aunque no entres.
            </p>
          </form>
        </Card>
      ) : (
        <Card tone="primary" icon="envelope" title="Revisa tu correo" subtitle={`Enviamos un enlace a ${email}.`}>
          <div className="stack">
            <p style={{ margin: 0 }}>Ábrelo desde este dispositivo para entrar.</p>
            {clubRepo.isDemo && (
              <>
                <p className={styles.demo}>
                  <Icon name="flask" /> Modo demo: todavía no hay servidor de correo. Pulsa el botón para simular que abriste el enlace.
                </p>
                <Button size="lg" block onClick={openLink} loading={busy}>
                  Abrir el enlace (demo)
                </Button>
              </>
            )}
            <Button variant="ghost" onClick={() => setSent(false)}>
              Usar otro correo
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
