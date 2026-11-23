import { pick } from '@/lib/random';

/** Frases del profesor según el contexto (varían para que se sienta vivo). */
const MESSAGES = {
  greetMorning: ['¡Buenos días! Un poco de ajedrez cada día hace maravillas.', '¡Arriba! Tu cerebro táctico está fresco por la mañana.'],
  greetAfternoon: ['¡Buenas tardes! ¿Listo para tu sesión de hoy?', 'Una pausa de ajedrez y vuelves más afilado.'],
  greetNight: ['¡Buenas noches! Una sesión corta y a descansar.', 'Los grandes maestros también estudian de noche. ¡Vamos!'],
  streakRisk: ['¡No pierdas tu racha! Con una lección basta hoy.', 'Tu racha te está esperando.'],
  dayDone: ['¡Sesión completa! Mañana seguimos subiendo de nivel.', '¡Excelente trabajo hoy! Descansa, que mañana hay más.'],
  correct: ['¡Exacto!', '¡Muy bien visto!', '¡Así se juega!', '¡Precisión de gran maestro!', '¡Bravo!'],
  combo: ['¡Estás en racha!', '¡Combo! Sigue así.', '¡Imparable!'],
  wrong: ['Casi. Mira otra vez las piezas sin defender.', 'Revisa los jaques, capturas y amenazas.', 'No pasa nada, ¡inténtalo de nuevo!', 'Busca la jugada más forzante.'],
  lessonStart: ['Vamos paso a paso. ¡Tú puedes!', 'Lee con calma y luego mueve las piezas.'],
  perfect: ['¡Lección perfecta! Eres una máquina.', '¡Sin errores! Así se aprende.'],
  failed: ['Te quedaste sin vidas. Repite la lección: la segunda vez sale mejor.'],
};

export type TeacherContext = keyof typeof MESSAGES;

export function teacherSays(ctx: TeacherContext) {
  return pick(MESSAGES[ctx]);
}

export function greeting(hour = new Date().getHours()) {
  if (hour < 12) return teacherSays('greetMorning');
  if (hour < 19) return teacherSays('greetAfternoon');
  return teacherSays('greetNight');
}
