import type { CSSProperties, ReactNode } from 'react';
import { ICON_PATHS, type IconWeight as PathWeight } from './iconPaths';

/**
 * Iconos de la app (Phosphor Icons, MIT). Se referencian por nombre
 * semántico desde el contenido (module.json, lecciones, logros…).
 * Los trazados se generan con `npm run icons` (scripts/build-icons.mjs)
 * e incluyen solo los pesos que usamos, para no inflar el bundle.
 */

/** Piezas de ajedrez: se dibujan como glifo tipográfico (no hay equivalente en Phosphor). */
const PIECES = {
  'piece-king': '♚',
  'piece-queen': '♛',
  'piece-rook': '♜',
  'piece-bishop': '♝',
  'piece-knight': '♞',
  'piece-pawn': '♟',
  'piece-king-w': '♔',
  'piece-pawn-w': '♙',
} as const;

export type IconName = keyof typeof ICON_PATHS | keyof typeof PIECES;
/** `thin`, `duotone` y `bold` se aceptan y se mapean a light/regular (solo algunos iconos tienen `fill`). */
export type IconWeight = PathWeight | 'thin' | 'duotone' | 'bold';

const WEIGHT_MAP: Record<IconWeight, PathWeight> = { light: 'light', thin: 'light', regular: 'regular', duotone: 'regular', bold: 'regular', fill: 'fill' };

export const isIconName = (v: unknown): v is IconName => typeof v === 'string' && (v in ICON_PATHS || v in PIECES);

interface IconProps {
  name: string;
  size?: number | string;
  weight?: IconWeight;
  color?: string;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

export function Icon({ name, size = '1.25em', weight = 'regular', color, className, style, title }: IconProps) {
  const a11y = title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true as const };
  if (name in PIECES) {
    return (
      <span className={className} style={{ fontFamily: 'var(--font-pieces)', fontSize: size, lineHeight: 1, color, display: 'inline-block', ...style }} {...a11y}>
        {PIECES[name as keyof typeof PIECES]}
      </span>
    );
  }
  const paths = ICON_PATHS[name];
  if (!paths) return <span className={className} style={style}>{name}</span>;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      width={size}
      height={size}
      fill={color ?? 'currentColor'}
      className={className}
      style={{ flexShrink: 0, verticalAlign: '-0.125em', ...style }}
      {...a11y}
      dangerouslySetInnerHTML={{ __html: paths[WEIGHT_MAP[weight]] ?? paths.regular }}
    />
  );
}

/** Acepta un nombre de icono o cualquier nodo React (para props `icon`). */
export function renderIcon(icon: ReactNode, props?: Omit<IconProps, 'name'>): ReactNode {
  return typeof icon === 'string' ? <Icon name={icon} {...props} /> : icon;
}
