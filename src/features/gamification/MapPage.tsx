import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, Card } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { modules } from '@/content/registry';
import { useProgressStore } from '@/store/progressStore';
import { PathMap } from './components/PathMap';
import styles from './components/PathMap.module.css';

const AFTER = [
  { to: '/practica', icon: 'puzzle', title: 'Práctica por tema', text: 'Miles de ejercicios que se adaptan a tu rating.' },
  { to: '/aperturas', icon: 'books', title: 'Aperturas', text: 'Repertorio con blancas y negras, línea por línea.' },
  { to: '/partidas', icon: 'classic', title: 'Partidas clásicas', text: 'Estudia a los maestros jugada a jugada.' },
  { to: '/repaso', icon: 'review', title: 'Repaso espaciado', text: 'Lo que fallas vuelve justo cuando lo ibas a olvidar.' },
  { to: '/rush', icon: 'lightning', title: 'Rush', text: 'Velocidad y precisión bajo presión.' },
  { to: '/club?tab=retos', icon: 'sword', title: 'Retos del club', text: 'Mide tu nivel contra tus compañeros.' },
];

export function MapPage() {
  const progress = useProgressStore();
  const totalLessons = modules.reduce((a, m) => a + m.lessons.length, 0);
  const done = Object.keys(progress.lessons).length;
  return (
    <div className="stack">
      <PageHeader plain compact eyebrow="Índice del curso" title="Capítulos" subtitle={`${done}/${totalLessons} lecciones completadas o saltadas.`} />
      {!progress.placementLevel && (
        <Card tone="accent" icon="exam" title="¿Ya sabes jugar?" subtitle="Haz el test de nivel y se saltan automáticamente los capítulos básicos, o salta capítulos uno por uno con «Ya lo domino».">
          <Button to="/test-nivel" size="sm">
            Hacer el test de nivel
          </Button>
        </Card>
      )}
      <PathMap modules={modules} progress={progress} />
      <section className="stack" style={{ gap: 'var(--space-3)' }}>
        <header style={{ paddingTop: 'var(--space-2)' }}>
          <p className="eyebrow" style={{ margin: 0 }}>
            Después del curso
          </p>
          <h2 style={{ margin: 0 }}>¿Y luego qué?</h2>
          <p className="muted" style={{ margin: '4px 0 0', maxWidth: '62ch' }}>
            Al terminar los capítulos, el entrenamiento sigue con estas herramientas. Tu plan diario seguirá proponiéndote práctica y repasos según tus puntos débiles.
          </p>
        </header>
        <div className={styles.after}>
          {AFTER.map((a) => (
            <Link key={a.to} to={a.to} className={styles.afterLink}>
              <strong>
                <Icon name={a.icon} /> {a.title}
              </strong>
              <span>{a.text}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
