import { createJSONStorage } from 'zustand/middleware';
import { STORAGE_PREFIX, type StorageAdapter } from './StorageAdapter';

const memory = new Map<string, string>();

/** localStorage con respaldo en memoria (modo privado / tests). */
export const localStorageAdapter: StorageAdapter = {
  getItem(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return memory.get(key) ?? null;
    }
  },
  setItem(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      memory.set(key, value);
    }
  },
  removeItem(key) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      memory.delete(key);
    }
  },
  keys() {
    try {
      return Object.keys(window.localStorage);
    } catch {
      return [...memory.keys()];
    }
  },
};

/** Adaptador activo: cambia esta línea para usar otro backend. */
export const storage: StorageAdapter = localStorageAdapter;

export const zustandStorage = createJSONStorage(() => storage);

export const storeKey = (name: string) => `${STORAGE_PREFIX}${name}`;

/** Exporta todo el progreso como JSON (backup / cambio de dispositivo). */
export function exportProgress(): string {
  const data: Record<string, unknown> = {};
  for (const key of storage.keys()) {
    if (key.startsWith(STORAGE_PREFIX)) {
      const raw = storage.getItem(key);
      data[key] = raw ? JSON.parse(raw) : null;
    }
  }
  return JSON.stringify({ app: 'chess-teacher', exportedAt: new Date().toISOString(), data }, null, 2);
}

export function importProgress(json: string) {
  const parsed = JSON.parse(json) as { app?: string; data?: Record<string, unknown> };
  if (parsed.app !== 'chess-teacher' || !parsed.data) throw new Error('Archivo de progreso no válido');
  for (const [key, value] of Object.entries(parsed.data)) {
    if (key.startsWith(STORAGE_PREFIX)) storage.setItem(key, JSON.stringify(value));
  }
}

export function resetProgress() {
  for (const key of storage.keys()) if (key.startsWith(STORAGE_PREFIX)) storage.removeItem(key);
}
