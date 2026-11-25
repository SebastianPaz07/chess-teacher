import styles from './ProgressBar.module.css';

interface ProgressBarProps {
  value: number; // 0..1
  color?: string;
  height?: number;
  label?: string;
  showValue?: boolean;
}

export function ProgressBar({ value, color = 'var(--gradient-accent)', height = 14, label, showValue }: ProgressBarProps) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className={styles.wrap}>
      {(label || showValue) && (
        <div className={styles.meta}>
          <span>{label}</span>
          {showValue && <span>{pct}%</span>}
        </div>
      )}
      <div className={styles.track} style={{ height }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={styles.fill} style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
