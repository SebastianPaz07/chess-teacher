import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';

/** Pantallas que cuentan como estudio. */
const STUDY = /^\/(practica\/ejercicios|leccion\/|repaso|aperturas\/|rush|partidas|test-nivel|club\/reto\/|club\/semana)/;
/** Sin tocar nada durante este tiempo, se deja de contar (pausa / se fue). */
const IDLE_MS = 90_000;
const FLUSH_EVERY = 15;

/**
 * Mide el tiempo de estudio real: solo cuenta en pantallas de práctica,
 * con la app visible y si hubo interacción reciente. Se guarda por día y
 * alimenta el ranking de "minutos de estudio" del club.
 */
export function useStudyTimer() {
  const { pathname } = useLocation();
  const add = useGameStore((s) => s.addStudySeconds);
  const lastInput = useRef(Date.now());
  const pending = useRef(0);
  const studying = STUDY.test(pathname);

  useEffect(() => {
    const mark = () => (lastInput.current = Date.now());
    const opts = { passive: true } as const;
    window.addEventListener('pointerdown', mark, opts);
    window.addEventListener('keydown', mark, opts);
    window.addEventListener('wheel', mark, opts);
    window.addEventListener('touchmove', mark, opts);
    return () => {
      window.removeEventListener('pointerdown', mark);
      window.removeEventListener('keydown', mark);
      window.removeEventListener('wheel', mark);
      window.removeEventListener('touchmove', mark);
    };
  }, []);

  useEffect(() => {
    if (!studying) return;
    lastInput.current = Date.now();
    const flush = () => {
      if (pending.current > 0) add(pending.current);
      pending.current = 0;
    };
    const t = window.setInterval(() => {
      // Viendo un video no llegan toques a la app: el foco está en su reproductor (un iframe)
      const watching = document.activeElement?.tagName === 'IFRAME';
      if (document.visibilityState !== 'visible' || (!watching && Date.now() - lastInput.current > IDLE_MS)) return;
      pending.current += 1;
      if (pending.current >= FLUSH_EVERY) flush();
    }, 1000);
    const onHide = () => document.visibilityState === 'hidden' && flush();
    document.addEventListener('visibilitychange', onHide);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onHide);
      flush();
    };
  }, [studying, add]);
}
