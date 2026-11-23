import type { ReactNode } from 'react';
import { renderIcon } from './Icon';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ icon = 'piece-pawn-w', title, description, action }: EmptyStateProps) {
  return (
    <div style={{ textAlign: 'center', padding: 'var(--space-7) var(--space-4)' }}>
      <div style={{ fontSize: '3.5rem', lineHeight: 1, marginBottom: 'var(--space-3)' }}>{renderIcon(icon, { weight: 'thin' })}</div>
      <h3>{title}</h3>
      {description && <p className="muted">{description}</p>}
      {action && <div style={{ marginTop: 'var(--space-4)' }}>{action}</div>}
    </div>
  );
}
