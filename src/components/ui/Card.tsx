import type { HTMLAttributes, ReactNode } from 'react';
import { renderIcon } from './Icon';
import styles from './Card.module.css';

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  tone?: 'default' | 'primary' | 'accent' | 'success' | 'danger';
  interactive?: boolean;
  padded?: boolean;
}

export function Card({ title, subtitle, icon, actions, tone = 'default', interactive, padded = true, className, children, ...rest }: CardProps) {
  const cls = [styles.card, styles[tone], interactive && styles.interactive, padded && styles.padded, className].filter(Boolean).join(' ');
  return (
    <div className={cls} {...rest}>
      {(title || icon || actions) && (
        <header className={styles.header}>
          {icon && <span className={styles.icon}>{renderIcon(icon)}</span>}
          <div className={styles.titles}>
            {title && <h3 className={styles.title}>{title}</h3>}
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </header>
      )}
      {children}
    </div>
  );
}
