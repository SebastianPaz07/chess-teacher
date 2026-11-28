import { MenuCards } from '@/components/layout/MenuCards';
import { PageHeader } from '@/components/layout/PageHeader';
import { allGames, allLessons, allOpenings } from '@/content/registry';
import { useProgressStore } from '@/store/progressStore';

/** Menú del Índice: todo el material de estudio. */
export function IndexPage() {
  const lessons = useProgressStore((s) => s.lessons);
  const done = allLessons.filter((l) => lessons[l.id]).length;

  return (
    <div className="stack">
      <PageHeader compact icon="notebook" title="Índice" subtitle="Todo el material para aprender, en un solo lugar." />
      <MenuCards
        label="Material de estudio"
        items={[
          { to: '/mapa/capitulos', icon: 'map', title: 'Lecciones', detail: 'El curso paso a paso, capítulo por capítulo.', meta: `${done}/${allLessons.length} completadas` },
          { to: '/aperturas', icon: 'books', title: 'Aperturas', detail: 'Repertorio con blancas y negras, línea por línea.', meta: `${allOpenings.length} aperturas` },
          { to: '/partidas', icon: 'classic', title: 'Partidas clásicas', detail: 'Estudia a los maestros jugada a jugada.', meta: `${allGames.length} partidas` },
          { to: '/biblioteca', icon: 'video', title: 'Biblioteca', detail: 'Libros y videos para profundizar.' },
        ]}
      />
    </div>
  );
}
