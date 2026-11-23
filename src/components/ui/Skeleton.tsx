import styles from './Skeleton.module.css';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  lines?: number;
}

export function Skeleton({ width = '100%', height = 16, radius = 8, lines = 1 }: SkeletonProps) {
  return (
    <div className={styles.group} aria-hidden>
      {Array.from({ length: lines }, (_, i) => (
        <span key={i} className={styles.bone} style={{ width: i === lines - 1 && lines > 1 ? '60%' : width, height, borderRadius: radius }} />
      ))}
    </div>
  );
}
