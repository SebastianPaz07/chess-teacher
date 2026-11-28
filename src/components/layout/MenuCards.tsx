import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import styles from './MenuCards.module.css';

export interface MenuItem {
  to: string;
  icon: string;
  title: string;
  detail: string;
  /** Dato corto («3 pendientes», «Mejor: 12») */
  meta?: string;
  /** Resalta el dato porque pide atención */
  alert?: boolean;
}

/** Opciones de una sección como tarjetas grandes: se toca una y se abre su pantalla. */
export function MenuCards({ items, label }: { items: MenuItem[]; label: string }) {
  return (
    <nav aria-label={label}>
      <ul className={styles.list}>
        {items.map((it) => (
          <li key={it.to}>
            <Link to={it.to} className={styles.card}>
              <span className={styles.icon}>
                <Icon name={it.icon} />
              </span>
              <span className={styles.text}>
                <strong>{it.title}</strong>
                <small>{it.detail}</small>
                {it.meta && <span className={[styles.meta, it.alert && styles.alert].filter(Boolean).join(' ')}>{it.meta}</span>}
              </span>
              <Icon name="caret-right" className={styles.go} />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
