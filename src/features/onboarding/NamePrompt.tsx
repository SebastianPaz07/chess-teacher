import { useState } from 'react';
import { Button } from '@/components/ui';
import { useSettingsStore } from '@/store/settingsStore';
import styles from './PlanSetupPage.module.css';

/** Mismo máximo que el nombre del perfil del club */
export const NAME_MAX = 24;

export function NameInput({ value, onChange }: { value: string; onChange: (name: string) => void }) {
  return <input type="text" className={styles.nameInput} value={value} onChange={(e) => onChange(e.target.value)} maxLength={NAME_MAX} placeholder="Tu nombre" aria-label="Tu nombre" autoComplete="given-name" autoFocus />;
}

/** Para quien ya tiene plan pero aún no tiene nombre: se pide antes de mostrar «Hoy». */
export function NamePrompt() {
  const update = useSettingsStore((s) => s.update);
  const [name, setName] = useState('');
  return (
    <form
      className={styles.namePrompt}
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) update({ playerName: name.trim() });
      }}
    >
      <h1 className={styles.title}>¿Cómo te llamas?</h1>
      <p className="muted">Así te saludamos cada vez que entres.</p>
      <NameInput value={name} onChange={setName} />
      <Button type="submit" size="lg" block disabled={!name.trim()}>
        Guardar
      </Button>
    </form>
  );
}
