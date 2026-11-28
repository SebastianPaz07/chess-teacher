import { useEffect, useRef, useState } from 'react';
import { readSnapshot, writeSnapshot } from '@/services/club/snapshot';
import { useClubStore } from '@/store/clubStore';

/** Mínimo entre recargas automáticas de una misma consulta. */
const MIN_REFETCH_MS = 15_000;

interface QueryState<T> {
  data: T | undefined;
  error: string | null;
  loading: boolean;
}

/**
 * Consulta al repositorio del club. Se recarga sola cuando cambian los datos
 * (feed nuevo, reto respondido…) sin parpadear: conserva lo último mostrado.
 * Con `saveAs`, además se guarda en el navegador y se muestra al volver
 * mientras llega lo nuevo.
 */
export function useClubQuery<T>(fn: () => Promise<T>, deps: unknown[] = [], enabled = true, saveAs?: string): QueryState<T> & { reload: () => void } {
  const version = useClubStore((s) => s.version);
  const forceReload = useClubStore((s) => s.forceReload);
  const scope = useClubStore((s) => (s.session && s.club ? `${s.session.userId}:${s.club.id}` : ''));
  const [state, setState] = useState<QueryState<T>>(() => {
    const data = saveAs ? readSnapshot<T>(scope, saveAs) : undefined;
    return { data, error: null, loading: enabled && data === undefined };
  });
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const lastRun = useRef({ at: 0, deps: '' });

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = () => {
      lastRun.current.at = Date.now();
      fnRef
        .current()
        .then((data) => {
          if (!alive) return;
          if (saveAs) writeSnapshot(scope, saveAs, data);
          setState({ data, error: null, loading: false });
        })
        .catch((e: Error) => alive && setState((s) => ({ ...s, error: e.message, loading: false })));
    };
    // Cambió lo que se consulta (o es la primera vez): carga ya.
    // Solo cambió la «versión» (novedades del club): no más de una vez cada 15 s.
    const key = JSON.stringify(deps);
    const sinceLast = Date.now() - lastRun.current.at;
    if (lastRun.current.deps !== key || sinceLast >= MIN_REFETCH_MS || useClubStore.getState().forcedVersion === version) {
      lastRun.current.deps = key;
      run();
    } else {
      timer = setTimeout(run, MIN_REFETCH_MS - sinceLast);
    }
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, enabled, ...deps]);

  return { ...state, reload: forceReload };
}
