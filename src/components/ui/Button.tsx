import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { renderIcon } from './Icon';
import styles from './Button.module.css';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
type Size = 'sm' | 'md' | 'lg';

interface BaseProps {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  icon?: ReactNode;
  loading?: boolean;
}

export type ButtonProps = BaseProps & ButtonHTMLAttributes<HTMLButtonElement> & { to?: string };

/** Botón "3D" estilo juego. Con `to` se renderiza como enlace. */
export function Button({ variant = 'primary', size = 'md', block, icon, loading, to, className, children, disabled, ...rest }: ButtonProps) {
  const cls = [styles.btn, styles[variant], styles[size], block && styles.block, className].filter(Boolean).join(' ');
  const content = (
    <>
      {loading ? <span className={styles.spinner} aria-hidden /> : icon && <span className={styles.icon}>{renderIcon(icon)}</span>}
      {children && <span>{children}</span>}
    </>
  );
  if (to && !disabled) {
    return (
      <Link to={to} className={cls}>
        {content}
      </Link>
    );
  }
  return (
    <button className={cls} disabled={disabled || loading} {...rest}>
      {content}
    </button>
  );
}
