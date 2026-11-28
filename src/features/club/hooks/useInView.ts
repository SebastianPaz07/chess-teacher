import { useEffect, useState } from 'react';

/**
 * ¿Está el elemento cerca de la pantalla? Sirve para cargar al hacer scroll.
 * Con `once`, se queda en true la primera vez que se acerca.
 */
export function useInView(once = false) {
  const [node, ref] = useState<Element | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!once) setInView(entry.isIntersecting);
        else if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      // El siguiente elemento observado parte de cero
      if (!once) setInView(false);
    };
  }, [node, once]);

  return [ref, inView] as const;
}
