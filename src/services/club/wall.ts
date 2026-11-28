/** Textos de los compañeros simulados en el muro (modo demo). */

interface SeedPost {
  botId: string;
  hoursAgo: number;
  text: string;
  likes: string[];
  comments: { botId: string; minutesAfter: number; text: string }[];
}

export const SEED_POSTS: SeedPost[] = [
  {
    botId: 'bot-camila',
    hoursAgo: 3,
    text: '¿Alguien me explica la clavada? La veo en los ejercicios pero en mis partidas se me escapa.',
    likes: ['bot-sofia', 'bot-valentina'],
    comments: [
      { botId: 'bot-ramiro', minutesAfter: 25, text: 'Busca piezas alineadas con tu rey o tu dama. Antes de mover, mira filas, columnas y diagonales.' },
      { botId: 'bot-mateo', minutesAfter: 48, text: 'A mí me ayudó la lección de táctica y hacer ejercicios del tema varios días seguidos.' },
      { botId: 'bot-sofia', minutesAfter: 70, text: 'Yo reviso si mi rey y mi dama quedaron en la misma línea.' },
      { botId: 'bot-andres', minutesAfter: 95, text: 'El sábado la practicamos con ejemplos, si quieres.' },
    ],
  },
  {
    botId: 'bot-ramiro',
    hoursAgo: 27,
    text: 'Reto de la semana: antes de cada jugada pregúntense «¿qué amenaza mi rival?». Cuéntenme cómo les va.',
    likes: ['bot-sofia', 'bot-camila', 'bot-andres', 'bot-valentina'],
    comments: [{ botId: 'bot-valentina', minutesAfter: 90, text: 'Lo probé hoy y no colgué ninguna pieza. ¡Funciona!' }],
  },
  {
    botId: 'bot-mateo',
    hoursAgo: 50,
    text: 'Busco rival para un rush de 3 minutos. ¿Quién se anima?',
    likes: ['bot-andres'],
    comments: [],
  },
];

export const BOT_POSTS = [
  'Acabo de terminar mis ejercicios de hoy. ¿Ya hicieron los suyos?',
  'Hoy me salió un mate del pasillo en una partida. ¡Por fin!',
  '¿Qué apertura están estudiando esta semana?',
  'Consejo: repasen los errores de ayer antes de hacer ejercicios nuevos.',
  'Si practicamos todos, esta semana cumplimos la meta del club.',
];

const REPLIES = {
  /** Respuesta a una publicación tuya */
  post: ['¡Buena! Yo también quiero probarlo.', 'Gracias por compartirlo.', 'Totalmente de acuerdo.', '¡Eso es! A seguir practicando.'],
  question: ['Buena pregunta. A mí me ayudó repasar la lección con calma.', 'Me pasa lo mismo. Si encuentro la respuesta te cuento.', 'Prueba con ejercicios de ese tema unos días, ayuda mucho.'],
  /** Contestación a un comentario tuyo */
  comment: ['¡Gracias por comentar!', 'Muy cierto.', 'No lo había pensado así.', '¡Vamos con todo!'],
  /** Contestación a tu comentario sobre una actividad */
  activity: ['¡Gracias! Costó, pero salió.', '¡Gracias! Te toca a ti.', '¡Gracias por el ánimo!'],
};

export function pickReply(kind: 'post' | 'comment' | 'activity', text: string, random: number): string {
  const list = kind !== 'activity' && text.includes('?') ? REPLIES.question : REPLIES[kind];
  return list[Math.floor(random * list.length) % list.length];
}
