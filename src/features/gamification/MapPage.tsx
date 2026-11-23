import { PageHeader } from '@/components/layout/PageHeader';
import { modules } from '@/content/registry';
import { useProgressStore } from '@/store/progressStore';
import { PathMap } from './components/PathMap';

export function MapPage() {
  const progress = useProgressStore();
  const totalLessons = modules.reduce((a, m) => a + m.lessons.length, 0);
  const done = Object.keys(progress.lessons).length;
  return (
    <div>
      <PageHeader eyebrow="Índice del curso" title="Capítulos" subtitle={`${done}/${totalLessons} lecciones completadas. Los capítulos que ya dominas quedan como repaso opcional.`} />
      <PathMap modules={modules} progress={progress} />
    </div>
  );
}
