import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Ancho real de un elemento (para tableros responsivos).
 * Arranca en 0 y mide de forma síncrona antes de pintar: así el tablero
 * nunca se dibuja con un ancho inventado que empuje al contenedor.
 */
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(Math.floor(el.getBoundingClientRect().width));
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width, width > 0] as const;
}
