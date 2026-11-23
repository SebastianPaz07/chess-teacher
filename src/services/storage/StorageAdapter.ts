/**
 * Contrato de persistencia. Hoy: localStorage.
 * Mañana: API / Supabase / Firebase implementando esta misma interfaz,
 * sin tocar stores ni features.
 */
export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  keys(): string[];
}

export const STORAGE_PREFIX = 'chess-teacher:';
