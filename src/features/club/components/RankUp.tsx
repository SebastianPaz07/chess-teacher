import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { celebrate } from '@/features/gamification/components/RewardsCenter';
import styles from '../club.module.css';

const KEY = (k: string) => `profe-ajedrez:rank:${k}`;

/**
 * Compara tu puesto con la última vez que lo viste. Si subiste, devuelve
 * cuántos puestos y lanza una pequeña celebración.
 */
export function useRankUp(key: string, rank: number | undefined) {
  const [gained, setGained] = useState<number | null>(null);

  useEffect(() => {
    if (rank === undefined) return;
    let last: number | null = null;
    try {
      const raw = localStorage.getItem(KEY(key));
      last = raw === null ? null : Number(raw);
      localStorage.setItem(KEY(key), String(rank));
    } catch {
      /* sin almacenamiento: no hay comparación */
    }
    if (last !== null && Number.isFinite(last) && rank < last) {
      setGained(last - rank);
      celebrate('small');
    } else {
      setGained(null);
    }
  }, [key, rank]);

  useEffect(() => {
    if (gained === null) return;
    const t = window.setTimeout(() => setGained(null), 7000);
    return () => window.clearTimeout(t);
  }, [gained]);

  return { gained, dismiss: () => setGained(null) };
}

/** Aviso animado: «¡Subiste 2 puestos!». */
export function RankUpBanner({ gained, rank, onClose }: { gained: number | null; rank: number | undefined; onClose: () => void }) {
  return (
    <AnimatePresence>
      {gained !== null && (
        <motion.button
          type="button"
          className={styles.rankUp}
          onClick={onClose}
          initial={{ opacity: 0, y: -16, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 260, damping: 16 }}
        >
          <motion.span className={styles.rankUpIcon} animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1.1 }}>
            <Icon name="rocket" />
          </motion.span>
          <span>
            <strong>¡Subiste {gained} {gained === 1 ? 'puesto' : 'puestos'}!</strong>
            <small>{rank ? ` Ahora vas ${rank}º en el ranking.` : ''}</small>
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
