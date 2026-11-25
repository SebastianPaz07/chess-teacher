import { createContext, useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Zona fija al pie de la lección donde van los botones de avanzar. */
export const LessonActionSlot = createContext<HTMLElement | null>(null);

/**
 * El botón «Continuar» se dibuja en la zona fija de abajo: siempre visible,
 * aunque la lección tenga mucho texto y haya que hacer scroll.
 */
export function LessonAction({ children }: { children: ReactNode }) {
  const slot = useContext(LessonActionSlot);
  return slot ? createPortal(children, slot) : <>{children}</>;
}
