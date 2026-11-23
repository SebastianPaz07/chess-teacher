import { Icon } from '@/components/ui/Icon';
import { AnimatePresence, motion } from 'framer-motion';
import styles from './TeacherBubble.module.css';

export type TeacherMood = 'neutral' | 'happy' | 'thinking' | 'proud' | 'oops';

/** El "profesor": avatar con globo de diálogo que reacciona al desempeño. */
export function TeacherBubble({ message, mood = 'neutral' }: { message: string; mood?: TeacherMood }) {
  return (
    <div className={styles.wrap}>
      <motion.div key={mood} className={styles.avatar} initial={{ scale: 0.6, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 300 }}>
        <Icon name={mood === 'proud' ? 'trophy' : 'teacher'} weight="light" />
      </motion.div>
      <AnimatePresence mode="wait">
        <motion.div key={message} className={styles.bubble} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
          {message}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
