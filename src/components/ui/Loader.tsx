import styles from './Loader.module.css';

interface LoaderProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  fullscreen?: boolean;
}

/** Loader temático: un caballo que salta. */
export function Loader({ label = 'Cargando…', size = 'md', fullscreen }: LoaderProps) {
  return (
    <div className={[styles.wrap, fullscreen && styles.fullscreen].filter(Boolean).join(' ')} role="status" aria-live="polite">
      <span className={[styles.knight, styles[size]].join(' ')} aria-hidden>
        ♞
      </span>
      {label && <span className={styles.label}>{label}</span>}
    </div>
  );
}
