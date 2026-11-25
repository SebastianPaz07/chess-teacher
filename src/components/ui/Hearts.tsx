import { Icon } from '@/components/ui/Icon';
import { motion } from 'framer-motion';

export function Hearts({ total, left }: { total: number; left: number }) {
  return (
    <div style={{ display: 'inline-flex', gap: 2, fontSize: '1rem' }} aria-label={`${left} vidas`}>
      {Array.from({ length: total }, (_, i) => (
        <motion.span key={`${i}-${i < left}`} initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400 }}>
          <Icon name="heart" weight={i < left ? 'fill' : 'regular'} color={i < left ? 'var(--color-danger)' : 'var(--color-text-muted)'} />
        </motion.span>
      ))}
    </div>
  );
}
