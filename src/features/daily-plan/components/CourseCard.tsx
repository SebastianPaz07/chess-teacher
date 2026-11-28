import { Link } from 'react-router-dom';
import { ProgressBar } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { modules } from '@/content/registry';
import { moduleCompletion, nextLessons } from '@/services/scheduler/progression';
import { THEMES, type ThemeId } from '@/services/scheduler/weekPlan';
import { useProgressStore } from '@/store/progressStore';
import styles from '../HomePage.module.css';

const SHOWN = 3;

/** «Avanza con este capítulo»: los capítulos abiertos y la lección que sigue en cada uno. */
export function CourseCard({ theme }: { theme: ThemeId | null }) {
  const progress = useProgressStore();
  const tags = new Set(theme ? THEMES[theme].tags : []);
  const pending = nextLessons(modules, progress);
  if (!pending.length) return null;
  const started = (moduleId: string) => modules.find((m) => m.id === moduleId)!.lessons.some((l) => progress.lessons[l.id] || progress.lessonDrafts[l.id]);
  // Primero lo que ya empezaste, luego lo que encaja con el tema de hoy y después el orden del índice
  const score = (l: (typeof pending)[number]) => (progress.lessonDrafts[l.id] ? 4 : 0) + (l.tags.some((t) => tags.has(t)) ? 2 : 0) + (started(l.moduleId) ? 1 : 0);
  const list = [...pending].sort((a, b) => score(b) - score(a)).slice(0, SHOWN);

  return (
    <section aria-labelledby="course-title" className={styles.free}>
      <h2 id="course-title" className={styles.coachTitle}>
        Entrenamiento
      </h2>
      <ul className={styles.freeList}>
        {list.map((l, i) => {
          const m = modules.find((x) => x.id === l.moduleId)!;
          const done = m.lessons.filter((x) => progress.lessons[x.id]).length;
          const draft = progress.lessonDrafts[l.id];
          return (
            <li key={l.id}>
              <Link to={`/leccion/${l.id}`} className={styles.freeItem}>
                <Icon name={m.icon} />
                <span>
                  <small className="eyebrow">
                    {draft ? 'Retoma' : i === 0 ? 'Avanza con este capítulo' : 'También puedes'} · Capítulo {modules.indexOf(m) + 1}: {m.title}
                  </small>
                  <strong>{l.title}</strong>
                  <small>
                    {done}/{m.lessons.length} lecciones · {draft ? `vas en el paso ${draft.index + 1} de ${l.steps.length}` : `${l.minutes} min`}
                  </small>
                  <ProgressBar value={moduleCompletion(m, progress)} height={4} color="var(--color-primary)" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <Link to="/mapa/capitulos" className={styles.allLink}>
        Ver el índice completo ({modules.length} capítulos)
      </Link>
    </section>
  );
}
