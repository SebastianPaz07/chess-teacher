import { useRef, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, Card, Modal } from '@/components/ui';
import { todayKey } from '@/lib/date';
import { exportProgress, importProgress, resetProgress } from '@/services/storage/localStorageAdapter';
import { useGameStore } from '@/store/gameStore';
import { useProgressStore } from '@/store/progressStore';
import { useSettingsStore, type ThemeMode } from '@/store/settingsStore';
import { InviteButton } from '@/features/club/components/InviteButton';
import { clubRepo } from '@/services/club';
import { useClubStore } from '@/store/clubStore';
import { useAuthStore } from '@/store/authStore';
import { formatDays } from '@/features/onboarding/days';
import styles from './SettingsPage.module.css';

export function SettingsPage() {
  const s = useSettingsStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const placementLevel = useProgressStore((st) => st.placementLevel);
  const rating = useGameStore((st) => st.rating);
  const club = useClubStore();
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [simMsg, setSimMsg] = useState<string | null>(null);

  const sim = async (label: string, fn: () => Promise<void> | void) => {
    await fn();
    club.bump();
    setSimMsg(label);
    window.setTimeout(() => setSimMsg(null), 2500);
  };

  const download = () => {
    const blob = new Blob([exportProgress()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ajedrez-progreso-${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const upload = async (file?: File) => {
    if (!file) return;
    try {
      importProgress(await file.text());
      window.location.reload();
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  return (
    <div className="stack" style={{ maxWidth: 720 }}>
      <PageHeader icon="settings" title="Ajustes" />
      <Card title="Perfil" icon="user">
        <label className={styles.field}>
          <span>Tu nombre</span>
          <input value={s.playerName} onChange={(e) => s.update({ playerName: e.target.value })} placeholder="¿Cómo te llamo?" />
        </label>
        <div className={styles.field}>
          <span>Plan de entrenamiento</span>
          <p className="muted" style={{ margin: 0, fontWeight: 500 }}>
            {s.dailyMinutes} min por día · {formatDays(s.trainingDays)}
          </p>
        </div>
        <Button to="/empezar" variant="secondary" size="sm">
          Cambiar mi plan
        </Button>
      </Card>
      <Card title="Cuenta y club" icon="users">
        <section className={styles.block}>
          <h3 className={styles.blockTitle}>Cuenta</h3>
          {club.session ? (
            <div className={styles.line}>
              <div className={styles.lineText}>
                <span className={styles.lineLabel}>Sesión iniciada</span>
                <strong className={styles.lineValue}>{club.session.email}</strong>
              </div>
              <Button variant="secondary" size="sm" icon="sign-out" onClick={() => useAuthStore.getState().signOut().then(() => clubRepo.signOut()).then(club.refresh)}>
                Cerrar sesión
              </Button>
            </div>
          ) : (
            <div className={styles.line}>
              <div className={styles.lineText}>
                <span className={styles.lineLabel}>Sin sesión</span>
                <span className={styles.lineValue}>Entra para guardar tu progreso y practicar con tu club.</span>
              </div>
              <Button to="/entrar?next=/ajustes" size="sm">
                Entrar
              </Button>
            </div>
          )}
        </section>
        {club.session && (
          <section className={styles.block}>
            <h3 className={styles.blockTitle}>Club</h3>
            {club.status === 'ready' && club.club ? (
              <>
                <div className={styles.line}>
                  <div className={styles.lineText}>
                    <span className={styles.lineLabel}>Tu club</span>
                    <strong className={styles.lineValue}>{club.club.name}</strong>
                  </div>
                  <Button variant="secondary" size="sm" to="/club">
                    Ir al club
                  </Button>
                </div>
                <div className="row" style={{ marginTop: 'var(--space-3)' }}>
                  <InviteButton club={club.club} />
                  <Button variant="ghost" size="sm" onClick={() => setConfirmLeave(true)}>
                    Salir del club
                  </Button>
                </div>
              </>
            ) : (
              <div className={styles.line}>
                <div className={styles.lineText}>
                  <span className={styles.lineLabel}>Sin club</span>
                  <span className={styles.lineValue}>Únete o crea uno para competir con amigos.</span>
                </div>
                <Button to="/club" variant="secondary" size="sm">
                  Elegir mi club
                </Button>
              </div>
            )}
          </section>
        )}
      </Card>
      <Card title="Nivel" icon="compass" subtitle={`Rating de entrenamiento ${rating}${placementLevel ? ` · ${placementLevel}` : ''}`}>
        <p className="muted">Si el plan no se ajusta a tu fuerza, recalibra con tu Elo o con el test adaptativo. El plan de hoy se regenera al instante.</p>
        <Button to="/test-nivel" variant="secondary">
          Recalibrar nivel
        </Button>
      </Card>
      <Card title="Preferencias" icon="sliders">
        <label className={styles.check}>
          <input type="checkbox" checked={s.sound} onChange={(e) => s.update({ sound: e.target.checked })} /> Sonidos
        </label>
        <label className={styles.check}>
          <input type="checkbox" checked={s.spanishNotation} onChange={(e) => s.update({ spanishNotation: e.target.checked })} /> Notación en español (R, D, T, A, C)
        </label>
        <label className={styles.field}>
          <span>Tema</span>
          <select value={s.theme} onChange={(e) => s.update({ theme: e.target.value as ThemeMode })}>
            <option value="system">Automático</option>
            <option value="light">Claro</option>
            <option value="dark">Oscuro</option>
          </select>
        </label>
      </Card>
      <Card title="Tus datos" icon="notebook" subtitle="El progreso se guarda en este navegador (localStorage).">
        <div className="row">
          <Button variant="secondary" onClick={download}>
            Exportar progreso
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            Importar progreso
          </Button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => upload(e.target.files?.[0])} />
          <Button variant="danger" onClick={() => setConfirmReset(true)}>
            Reiniciar todo
          </Button>
        </div>
        {msg && <p style={{ color: 'var(--color-danger)' }}>{msg}</p>}
      </Card>
      {import.meta.env.DEV && clubRepo.isDemo && (
        <Card title="Administrador (demo)" icon="shield" subtitle="Solo el administrador de la plataforma puede crear clubes y compartir el link para que otros creen el suyo.">
          <label className="row" style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={s.isPlatformAdmin} onChange={(e) => { s.update({ isPlatformAdmin: e.target.checked }); club.bump(); }} />
            <span>Soy el administrador de la plataforma</span>
          </label>
        </Card>
      )}
      {import.meta.env.DEV && clubRepo.isDemo && club.status === 'ready' && (
        <Card title="Club (simulación)" icon="flask" subtitle="Herramientas del modo demo para probar la dinámica del club con compañeros simulados.">
          <div className="row">
            <Button variant="secondary" onClick={() => sim('Avanzó un día: los compañeros practicaron', () => { s.update({ dayOffset: s.dayOffset + 1 }); return clubRepo._advance(); })}>
              Avanzar 1 día
            </Button>
            <Button variant="secondary" onClick={() => sim('Un compañero te retó', clubRepo._botChallenge)}>
              Que me reten
            </Button>
            <Button variant="secondary" onClick={() => sim('Los compañeros jugaron tus retos', clubRepo._botsReplyNow)}>
              Responder mis retos ya
            </Button>
            <Button variant="ghost" onClick={() => sim('Club simulado reiniciado', clubRepo._reset)}>
              Reiniciar club simulado
            </Button>
          </div>
          {simMsg && <p className="muted" style={{ margin: 'var(--space-2) 0 0' }} role="status">{simMsg}</p>}
        </Card>
      )}
      <Modal
        open={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        size="sm"
        title="¿Salir del club?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmLeave(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                await clubRepo.leaveClub();
                await club.refresh();
                setConfirmLeave(false);
              }}
            >
              Salir
            </Button>
          </>
        }
      >
        <p>Dejarás de aparecer en el ranking y el feed de {club.club?.name}. Tu progreso personal no se pierde.</p>
      </Modal>
      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        size="sm"
        title="¿Reiniciar todo?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmReset(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                resetProgress();
                window.location.reload();
              }}
            >
              Sí, borrar
            </Button>
          </>
        }
      >
        <p>Se borrarán XP, racha, lecciones, repasos y ajustes. Exporta antes si quieres conservarlos.</p>
      </Modal>
    </div>
  );
}
