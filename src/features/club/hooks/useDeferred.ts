import { useEffect, useState } from 'react';

/**
 * Para dejar datos «para cuando sobre tiempo»: devuelve true en cuanto son
 * urgentes, o cuando lo principal ya está listo y el navegador queda libre.
 * Una vez en true no vuelve atrás.
 */
export function useDeferred(urgent: boolean, ready: boolean) {
  const [on, setOn] = useState(urgent);

  useEffect(() => {
    if (on) return;
    if (urgent) return setOn(true);
    if (!ready) return;
    // Safari no tiene requestIdleCallback
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(() => setOn(true), { timeout: 2000 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = setTimeout(() => setOn(true), 600);
    return () => clearTimeout(timer);
  }, [on, urgent, ready]);

  return on || urgent;
}
