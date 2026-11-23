import type { ReactNode } from 'react';
import { renderIcon } from './Icon';
import styles from './Badge.module.css';

interface BadgeProps {
  children: ReactNode;
  tone?: 'neutral' | 'primary' | 'accent' | 'success' | 'danger' | 'xp';
  icon?: ReactNode;
}

export function Badge({ children, tone = 'neutral', icon }: BadgeProps) {
  return (
    <span className={[styles.badge, styles[tone]].join(' ')}>
      {renderIcon(icon, { size: '1em' })}
      {children}
    </span>
  );
}
