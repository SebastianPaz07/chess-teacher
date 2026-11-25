import type { ReactNode } from 'react';
import { renderIcon } from '@/components/ui/Icon';

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  /** Rótulo superior en versalitas (sección) */
  eyebrow?: ReactNode;
  /** Menos espacio alrededor (pantallas con listas largas) */
  compact?: boolean;
  /** Sin línea inferior */
  plain?: boolean;
}

/** Cabecera de página editorial: rótulo, titular serif y filete inferior. */
export function PageHeader({ title, subtitle, icon, actions, eyebrow, compact, plain }: PageHeaderProps) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 'var(--space-4)',
        marginBottom: compact ? 0 : 'var(--space-5)',
        paddingBottom: compact ? 'var(--space-3)' : 'var(--space-4)',
        borderBottom: plain ? 'none' : '1px solid var(--color-rule)',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ flex: 1, minWidth: 220 }}>
        {(eyebrow || icon) && (
          <div className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            {icon && <span style={{ display: 'inline-flex', color: 'var(--color-primary)', fontSize: '1rem' }}>{renderIcon(icon, { weight: 'bold' })}</span>}
            {eyebrow}
          </div>
        )}
        <h1 style={{ margin: 0 }}>{title}</h1>
        {subtitle && (
          <p className="muted" style={{ margin: '6px 0 0', maxWidth: '62ch' }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="row">{actions}</div>}
    </header>
  );
}
