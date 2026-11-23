import { Link } from 'react-router-dom';
import { Badge, ProgressBar } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import type { Module } from '@/content/schema';
import { isLessonUnlocked, moduleCompletion, moduleState, type ProgressSnapshot } from '@/services/scheduler/progression';
import styles from './PathMap.module.css';

const STATE_LABEL = {
  locked: null,
  available: null,
  'in-progress': null,
  completed: { tone: 'success', text: 'Completado' },
  mastered: { tone: 'primary', text: 'Dominado · repaso opcional' },
} as const;

/** Índice del curso: módulos como capítulos y lecciones como entradas. */
export function PathMap({ modules, progress }: { modules: Module[]; progress: ProgressSnapshot }) {
  let currentMarked = false;

  return (
    <div className={styles.index}>
      {modules.map((m, mi) => {
        const state = moduleState(m, modules, progress);
        const completion = moduleCompletion(m, progress);
        const label = STATE_LABEL[state];
        return (
          <section key={m.id} className={[styles.chapter, state === 'locked' && styles.chapterLocked].filter(Boolean).join(' ')}>
            <header className={styles.chapterHead}>
              <span className={`${styles.chapterNum} num`}>{String(mi + 1).padStart(2, '0')}</span>
              <div className={styles.chapterTitles}>
                <p className="eyebrow">
                  Capítulo {mi + 1} · {m.level}
                </p>
                <h2 className={styles.chapterTitle}>
                  {m.title} <Icon name={state === 'locked' ? 'lock' : m.icon} weight="light" className={styles.chapterIcon} />
                </h2>
                <p className={styles.chapterDesc}>{m.description}</p>
                <div className="row">
                  {label && <Badge tone={label.tone}>{label.text}</Badge>}
                  {state === 'locked' && m.prerequisites.length > 0 && (
                    <Badge tone="neutral" icon="lock">
                      Requiere {m.prerequisites.map((p) => modules.find((x) => x.id === p)?.title ?? p).join(', ')}
                    </Badge>
                  )}
                </div>
                <div className={styles.chapterBar}>
                  <ProgressBar value={completion} height={2} showValue />
                </div>
              </div>
            </header>

            <ol className={styles.entries}>
              {m.lessons.map((l, li) => {
                const done = Boolean(progress.lessons[l.id]);
                const unlocked = isLessonUnlocked(l, m, modules, progress);
                const isCurrent = unlocked && !done && !currentMarked && state !== 'mastered';
                if (isCurrent) currentMarked = true;
                const stars = progress.lessons[l.id]?.stars ?? 0;
                const body = (
                  <>
                    <span className={`${styles.entryNum} num`}>
                      {mi + 1}.{li + 1}
                    </span>
                    <span className={styles.entryTitle}>
                      <Icon name={unlocked ? l.icon : 'lock'} weight="light" className={styles.entryIcon} />
                      {l.title}
                      {isCurrent && <span className={styles.next}>Siguiente</span>}
                    </span>
                    <span className={styles.leader} aria-hidden />
                    <span className={`${styles.entryMeta} num`}>
                      {done ? (
                        <span className={styles.stars} aria-label={`${stars} de 3 estrellas`}>
                          {[0, 1, 2].map((s) => (
                            <Icon key={s} name="star" size="0.9em" weight={s < stars ? 'fill' : 'regular'} />
                          ))}
                        </span>
                      ) : (
                        `${l.minutes} min`
                      )}
                    </span>
                  </>
                );
                return (
                  <li key={l.id}>
                    {unlocked ? (
                      <Link to={`/leccion/${l.id}`} className={[styles.entry, done && styles.done, isCurrent && styles.current].filter(Boolean).join(' ')}>
                        {body}
                      </Link>
                    ) : (
                      <span className={[styles.entry, styles.locked].join(' ')} aria-disabled>
                        {body}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
