import type { Scene } from '@/components/illustrations/PieceScene';

/** Explicación sencilla (para quien no sabe nada) e ilustración de cada tema de práctica. */
export interface ThemeInfo {
  description: string;
  scene: Scene;
}

export const FALLBACK_INFO: ThemeInfo = {
  description: 'Ejercicios de este tema. Practicarlos te ayuda a ver más rápido lo que pasa en el tablero.',
  scene: { b: '...../...../..N../...../.....', a: ['2,2>3,0'] },
};

/** Todas las escenas son de 5×5 casillas. Mayúsculas = blancas (tú), minúsculas = negras. */
export const THEME_INFO: Record<string, ThemeInfo> = {
  mate: {
    description: 'Atacas al rey rival y no tiene ninguna forma de escapar. ¡Ganas la partida!',
    scene: { b: 'R...k/...../....Q/...../.....', a: ['0,0>3,0'], m: ['4,0'] },
  },
  horquilla: {
    description: 'Una sola pieza ataca a dos piezas rivales a la vez. El rival solo puede salvar una.',
    scene: { b: '.k.r./...../..N../...../.....', a: ['2,2>1,0', '2,2>3,0'], m: ['1,0', '3,0'] },
  },
  clavada: {
    description: 'Una pieza no puede moverse porque detrás hay otra más valiosa (o el rey) que quedaría atacada.',
    scene: { b: '...../...k./..n../...../B....', a: ['0,4>2,2'], m: ['2,2'] },
  },
  ensartada: {
    description: 'Atacas una pieza valiosa; al moverse, deja al descubierto otra que estaba detrás.',
    scene: { b: '...../...../R.k.q/...../.....', a: ['0,2>2,2'], m: ['2,2', '4,2'] },
  },
  descubierta: {
    description: 'Mueves una pieza y descubres el ataque de otra que estaba detrás. ¡Dos amenazas a la vez!',
    scene: { b: '..q../...../..B../...../..R..', a: ['2,2>4,0', '2,4>2,3'], m: ['2,0'] },
  },
  'jaque-doble': {
    description: 'Dos piezas dan jaque al mismo tiempo. La única respuesta posible es mover el rey.',
    scene: { b: '....k/...../...N./...../....R', a: ['3,2>4,0', '4,4>4,1'], m: ['4,0'] },
  },
  desviacion: {
    description: 'Obligas a una pieza rival a abandonar su puesto para dejar algo importante sin protección.',
    scene: { b: '...rk/...../...../...../R..Q.', a: ['3,4>3,0'], m: ['3,0'] },
  },
  atraccion: {
    description: 'Atraes una pieza rival (a menudo el rey) a una casilla donde puedes atacarla.',
    scene: { b: '...../..k../...../..Q../.R...', a: ['2,3>2,2'], m: ['2,1'] },
  },
  despeje: {
    description: 'Quitas una de tus piezas del camino para que otra pueda atacar o avanzar.',
    scene: { b: 'k..../...../N..../...../R....', a: ['0,2>2,1', '0,4>0,1'], m: ['0,0'] },
  },
  interferencia: {
    description: 'Pones una pieza en medio de dos piezas rivales para cortar su comunicación.',
    scene: { b: 'r...r/...../....B/...../.....', a: ['4,2>2,0'], m: ['2,0'] },
  },
  intermedia: {
    description: 'En lugar de la respuesta esperada, juegas antes otra jugada con amenaza.',
    scene: { b: '....k/...../..N../..q../.....', a: ['2,2>4,1'], m: ['4,1'] },
  },
  sacrificio: {
    description: 'Entregas material a propósito para conseguir algo mejor: un mate o una gran ventaja.',
    scene: { b: '..rk./...../..Q../...../.....', a: ['2,2>2,0'], m: ['2,0'] },
  },
  captura: {
    description: 'Ganas material capturando piezas que están sin defender.',
    scene: { b: '...../...p./...../...../B....', a: ['0,4>3,1'], m: ['3,1'] },
  },
  'pieza-atrapada': {
    description: 'Una pieza rival se queda sin casillas seguras y acabas capturándola.',
    scene: { b: 'b..../.P.../..N../...../.....', a: ['2,2>0,1'], m: ['0,0'] },
  },
  combinacion: {
    description: 'Una secuencia de jugadas forzadas que termina en ventaja. Une varios trucos.',
    scene: { b: 'r...k/...../..Q../...../....R', a: ['2,2>0,0', '4,4>4,1'], m: ['4,0'] },
  },
  'ataque-al-rey': {
    description: 'Atacas el rey rival con varias piezas para conseguir mate o una gran ventaja.',
    scene: { b: '...k./..ppp/...../Q.N../.....', a: ['0,3>3,0', '2,3>3,1'], m: ['3,0'] },
  },
  'ataque-flanco-dama': {
    description: 'Atacas por el lado de la dama (columnas a-c), a menudo con peones y torres.',
    scene: { b: 'k..../.Q.../R..../...../.....', a: ['1,1>0,0'], m: ['0,0'] },
  },
  defensa: {
    description: 'Encuentras la forma de parar la amenaza del rival y salvar tu posición.',
    scene: { b: '....q/...../..B../...../K....', a: ['4,0>2,2'], m: ['2,2'] },
  },
  'jugada-tranquila': {
    description: 'Una jugada sin jaque ni captura, pero tan buena que el rival ya no tiene defensa.',
    scene: { b: '.k.../.p.../...../..B../K..R.', a: ['2,3>3,2'], m: ['3,2'] },
  },
  final: {
    description: 'Partidas con pocas piezas. Aquí cada casilla del rey y cada peón cuentan.',
    scene: { b: '...k./...../...../.K.R./.....', a: ['3,3>3,1'], m: ['3,0'] },
  },
  'final-torres': {
    description: 'Finales con torres: te enseñan a activar la torre y a coronar peones.',
    scene: { b: '....k/...r./...../.R.../K....', a: ['1,3>1,0'], m: ['1,0'] },
  },
  'final-peones': {
    description: 'Solo hay reyes y peones. Gana el que llega antes o usa mejor el rey.',
    scene: { b: '..k../...../..P../...../..K..', a: ['2,2>2,1'] },
  },
  'peon-pasado': {
    description: 'Un peón sin peones rivales que le cierren el camino: puede avanzar hasta coronar.',
    scene: { b: '...../...../...../..P../.p.p.', a: ['2,3>2,0'], m: ['2,0'] },
  },
  promocion: {
    description: 'Un peón llega al final del tablero y se convierte en una pieza más fuerte, normalmente dama.',
    scene: { b: '...../..P../...../...../K...k', a: ['2,1>2,0'], m: ['2,0'] },
  },
  zugzwang: {
    description: 'Situación en la que mover es perjudicial: preferirías pasar, pero no se puede.',
    scene: { b: '...k./...../...K./p..../.....', m: ['3,0'] },
  },
  'mate-ahogado': {
    description: 'Si el rey no está en jaque pero no puede moverse, la partida termina en tablas (empate).',
    scene: { b: '....k/...../...Q./...../K....', m: ['4,0'] },
  },
  apertura: {
    description: 'Las primeras jugadas: saca tus piezas, controla el centro y pon el rey a salvo.',
    scene: { b: '...../ppppp/...../..P../RNBQK', a: ['1,4>2,2'] },
  },
  'apertura-trampa': {
    description: 'Trampas habituales en las primeras jugadas para ganar material rápido.',
    scene: { b: '...../ppppp/...../..P../RNBQK', m: ['2,1'], a: ['3,4>0,1'] },
  },
  'medio-juego': {
    description: 'La parte central de la partida: coordinas tus piezas y buscas un plan.',
    scene: { b: 'r.bqk/...../..N../.P..B/R..QK', a: ['2,2>3,0'] },
  },
  ventaja: {
    description: 'Tienes una posición mejor: aprende a convertirla en victoria paso a paso.',
    scene: { b: '..k../...../..Q../...../..K..', a: ['2,2>2,1'] },
  },
  'ventaja-decisiva': {
    description: 'Ya vas muy por delante; ahora toca no complicar y rematar la partida.',
    scene: { b: '..k../...../.QR../...../..K..', a: ['1,2>1,0', '2,2>2,0'], m: ['2,0'] },
  },
};
