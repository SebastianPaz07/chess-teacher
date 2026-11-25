import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, Card } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { clubRepo } from '@/services/club';
import { useClubQuery } from './hooks/useClubQuery';
import { useClubStore } from '@/store/clubStore';
import { useSettingsStore } from '@/store/settingsStore';
import { AVATAR_CHOICES, Avatar } from './components/Avatar';
import styles from './club.module.css';

/** Primeros pasos: tu nombre y pieza, luego crear un club o unirte con un código. */
export function ClubOnboarding({ initialCode }: { initialCode?: string }) {
  const status = useClubStore((s) => s.status);
  const profile = useClubStore((s) => s.profile);
  return status === 'no-profile' || !profile ? <ProfileStep /> : <ClubStep initialCode={initialCode} />;
}

function ProfileStep() {
  const playerName = useSettingsStore((s) => s.playerName);
  const update = useSettingsStore((s) => s.update);
  const refresh = useClubStore((s) => s.refresh);
  const [name, setName] = useState(playerName);
  const [avatar, setAvatar] = useState(AVATAR_CHOICES[0]);
  const [busy, setBusy] = useState(false);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    await clubRepo.saveMyProfile({ name, avatar });
    if (!playerName) update({ playerName: name.trim() });
    await refresh();
    setBusy(false);
  };

  return (
    <div className={styles.auth}>
      <PageHeader icon="user" eyebrow="Paso 1 de 2" title="¿Cómo te verán en el club?" />
      <Card>
        <form className="stack" onSubmit={save}>
          <label className={styles.field}>
            <span>Tu nombre</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} required placeholder="Como te conocen en el club" autoFocus />
          </label>
          <div className={styles.field}>
            <span>Tu pieza</span>
            <div className={styles.pieces} role="radiogroup" aria-label="Avatar">
              {AVATAR_CHOICES.map((a) => (
                <button key={a} type="button" role="radio" aria-checked={avatar === a} className={[styles.pieceBtn, avatar === a && styles.pieceOn].filter(Boolean).join(' ')} onClick={() => setAvatar(a)}>
                  <Avatar avatar={a} name={a} size={48} me={avatar === a} />
                </button>
              ))}
            </div>
          </div>
          <Button type="submit" size="lg" block loading={busy} disabled={!name.trim()}>
            Continuar
          </Button>
        </form>
      </Card>
    </div>
  );
}

function ClubStep({ initialCode }: { initialCode?: string }) {
  const navigate = useNavigate();
  const refresh = useClubStore((s) => s.refresh);
  const [clubName, setClubName] = useState('');
  const [code, setCode] = useState(initialCode ?? '');
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canCreate = useClubQuery(() => clubRepo.canCreateClub());

  const run = async (kind: 'create' | 'join', fn: () => Promise<unknown>) => {
    setBusy(kind);
    setError(null);
    try {
      await fn();
      await refresh();
      navigate('/club', { replace: true });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={styles.auth} style={{ maxWidth: 760 }}>
      <PageHeader icon="users" eyebrow="Paso 2 de 2" title="Tu club" subtitle={canCreate.data ? 'Únete al club de tus compañeros con su código, o crea uno nuevo e invítalos.' : 'Únete al club con el código o el link que te compartió tu organizador.'} />
      {error && <p style={{ color: 'var(--color-danger)', margin: 0 }}>{error}</p>}
      <div className={canCreate.data ? styles.choice : undefined}>
        <Card tone={initialCode ? 'accent' : 'default'} icon="user-plus" title="Unirme con un código">
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              run('join', () => clubRepo.joinClub(code));
            }}
          >
            <label className={styles.field}>
              <span>Código de invitación</span>
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={8} placeholder="Ej. K7PQ2M" autoCapitalize="characters" style={{ letterSpacing: '0.2em', fontWeight: 700 }} />
            </label>
            <Button type="submit" block loading={busy === 'join'} disabled={code.trim().length < 4}>
              Unirme
            </Button>
          </form>
        </Card>
        {canCreate.data && (
        <Card icon="flag" title="Crear un club">
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              run('create', () => clubRepo.createClub(clubName));
            }}
          >
            <label className={styles.field}>
              <span>Nombre del club</span>
              <input value={clubName} onChange={(e) => setClubName(e.target.value)} maxLength={40} placeholder="Ej. Club de los jueves" />
            </label>
            <Button type="submit" variant="secondary" block loading={busy === 'create'} disabled={clubName.trim().length < 3}>
              Crear y obtener código
            </Button>
          </form>
        </Card>
        )}
      </div>
      {import.meta.env.DEV && clubRepo.isDemo && (
        <p className={styles.demo}>
          <Icon name="flask" /> Modo demo: cualquier código de 6 caracteres funciona, y el club se llena con 6 compañeros simulados que practican, te retan y te animan, para que puedas probar la dinámica.
        </p>
      )}
    </div>
  );
}
