import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { MenuCards } from '@/components/layout/MenuCards';
import { PageHeader } from '@/components/layout/PageHeader';
import { useGameSummary } from '@/features/gamification/hooks/useGameSummary';
import { useGameStore } from '@/store/gameStore';
import { useReviewStore } from '@/store/reviewStore';

/** Menú de Práctica: ejercicios, repaso y rush. */
export function PracticeHubPage() {
  const [params] = useSearchParams();
  const { search } = useLocation();
  const due = useReviewStore((s) => s.dueCards().length);
  const rushBest = useGameStore((s) => s.stats.rushBest);
  const g = useGameSummary();

  // Antes los ejercicios del plan se abrían aquí: un enlace guardado sigue funcionando
  if (params.has('daily')) return <Navigate to={`/practica/ejercicios${search}`} replace />;

  return (
    <div className="stack">
      <PageHeader compact icon="puzzle" title="Práctica" subtitle="¿Qué quieres entrenar hoy?" />
      <MenuCards
        label="Opciones de práctica"
        items={[
          { to: '/practica/ejercicios', icon: 'puzzle', title: 'Resolver ejercicios', detail: 'Elige un tema o mezcla todos, siempre a tu nivel.', meta: `Rating ${g.rating}` },
          { to: '/repaso', icon: 'review', title: 'Repaso', detail: 'Lo que fallas vuelve justo antes de olvidarlo.', meta: due ? `${due} ${due === 1 ? 'pendiente' : 'pendientes'}` : 'Al día', alert: due > 0 },
          { to: '/rush', icon: 'lightning', title: 'Rush', detail: 'Resuelve todos los que puedas contra el reloj.', meta: rushBest ? `Mejor: ${rushBest}` : undefined },
        ]}
      />
    </div>
  );
}
