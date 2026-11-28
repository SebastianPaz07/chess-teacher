import { PageHeader } from '@/components/layout/PageHeader';
import { Button, Card } from '@/components/ui';
import { modules } from '@/content/registry';
import { useProgressStore } from '@/store/progressStore';
import { PathMap } from './components/PathMap';

export function MapPage() {
  const progress = useProgressStore();
  const totalLessons = modules.reduce((a, m) => a + m.lessons.length, 0);
  const done = Object.keys(progress.lessons).length;
  return (
    <div className="stack">
      <PageHeader plain compact eyebrow="Lecciones" title="Capítulos" subtitle={`${done}/${totalLessons} lecciones completadas o saltadas.`} />
      {!progress.placementLevel && (
        <Card tone="accent" icon="exam" title="¿Ya sabes jugar?" subtitle="Haz el test de nivel y se saltan automáticamente los capítulos básicos, o salta capítulos uno por uno con «Ya lo domino».">
          <Button to="/test-nivel" size="sm">
            Hacer el test de nivel
          </Button>
        </Card>
      )}
      <PathMap modules={modules} progress={progress} />
    </div>
  );
}
