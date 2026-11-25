import { Icon } from './Icon';
import styles from './Tabs.module.css';

interface TabsProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: string; icon?: string }[];
  /** `sm`: más pequeño (selectores de dos opciones) */
  size?: 'md' | 'sm';
}

export function Tabs<T extends string>({ value, onChange, items, size = 'md' }: TabsProps<T>) {
  return (
    <div className={[styles.tabs, size === 'sm' && styles.small].filter(Boolean).join(' ')} role="tablist">
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          aria-selected={value === it.value}
          className={[styles.tab, value === it.value && styles.active].filter(Boolean).join(' ')}
          onClick={() => onChange(it.value)}
        >
          {it.icon && <Icon name={it.icon} />}
          {it.label}
        </button>
      ))}
    </div>
  );
}
