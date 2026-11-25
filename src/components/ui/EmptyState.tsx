import type { ReactNode } from 'react';
import { PieceScene, type Scene } from '@/components/illustrations/PieceScene';
import { renderIcon } from './Icon';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  /** Mini ilustración de tablero (en lugar del icono) */
  scene?: Scene;
}

const DEFAULT_SCENE: Scene = { b: '...../..k../...../..N../....K', a: ['2,3>3,1'] };

export function EmptyState({ icon, title, description, action, scene }: EmptyStateProps) {
  return (
    <div style={{ textAlign: 'center', padding: 'var(--space-6) var(--space-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-3)' }}>
        {icon ? <span style={{ fontSize: '3.5rem', lineHeight: 1 }}>{renderIcon(icon, { weight: 'thin' })}</span> : <PieceScene size={96} scene={scene ?? DEFAULT_SCENE} />}
      </div>
      <h3>{title}</h3>
      {description && <p className="muted">{description}</p>}
      {action && <div style={{ marginTop: 'var(--space-4)' }}>{action}</div>}
    </div>
  );
}
