import { Icon } from '@/components/ui/Icon';
import confetti from 'canvas-confetti';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Button, Modal } from '@/components/ui';
import { Medal } from '@/components/ui/Medal';
import type { Reward } from '@/services/game/events';
import { sound } from '@/services/sound';
import { useGameStore } from '@/store/gameStore';
import { useJourney } from '../hooks/useJourney';
import styles from './RewardsCenter.module.css';

type Toast = Reward & { key: number };

export function celebrate(intensity: 'small' | 'big' = 'small') {
  const count = intensity === 'big' ? 160 : 70;
  confetti({ particleCount: count, spread: intensity === 'big' ? 100 : 65, origin: { y: 0.65 }, colors: ['#8b7dff', '#4fc3f7', '#ffd166', '#5fd8a4', '#ff7a8a'] });
}

/**
 * Escucha la cola de recompensas del gameStore y las muestra:
 * toasts (XP, logros, misiones, racha) y modal de subida de nivel.
 */
export function RewardsCenter() {
  const rewards = useGameStore((s) => s.rewards);
  const shift = useGameStore((s) => s.shiftReward);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [levelUp, setLevelUp] = useState<Extract<Reward, { kind: 'level-up' }> | null>(null);
  const journey = useJourney();

  useEffect(() => {
    if (!rewards.length) return;
    const r = rewards[0];
    shift();
    if (r.kind === 'level-up') {
      setLevelUp(r);
      sound.levelUp();
      celebrate('big');
      return;
    }
    if (r.kind === 'achievement') {
      sound.achievement();
      celebrate('small');
    }
    if (r.kind === 'daily-complete') celebrate('big');
    if (r.kind === 'rating') return; // se muestra en cada feature
    setToasts((t) => [...t.slice(-3), r]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.key !== r.key)), r.kind === 'xp' ? 1800 : 3500);
  }, [rewards, shift]);

  return (
    <>
      <div className={styles.stack} aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.key}
              layout
              className={[styles.toast, styles[t.kind]].join(' ')}
              initial={{ opacity: 0, y: -30, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80 }}
            >
              {renderToast(t)}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <Modal
        open={Boolean(levelUp)}
        onClose={() => setLevelUp(null)}
        size="sm"
        footer={
          <Button size="lg" onClick={() => setLevelUp(null)}>
            ¡A seguir!
          </Button>
        }
      >
        {levelUp && (
          <div className={styles.levelUp}>
            <motion.div className={styles.bigIcon} initial={{ rotate: -30, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
              <Icon name={levelUp.rankIcon} weight="light" />
            </motion.div>
            <h2>¡Subiste al nivel {levelUp.level}!</h2>
            {levelUp.newRank ? <p>Ahora eres rango <strong>{levelUp.rankName}</strong>.</p> : <p>Sigues avanzando como <strong>{levelUp.rankName}</strong>.</p>}
            <p className="muted">{journey.message}.</p>
          </div>
        )}
      </Modal>
    </>
  );
}

function renderToast(t: Toast) {
  switch (t.kind) {
    case 'xp':
      return <><strong>+{t.amount} XP</strong> <span>{t.reason}</span></>;
    case 'achievement':
      return <><Medal tier={t.tier} icon={t.icon} size="sm" /><div><small>¡Ganaste una medalla de {t.tier}!</small><strong>{t.title}</strong></div></>;
    case 'quest':
      return <><span className={styles.icon}><Icon name="check-circle" /></span><div><small>Misión completada (+{t.xp} XP)</small><strong>{t.title}</strong></div></>;
    case 'streak':
      return <><span className={styles.icon}><Icon name="fire" /></span><div><small>Racha</small><strong>{t.days} {t.days === 1 ? 'día' : 'días'}</strong></div></>;
    case 'daily-complete':
      return <><span className={styles.icon}><Icon name="flag" /></span><div><small>¡Sesión del día completa!</small><strong>Vuelve mañana</strong></div></>;
    default:
      return null;
  }
}
