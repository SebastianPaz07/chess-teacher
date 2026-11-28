import { motion } from 'framer-motion';
import { Button } from './Button';
import { Icon } from './Icon';
import styles from './WinBar.module.css';

interface Props {
  title?: string;
  detail?: string;
  label: string;
  onContinue: () => void;
}

/**
 * «¡Ganaste!» y el botón para seguir, fijos abajo: se ven sin hacer scroll.
 * No debe ir dentro de un elemento animado con `transform` (rompe la posición fija).
 */
export function WinBar({ title = '¡Ganaste!', detail, label, onContinue }: Props) {
  return (
    <>
      {/* Hueco para que la barra no tape el final del contenido */}
      <div className={styles.space} aria-hidden />
      <motion.div className={styles.bar} role="status" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <span className={styles.badge}>
          <Icon name="trophy" />
        </span>
        <span className={styles.text}>
          <strong>{title}</strong>
          {detail && <small>{detail}</small>}
        </span>
        <Button size="lg" icon="arrow-right" onClick={onContinue}>
          {label}
        </Button>
      </motion.div>
    </>
  );
}
