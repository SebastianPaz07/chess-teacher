import { useEffect, useRef, useState } from 'react';
import { useClubStore } from '@/store/clubStore';

interface QueryState<T> {
  data: T | undefined;
  error: string | null;
  loading: boolean;
}

/**
 * Consulta al repositorio del club. Se recarga sola cuando cambian los datos
 * (feed nuevo, reto respondido…) sin parpadear: conserva lo último mostrado.
 */
export function useClubQuery<T>(fn: () => Promise<T>, deps: unknown[] = [], enabled = true): QueryState<T> & { reload: () => void } {
  const version = useClubStore((s) => s.version);
  const bump = useClubStore((s) => s.bump);
  const [state, setState] = useState<QueryState<T>>({ data: undefined, error: null, loading: enabled });
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    fnRef
      .current()
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((e: Error) => alive && setState((s) => ({ ...s, error: e.message, loading: false })));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, enabled, ...deps]);

  return { ...state, reload: bump };
}
