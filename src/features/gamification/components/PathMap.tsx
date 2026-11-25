import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Modal } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import type { Module } from '@/content/schema';
import { isLessonUnlocked, moduleState, type ProgressSnapshot } from '@/services/scheduler/progression';
import { useProgressStore } from '@/store/progressStore';
import styles from './PathMap.module.css';

const STATE_LABEL = {
  locked: null,
  available: null,
  'in-progress': null,
  completed: { tone: 'success', text: 'Completado' },
  mastered: { tone: 'primary', text: 'Dominado' },
} as const;

/** Índice del curso: capítulos desplegables con sus lecciones. */
export function PathMap({ modules, progress }: { modules: Module[]; progress: ProgressSnapshot }) {
  const skipLessons = useProgressStore((s) => s.skipLessons);
  const unskipLessons = useProgressStore((s) => s.unskipLessons);

  // Capítulo con la siguiente lección pendiente (el único abierto al entrar)
  const currentModule = modules.find((m) => {
    const st = moduleState(m, modules, progress);
    return st !== 'locked' && st !== 'mastered' && st !== 'completed';
  });
  const [open, setOpen] = useState<Set<string>>(() => new Set(currentModule ? [currentModule.id] : []));
  const [skipping, setSkipping] = useState<Module | null>(null);
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  let currentMarked = false;

  return (
    <div className={styles.index}>
      {modules.map((m, mi) => {
        const state = moduleState(m, modules, progress);
        const label = STATE_LABEL[state];
        const doneCount = m.lessons.filter((l) => progress.lessons[l.id]).length;
        const skippedCount = m.lessons.filter((l) => progress.lessons[l.id]?.skipped).length;
        const isOpen = open.has(m.id);
        const panelId = `chapter-${m.id}`;
        const canSkip = state !== 'locked' && state !== 'completed' && state !== 'mastered';
        return (
          <section key={m.id} className={[styles.chapter, isOpen && styles.chapterOpen, state === 'locked' && styles.chapterLocked].filter(Boolean).join(' ')}>
            <button type="button" className={styles.chapterToggle} onClick={() => toggle(m.id)} aria-expanded={isOpen} aria-controls={panelId}>
              <span className={`${styles.chapterNum} num`}>{String(mi + 1).padStart(2, '0')}</span>
              <span className={styles.chapterTitles}>
                <span className="eyebrow">
                  Capítulo {mi + 1} · {m.level}
                </span>
                <span className={styles.chapterTitle}>
                  {state === 'locked' && <Icon name="lock" weight="light" />} {m.title}
                </span>
                <span className={styles.chapterSummary}>
                  <span className="num">
                    {doneCount}/{m.lessons.length} lecciones
                  </span>
                  {label && <Badge tone={label.tone}>{label.text}</Badge>}
                </span>
              </span>
              <Icon name="caret-down" className={[styles.caret, isOpen && styles.caretOpen].filter(Boolean).join(' ')} />
            </button>

            {isOpen && (
              <div id={panelId} className={styles.panel}>
                <p className={styles.chapterDesc}>{m.description}</p>
                {state === 'locked' && m.prerequisites.length > 0 && (
                  <Badge tone="neutral" icon="lock">
                    Requiere {m.prerequisites.map((p) => modules.find((x) => x.id === p)?.title ?? p).join(', ')}
                  </Badge>
                )}
                {(canSkip || skippedCount > 0) && (
                  <div className={styles.skipRow}>
                    {canSkip && (
                      <Button size="sm" variant="secondary" icon="skip-forward" onClick={() => setSkipping(m)}>
                        Ya lo domino: saltar capítulo
                      </Button>
                    )}
                    {skippedCount > 0 && (
                      <Button size="sm" variant="ghost" icon="skip-back" onClick={() => unskipLessons(m.lessons.map((l) => l.id))}>
                        Deshacer lo saltado
                      </Button>
                    )}
                  </div>
                )}

                <ol className={styles.entries}>
                  {m.lessons.map((l, li) => {
                    const rec = progress.lessons[l.id];
                    const done = Boolean(rec);
                    const unlocked = isLessonUnlocked(l, m, modules, progress);
                    const isCurrent = unlocked && !done && !currentMarked && state !== 'mastered';
                    if (isCurrent) currentMarked = true;
                    const stars = rec?.stars ?? 0;
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
                        <span className={`${styles.entryMeta} num`}>
                          {!unlocked ? (
                            'Bloqueada'
                          ) : rec?.skipped ? (
                            'Saltada'
                          ) : done ? (
                            <span className={styles.stars} aria-label={`${stars} de 3 estrellas`}>
                              {[0, 1, 2].map((s) => (
                                <Icon key={s} name="star" size="0.9em" weight={s < stars ? 'fill' : 'regular'} />
                              ))}
                            </span>
                          ) : (
                            `${l.minutes} min`
                          )}
                        </span>
                        {unlocked ? <Icon name="caret-right" className={styles.chevron} /> : <span />}
                      </>
                    );
                    return (
                      <li key={l.id}>
                        {unlocked ? (
                          <Link to={`/leccion/${l.id}`} className={[styles.entry, done && styles.done, isCurrent && styles.current].filter(Boolean).join(' ')}>
                            {body}
                          </Link>
                        ) : (
                          <span className={[styles.entry, styles.locked].join(' ')} aria-disabled="true">
                            {body}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </section>
        );
      })}

      <Modal
        open={Boolean(skipping)}
        onClose={() => setSkipping(null)}
        size="sm"
        title={skipping ? `¿Saltar «${skipping.title}»?` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSkipping(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (skipping) skipLessons(skipping.lessons.map((l) => l.id));
                setSkipping(null);
              }}
            >
              Sí, ya lo domino
            </Button>
          </>
        }
      >
        <p>
          Marcaremos las {skipping?.lessons.length} lecciones como saltadas y se desbloquearán los capítulos siguientes. No suman XP ni estrellas, y puedes abrirlas cuando quieras o deshacer el salto.
        </p>
      </Modal>
    </div>
  );
}
