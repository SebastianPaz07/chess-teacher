/**
 * Copia en localStorage de lo último que se mostró del club, para pintar al
 * instante mientras llegan los datos frescos. Va fuera del prefijo del progreso:
 * no forma parte de las copias de seguridad.
 */
import { storage } from '@/services/storage/localStorageAdapter';
import type { MyProfile } from './ClubRepository';
import type { Club, Session } from './types';

const DATA_KEY = 'chess-cache:club-data:v2';
const ME_KEY = 'chess-cache:club-me';

export interface Identity {
  session: Session;
  profile: MyProfile;
  club: Club;
}

interface Snapshots {
  /** `usuario:club`; al cambiar, lo guardado deja de valer */
  scope: string;
  entries: Record<string, unknown>;
}

function read<T>(key: string): T | null {
  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function readSnapshot<T>(scope: string, key: string): T | undefined {
  const saved = read<Snapshots>(DATA_KEY);
  return saved?.scope === scope ? (saved.entries[key] as T | undefined) : undefined;
}

export function writeSnapshot(scope: string, key: string, value: unknown) {
  const saved = read<Snapshots>(DATA_KEY);
  const entries = saved?.scope === scope ? saved.entries : {};
  storage.setItem(DATA_KEY, JSON.stringify({ scope, entries: { ...entries, [key]: value } }));
}

export const readIdentity = () => read<Identity>(ME_KEY);
export const writeIdentity = (me: Identity) => storage.setItem(ME_KEY, JSON.stringify(me));

/** Al cerrar sesión o salir del club */
export function clearSnapshots() {
  storage.removeItem(DATA_KEY);
  storage.removeItem(ME_KEY);
}
