import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, Card } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { clubRepo } from '@/services/club';
import { useAuthStore } from '@/store/authStore';
import { useClubStore } from '@/store/clubStore';
import styles from '@/features/club/club.module.css';

type Mode = 'link' | 'password';
type Step = 'form' | 'sent-link' | 'sent-confirm' | 'sent-reset';

/**
 * Entrar: enlace mágico por correo o correo + contraseña (Supabase Auth).
 * Si Supabase no está configurado, queda el modo demo (el "correo" se simula).
 */
export function LoginPage() {
  const [params] = useSearchParams();
  const next = params.get('next') || '/club';
  const recovering = params.get('recuperar') === '1';
  const navigate = useNavigate();
  const auth = useAuthStore();
  const clubStatus = useClubStore((s) => s.status);
  const refresh = useClubStore((s) => s.refresh);
  const [mode, setMode] = useState<Mode>('link');
  const [creating, setCreating] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<Step>('form');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void useAuthStore.getState().init();
  }, []);

  const clubReady = clubStatus !== 'loading' && clubStatus !== 'signed-out';
  const signedIn = auth.enabled ? auth.status === 'signed-in' && clubReady : clubReady;
  if (signedIn && step === 'form' && !recovering) return <Navigate to={next} replace />;

  const guard = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submitLink = (e: FormEvent) => {
    e.preventDefault();
    void guard(async () => {
      if (auth.enabled) await auth.signInWithMagicLink(email);
      else await clubRepo.requestMagicLink(email);
      setStep('sent-link');
    });
  };

  const submitPassword = (e: FormEvent) => {
    e.preventDefault();
    void guard(async () => {
      if (creating) {
        const active = await auth.signUp(email, password);
        if (!active) setStep('sent-confirm');
      } else {
        await auth.signInWithPassword(email, password);
      }
    });
  };

  const forgot = () => {
    if (!email) return setError('Escribe tu correo arriba y vuelve a pulsar.');
    void guard(async () => {
      await auth.resetPassword(email);
      setStep('sent-reset');
    });
  };

  const savePassword = (e: FormEvent) => {
    e.preventDefault();
    void guard(async () => {
      await auth.updatePassword(password);
      navigate(next, { replace: true });
    });
  };

  const openDemoLink = async () => {
    setBusy(true);
    await clubRepo.confirmMagicLink(email);
    await refresh();
    navigate(next, { replace: true });
  };

  const header = <PageHeader icon="users" eyebrow="Club de ajedrez" title="Entra a tu club" subtitle="Practica con tus compañeros: rankings, rachas, retos y una meta semanal entre todos." />;
  const errorLine = error && <p style={{ color: 'var(--color-danger)', margin: 0 }}>{error}</p>;
  const emailField = (
    <label className={styles.field}>
      <span>Tu correo</span>
      <input type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@correo.com" />
    </label>
  );

  // Llegó desde el enlace de "olvidé mi contraseña"
  if (recovering && auth.status === 'signed-in') {
    return (
      <div className={styles.auth}>
        {header}
        <Card title="Nueva contraseña" icon="shield">
          <form className="stack" onSubmit={savePassword}>
            <label className={styles.field}>
              <span>Nueva contraseña</span>
              <input type="password" autoComplete="new-password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            {errorLine}
            <Button type="submit" size="lg" block loading={busy}>
              Guardar contraseña
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  if (step !== 'form') {
    const text = {
      'sent-link': 'Ábrelo desde este dispositivo para entrar.',
      'sent-confirm': 'Confirma tu correo con ese enlace y luego vuelve a entrar con tu contraseña.',
      'sent-reset': 'Ábrelo para elegir una contraseña nueva.',
    }[step];
    return (
      <div className={styles.auth}>
        {header}
        <Card tone="primary" icon="envelope" title="Revisa tu correo" subtitle={`Enviamos un enlace a ${email}.`}>
          <div className="stack">
            <p style={{ margin: 0 }}>{text}</p>
            {!auth.enabled && clubRepo.isDemo && (
              <>
                <p className={styles.demo}>
                  <Icon name="flask" /> Modo demo: todavía no hay servidor de correo. Pulsa el botón para simular que abriste el enlace.
                </p>
                <Button size="lg" block onClick={openDemoLink} loading={busy}>
                  Abrir el enlace (demo)
                </Button>
              </>
            )}
            <Button variant="ghost" onClick={() => setStep('form')}>
              Volver
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.auth}>
      {header}
      <Card>
        {auth.enabled && (
          <div className="row" style={{ marginBottom: 'var(--space-3)' }}>
            <Button variant={mode === 'link' ? 'primary' : 'ghost'} size="sm" onClick={() => setMode('link')}>
              Enlace por correo
            </Button>
            <Button variant={mode === 'password' ? 'primary' : 'ghost'} size="sm" onClick={() => setMode('password')}>
              Correo y contraseña
            </Button>
          </div>
        )}
        {mode === 'link' || !auth.enabled ? (
          <form className="stack" onSubmit={submitLink}>
            {emailField}
            {errorLine}
            <Button type="submit" size="lg" block icon="envelope" loading={busy}>
              Enviarme el enlace
            </Button>
            <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
              Sin contraseñas: te enviamos un enlace para entrar. Tu progreso sigue guardado en este dispositivo aunque no entres.
            </p>
          </form>
        ) : (
          <form className="stack" onSubmit={submitPassword}>
            {emailField}
            <label className={styles.field}>
              <span>Contraseña</span>
              <input type="password" autoComplete={creating ? 'new-password' : 'current-password'} minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            {errorLine}
            <Button type="submit" size="lg" block loading={busy}>
              {creating ? 'Crear mi cuenta' : 'Entrar'}
            </Button>
            <div className="row">
              <Button variant="ghost" size="sm" onClick={() => setCreating((c) => !c)}>
                {creating ? 'Ya tengo cuenta' : 'Crear una cuenta'}
              </Button>
              {!creating && (
                <Button variant="ghost" size="sm" onClick={forgot}>
                  Olvidé mi contraseña
                </Button>
              )}
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
