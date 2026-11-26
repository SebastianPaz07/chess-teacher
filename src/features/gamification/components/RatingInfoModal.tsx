import { Modal } from '@/components/ui';
import { levelForRating } from '@/services/scheduler/progression';
import { useGameStore } from '@/store/gameStore';

const LEVEL_LABEL = { principiante: 'Principiante', intermedio: 'Intermedio', avanzado: 'Avanzado' } as const;

/** Explica qué es el puntaje (rating) y cómo cambia. Se abre al tocar el puntaje en la barra superior. */
export function RatingInfoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const rating = useGameStore((g) => g.rating);
  const pendingGain = useGameStore((g) => g.pendingGain ?? 0);
  const pendingLoss = useGameStore((g) => g.pendingLoss ?? 0);
  const level = levelForRating(rating) as keyof typeof LEVEL_LABEL;
  return (
    <Modal open={open} onClose={onClose} title="Tu puntaje (rating)" showClose>
      <div className="stack">
        <p>
          Tu puntaje actual es <strong>{rating}</strong> · nivel <strong>{LEVEL_LABEL[level] ?? level}</strong>.
        </p>
        <p>
          Es una estimación de tu nivel de ajedrez, parecida al Elo. Se calcula comparando tu resultado con la dificultad de cada
          ejercicio: cuanto más difícil el ejercicio que resuelves, más sumas.
        </p>
        <h4 style={{ margin: 0 }}>Cómo funciona</h4>
        <ul>
          <li><strong>Resuelto a la primera, sin pistas:</strong> sumas puntos.</li>
          <li><strong>Resuelto con errores o pistas:</strong> casi no cambia.</li>
          <li><strong>No resuelto:</strong> restas pocos puntos (siempre menos de los que se pueden ganar).</li>
          <li><strong>Se aplica al terminar la sesión:</strong> no baja ni sube en pleno ejercicio; al final se suma todo lo ganado y se resta todo lo perdido.</li>
          <li>Nunca baja de 100, y el test de nivel no cuenta como ejercicio.</li>
        </ul>
        <h4 style={{ margin: 0 }}>Niveles</h4>
        <ul>
          <li>Hasta 1099: principiante</li>
          <li>1100 a 1600: intermedio</li>
          <li>Más de 1600: avanzado</li>
        </ul>
        {(pendingGain > 0 || pendingLoss > 0) && (
          <p className="muted">
            Sesión en curso: +{pendingGain} / −{pendingLoss} (se aplica al terminar).
          </p>
        )}
      </div>
    </Modal>
  );
}
