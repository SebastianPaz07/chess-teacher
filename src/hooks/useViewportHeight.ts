import { useEffect, useState } from 'react';

const read = () => (typeof window === 'undefined' ? 800 : window.innerHeight);

/**
 * Alto de la ventana para dimensionar el tablero.
 * En móvil, al hacer scroll la barra del navegador aparece/desaparece y
 * cambia el alto ~60-120 px: ignoramos esos cambios (si no, el tablero se
 * redibuja durante el scroll y se siente lento). Solo reaccionamos a giros
 * de pantalla o redimensiones reales.
 */
export function useViewportHeight() {
  const [h, setH] = useState(read);
  useEffect(() => {
    let lastW = window.innerWidth;
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const w = window.innerWidth;
        const nh = read();
        setH((prev) => (w !== lastW || Math.abs(nh - prev) > 150 ? nh : prev));
        lastW = w;
      });
    };
    window.addEventListener('resize', on);
    window.addEventListener('orientationchange', on);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', on);
      window.removeEventListener('orientationchange', on);
    };
  }, []);
  return h;
}
