import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import type { LeaderRow } from '@/services/club';
import { Avatar } from './Avatar';
import styles from '../club.module.css';

interface Props {
  /** Las filas ya ordenadas; solo se usan las 3 primeras */
  rows: LeaderRow[];
  meId: string;
  unit?: string;
  /** Más pequeño (tarjeta de "Hoy") */
  compact?: boolean;
  /** Quiénes practicaron hoy (llama en el avatar) */
  activeIds?: Set<string>;
}

/** Orden visual: plata, oro, bronce. El primero queda en el centro y más alto. */
const SLOTS = [1, 0, 2] as const;
const MEDAL = ['gold', 'silver', 'bronze'] as const;

/** Podio de los 3 primeros: se distinguen de un vistazo del resto de la tabla. */
export function Podium({ rows, meId, unit, compact, activeIds }: Props) {
  const top = rows.slice(0, 3);
  if (top.length === 0) return null;
  return (
    <ol className={[styles.podium, compact && styles.podiumCompact].filter(Boolean).join(' ')} aria-label="Podio">
      {SLOTS.map((idx) => {
        const r = top[idx];
        if (!r) return <li key={idx} className={styles.podiumGap} aria-hidden />;
        const me = r.member.id === meId;
        const first = idx === 0;
        const size = compact ? (first ? 46 : 38) : first ? 64 : 50;
        return (
          <li key={r.member.id} className={[styles.podiumSlot, styles[MEDAL[idx]]].join(' ')}>
            <Link to={me ? '/progreso' : `/club/miembro/${r.member.id}`} className={styles.podiumLink}>
              <motion.span
                className={styles.podiumWho}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + idx * 0.12, type: 'spring', stiffness: 220, damping: 18 }}
              >
                {first && (
                  <motion.span className={styles.podiumCrown} animate={{ rotate: [-6, 6, -6] }} transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}>
                    <Icon name="crown" weight="fill" />
                  </motion.span>
                )}
                <Avatar avatar={r.member.avatar} name={r.member.name} size={size} me={me} active={activeIds?.has(r.member.id)} />
                <span className={styles.podiumName}>{me ? 'Tú' : r.member.name}</span>
                <span className={styles.podiumValue}>
                  {r.value}
                  {unit && <small> {unit}</small>}
                </span>
              </motion.span>
              <motion.span
                className={styles.podiumBlock}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                style={{ transformOrigin: 'bottom' }}
                transition={{ delay: idx * 0.1, type: 'spring', stiffness: 160, damping: 16 }}
              >
                <span>{r.rank}</span>
              </motion.span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
