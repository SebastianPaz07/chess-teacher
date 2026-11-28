import { Icon } from '@/components/ui/Icon';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, ProgressBar } from '@/components/ui';
import { Medal } from '@/components/ui/Medal';
import { ACHIEVEMENTS } from '@/services/game/achievements';
import { RANKS } from '@/services/game/xp';
import { useGameStore } from '@/store/gameStore';
import { useGameSummary } from './hooks/useGameSummary';
import { useJourney } from './hooks/useJourney';

export function AchievementsPage() {
  const unlocked = useGameStore((s) => s.achievements);
  const g = useGameSummary();
  const journey = useJourney();
  const count = Object.keys(unlocked).length;

  return (
    <div className="stack">
      <PageHeader icon="trophy" title="Medallas y rangos" subtitle={`${count}/${ACHIEVEMENTS.length} medallas ganadas`} />
      <Card title="Camino de rangos" icon="crown" subtitle={`Nivel ${g.level} · ${g.xp} XP totales`}>
        <p style={{ marginTop: 0 }}>
          Eres rango <strong>{g.rank.name}</strong>. {journey.message} · {journey.studied} de estudio.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {RANKS.map((r) => {
            const reached = g.level >= r.minLevel;
            return (
              <div key={r.id} style={{ textAlign: 'center', opacity: reached ? 1 : 0.35, minWidth: 70 }}>
                <div style={{ fontSize: '2.4rem', filter: reached ? 'none' : 'grayscale(1)' }}><Icon name={r.icon} /></div>
                <strong>{r.name}</strong>
                <div className="muted" style={{ fontSize: '0.8rem' }}>
                  Nivel {r.minLevel}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 16 }}>
          <ProgressBar value={g.levelRatio} color="var(--color-xp)" label={`Hacia el nivel ${g.level + 1}`} showValue />
        </div>
      </Card>
      <div className="grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
        {ACHIEVEMENTS.map((a, i) => {
          const date = unlocked[a.id];
          return (
            <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card tone={date ? 'accent' : 'default'} style={{ textAlign: 'center', height: '100%', opacity: date ? 1 : 0.6 }}>
                <div style={{ marginBottom: 'var(--space-2)' }}>
                  <Medal tier={a.tier} icon={a.icon} locked={!date} />
                </div>
                <strong>{a.title}</strong>
                <div className="muted" style={{ fontSize: '0.75rem', textTransform: 'capitalize' }}>
                  {a.tier}
                </div>
                <p className="muted" style={{ fontSize: '0.85rem', margin: '4px 0 0' }}>
                  {a.description}
                </p>
                {date && <p style={{ fontSize: '0.75rem', margin: '6px 0 0', fontWeight: 700 }}>{date}</p>}
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
