import type { ReactNode } from 'react';
import { renderIcon } from './Icon';
import styles from './StatPill.module.css';

interface StatPillProps {
  icon: ReactNode;
  value: ReactNode;
  label?: string;
  color?: string;
  title?: string;
  /** Si se pasa, la píldora es un botón */
  onClick?: () => void;
}

export function StatPill({ icon, value, label, color, title, onClick }: StatPillProps) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      className={styles.pill}
      title={title ?? label}
      style={color ? { color } : undefined}
      {...(onClick ? { type: 'button' as const, onClick } : {})}
    >
      <span className={styles.icon}>{renderIcon(icon)}</span>
      <span className={styles.value}>{value}</span>
      {label && <span className={styles.label}>{label}</span>}
    </Tag>
  );
}
