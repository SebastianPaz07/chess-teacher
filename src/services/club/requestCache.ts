/**
 * Caché en memoria de las lecturas a la base de datos: las consultas iguales
 * comparten una sola petición y el resultado se reutiliza durante `ttlMs`.
 * Las claves son `grupo:detalle`; se invalida por grupo.
 */
export function createRequestCache(clock: () => number = Date.now) {
  const entries = new Map<string, { at: number; value: Promise<unknown> }>();

  function get<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
    const hit = entries.get(key);
    if (hit && clock() - hit.at < ttlMs) return hit.value as Promise<T>;
    const value = load();
    entries.set(key, { at: clock(), value });
    // Un fallo no se guarda: la siguiente consulta vuelve a intentarlo
    value.catch(() => entries.get(key)?.value === value && entries.delete(key));
    return value;
  }

  /** Sin grupos, vacía todo */
  function invalidate(...groups: string[]) {
    if (!groups.length) return entries.clear();
    for (const key of entries.keys()) if (groups.includes(key.split(':')[0])) entries.delete(key);
  }

  return { get, invalidate };
}
