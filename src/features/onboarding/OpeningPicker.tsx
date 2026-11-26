import { useState } from 'react';
import { Tabs } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { allOpenings } from '@/content/registry';
import type { Opening } from '@/content/schema';
import styles from './OpeningPicker.module.css';

interface OpeningPickerProps {
  selected: string[];
  onToggle: (id: string) => void;
  /** Selección múltiple; sin esto solo se elige una */
  multi?: boolean;
  /** Tope de elegidas en selección múltiple */
  max?: number;
  /** Apertura que no se ofrece (la que ya se va a repasar) */
  exclude?: string | null;
  initialSide?: Opening['side'];
  /** Fila para no elegir ninguna (selección única) */
  none?: { label: string; onClick: () => void };
  label: string;
}

/** Agrupa por la primera jugada de las blancas: «1.e4» o, jugando con negras, «Contra 1.e4». */
function byFirstMove(openings: Opening[]) {
  const groups = new Map<string, Opening[]>();
  for (const o of openings) {
    const title = `${o.side === 'b' ? 'Contra ' : ''}1.${o.lines[0].moves[0]}`;
    groups.set(title, [...(groups.get(title) ?? []), o]);
  }
  return [...groups];
}

/** Lista de aperturas por color, para elegir una o varias sin perderse entre botones. */
export function OpeningPicker({ selected, onToggle, multi, max, exclude, initialSide = 'w', none, label }: OpeningPickerProps) {
  const [side, setSide] = useState(initialSide);
  const full = multi && max !== undefined && selected.length >= max;
  const groups = byFirstMove(allOpenings.filter((o) => o.side === side && o.id !== exclude));
  const role = multi ? 'checkbox' : 'radio';

  return (
    <div className={styles.picker}>
      <Tabs
        size="sm"
        value={side}
        onChange={setSide}
        items={[
          { value: 'w', label: 'Con blancas', icon: 'piece-pawn-w' },
          { value: 'b', label: 'Con negras', icon: 'piece-pawn' },
        ]}
      />
      <div className={styles.picker} role={multi ? 'group' : 'radiogroup'} aria-label={label}>
        {none && (
          <button type="button" role={role} aria-checked={selected.length === 0} className={[styles.row, selected.length === 0 && styles.rowOn].filter(Boolean).join(' ')} onClick={none.onClick}>
            <span className={styles.name}>{none.label}</span>
            <span className={styles.check} aria-hidden>
              {selected.length === 0 && <Icon name="check" />}
            </span>
          </button>
        )}
        {groups.map(([title, openings]) => (
          <div key={title} className={styles.group}>
            <p className="eyebrow" style={{ margin: 0 }}>
              {title}
            </p>
            <div className={styles.list}>
              {openings.map((o) => {
                const on = selected.includes(o.id);
                return (
                  <button key={o.id} type="button" role={role} aria-checked={on} disabled={full && !on} className={[styles.row, on && styles.rowOn].filter(Boolean).join(' ')} onClick={() => onToggle(o.id)}>
                    <span className={styles.text}>
                      <span className={styles.name}>
                        {o.name} {o.eco && <small>{o.eco}</small>}
                      </span>
                      <span className={styles.detail}>{o.description}</span>
                    </span>
                    <span className={styles.check} aria-hidden>
                      {on && <Icon name="check" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
