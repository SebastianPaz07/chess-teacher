import type { ReactNode } from 'react';
import { renderIcon } from './Icon';
import styles from './StatPill.module.css';

interface StatPillProps {
  icon: ReactNode;
  value: ReactNode;
  label?: string;
  color?: string;
  title?: string;
}

export function StatPill({ icon, value, label, color, title }: StatPillProps) {
  return (
    <div className={styles.pill} title={title ?? label} style={color ? { color } : undefined}>
      <span className={styles.icon}>{renderIcon(icon)}</span>
      <span className={styles.value}>{value}</span>
      {label && <span className={styles.label}>{label}</span>}
    </div>
  );
}
