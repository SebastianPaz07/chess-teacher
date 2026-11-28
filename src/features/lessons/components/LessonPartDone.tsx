import { Button, Card } from '@/components/ui';

interface Props {
  /** Pasos hechos hoy: [from, to) */
  from: number;
  to: number;
  total: number;
  /** Siguiente paso pendiente del plan, si queda alguno */
  next: { to: string; title: string } | null;
  onKeepGoing: () => void;
}

/** Fin de la parte de hoy de una lección larga: qué hiciste, por qué se detiene aquí y qué sigue. */
export function LessonPartDone({ from, to, total, next, onKeepGoing }: Props) {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <Card tone="success" icon="check-circle" title="Parte de hoy completada" subtitle={`Hiciste los pasos ${from + 1} a ${to} de ${total} de esta lección.`}>
        <div className="stack">
          <p style={{ margin: 0 }}>
            Es una lección larga, así que tu plan la reparte para que quepa en tu tiempo. Quedó guardada: la próxima vez sigues desde el paso {to + 1}.
          </p>
          {next ? (
            <Button to={next.to} size="lg" block icon="arrow-right">
              Siguiente paso del plan
            </Button>
          ) : (
            <Button to="/" size="lg" block icon="check">
              Terminar y volver al inicio
            </Button>
          )}
          {next && (
            <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
              Sigue: {next.title}
            </p>
          )}
          <Button variant="secondary" block onClick={onKeepGoing}>
            Seguir con esta lección ahora
          </Button>
        </div>
      </Card>
    </div>
  );
}
