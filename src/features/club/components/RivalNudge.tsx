import { useState } from 'react';
import { Button } from '@/components/ui';
import type { LeaderRow, MemberSummary } from '@/services/club';
import { Avatar } from './Avatar';
import { NewChallengeModal } from './Challenges';
import styles from '../club.module.css';

interface Props {
  rows: LeaderRow[] | undefined;
  members: MemberSummary[] | undefined;
  meId: string;
  /** "ejercicios", "minutos"… */
  unit: string;
}

/**
 * El rival más cercano en el ranking: a quién superar (o quién te persigue)
 * y un botón para retarlo. Convierte la tabla en algo accionable.
 */
export function RivalNudge({ rows, members, meId, unit }: Props) {
  const [open, setOpen] = useState(false);
  if (!rows || !members || rows.length < 2) return null;
  const i = rows.findIndex((r) => r.member.id === meId);
  if (i < 0) return null;
  const me = rows[i];
  const above = [...rows.slice(0, i)].reverse().find((r) => r.value > me.value);
  const below = rows.slice(i + 1).find((r) => r.value <= me.value);
  const rival = above ?? below;
  if (!rival) return null;
  const gap = Math.abs(rival.value - me.value) + (above ? 1 : 0);
  const text = above
    ? `Te faltan ${gap} ${unit} para pasar a ${rival.member.name} y subir al ${rival.rank}º puesto.`
    : gap === 0
      ? `Vas empatado con ${rival.member.name}. ¡Desempata!`
      : `Vas ${me.rank}º. ${rival.member.name} te sigue a ${gap} ${unit}.`;

  return (
    <div className={styles.rival}>
      <Avatar avatar={rival.member.avatar} name={rival.member.name} size={36} />
      <p className={styles.rivalText}>{text}</p>
      <Button size="sm" icon="sword" onClick={() => setOpen(true)}>
        Retar
      </Button>
      <NewChallengeModal open={open} onClose={() => setOpen(false)} members={members} meId={meId} initialOpponent={rival.member.id} />
    </div>
  );
}
