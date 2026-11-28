import { useState } from 'react';
import { PieceScene } from '@/components/illustrations/PieceScene';
import { Button } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import styles from './WelcomeTour.module.css';

const SLIDES: { title: string; text: string; features: { icon: string; title: string; detail: string }[] }[] = [
  {
    title: 'Bienvenido a ChezzClub',
    text: 'Aprende y mejora en ajedrez con un plan hecho a tu medida.',
    features: [
      { icon: 'home', title: 'Tu sesión de hoy', detail: 'Cada día sabes qué hacer, según tu nivel y tu tiempo.' },
      { icon: 'teacher', title: 'Entrenador personal', detail: 'Ajusta la dificultad y te dice qué reforzar.' },
    ],
  },
  {
    title: 'Aprende',
    text: 'Desde mover las piezas hasta los finales.',
    features: [
      { icon: 'book-open', title: 'Lecciones', detail: 'Un camino paso a paso, con tablero interactivo.' },
      { icon: 'books', title: 'Aperturas', detail: 'Mira cada línea y entrénala de memoria.' },
      { icon: 'classic', title: 'Partidas clásicas y biblioteca', detail: 'Juega las jugadas de los maestros, con libros y videos.' },
    ],
  },
  {
    title: 'Practica',
    text: 'Poco y constante es lo que más te mejora.',
    features: [
      { icon: 'puzzle', title: 'Ejercicios', detail: 'Táctica a tu nivel, que sube contigo.' },
      { icon: 'review', title: 'Repaso', detail: 'Vuelve justo lo que estás por olvidar.' },
      { icon: 'lightning', title: 'Rush táctico', detail: 'Resuelve contra el reloj.' },
    ],
  },
  {
    title: 'Avanza',
    text: 'Cada avance cuenta y se nota.',
    features: [
      { icon: 'users', title: 'Club', detail: 'Reta a tus compañeros y compite cada semana.' },
      { icon: 'crown', title: 'Rangos', detail: 'Empiezas como Novato y puedes llegar a Maestro.' },
      { icon: 'medal', title: 'Medallas', detail: 'Gánalas por tus logros y tu constancia.' },
    ],
  },
];

/** Presentación del primer arranque: qué se puede hacer, antes de armar el plan. */
export function WelcomeTour({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const last = index === SLIDES.length - 1;

  return (
    <div className={styles.tour}>
      <section className={styles.slide} aria-live="polite">
        <div className={styles.art} aria-hidden>
          <PieceScene size={112} scene={{ b: '...../..k../...../..N../.K...', a: ['2,3>3,1'] }} />
        </div>
        <h1 className={styles.title}>{slide.title}</h1>
        <p className={styles.text}>{slide.text}</p>
        <ul className={styles.features}>
          {slide.features.map((f) => (
            <li key={f.title} className={styles.feature}>
              <span className={styles.icon}>
                <Icon name={f.icon} />
              </span>
              <span>
                <strong>{f.title}</strong>
                <small>{f.detail}</small>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <footer className={styles.footer}>
        <div className={styles.dots} role="img" aria-label={`Pantalla ${index + 1} de ${SLIDES.length}`}>
          {SLIDES.map((s, i) => (
            <span key={s.title} className={[styles.dot, i === index && styles.dotOn].filter(Boolean).join(' ')} />
          ))}
        </div>
        <div className={styles.actions}>
          {index > 0 ? (
            <Button variant="ghost" onClick={() => setIndex(index - 1)}>
              Atrás
            </Button>
          ) : (
            <span />
          )}
          <Button size="lg" icon="arrow-right" onClick={() => (last ? onDone() : setIndex(index + 1))}>
            {last ? 'Elegir mi nivel' : 'Siguiente'}
          </Button>
        </div>
      </footer>
    </div>
  );
}
