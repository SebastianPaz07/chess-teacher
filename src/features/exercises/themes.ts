/** Agrupa los temas (slugs de los ejercicios) en secciones generales para la pantalla de Práctica. */

export interface ThemeGroup {
  id: string;
  label: string;
  description: string;
}

export const THEME_GROUPS: ThemeGroup[] = [
  { id: 'tactica', label: 'Tácticas', description: 'Mates y motivos para ganar material' },
  { id: 'ataque', label: 'Ataque y defensa', description: 'Iniciativa, rey y precisión' },
  { id: 'finales', label: 'Finales', description: 'Cuando quedan pocas piezas' },
  { id: 'partida', label: 'Apertura y medio juego', description: 'Fases de la partida' },
  { id: 'ventaja', label: 'Ventaja', description: 'Convertir posiciones mejores' },
  { id: 'otros', label: 'Otros', description: '' },
];

const GROUP_OF: Record<string, string> = {
  mate: 'tactica',
  horquilla: 'tactica',
  clavada: 'tactica',
  ensartada: 'tactica',
  descubierta: 'tactica',
  'jaque-doble': 'tactica',
  desviacion: 'tactica',
  atraccion: 'tactica',
  despeje: 'tactica',
  interferencia: 'tactica',
  intermedia: 'tactica',
  sacrificio: 'tactica',
  captura: 'tactica',
  'pieza-atrapada': 'tactica',
  combinacion: 'tactica',
  'ataque-al-rey': 'ataque',
  'ataque-flanco-dama': 'ataque',
  defensa: 'ataque',
  'jugada-tranquila': 'ataque',
  final: 'finales',
  'final-torres': 'finales',
  'final-peones': 'finales',
  'peon-pasado': 'finales',
  promocion: 'finales',
  zugzwang: 'finales',
  'mate-ahogado': 'finales',
  apertura: 'partida',
  'apertura-trampa': 'partida',
  'medio-juego': 'partida',
  ventaja: 'ventaja',
  'ventaja-decisiva': 'ventaja',
};

const LABEL: Record<string, string> = {
  mate: 'Mates',
  final: 'Finales en general',
  'apertura-trampa': 'Trampas de apertura',
  'ataque-al-rey': 'Ataque al rey',
  'ataque-flanco-dama': 'Ataque en el flanco de dama',
  desviacion: 'Desviación',
  atraccion: 'Atracción',
  promocion: 'Promoción',
  combinacion: 'Combinación',
  'final-torres': 'Finales de torres',
  'final-peones': 'Finales de peones',
  'jaque-doble': 'Jaque doble',
  'jugada-tranquila': 'Jugada tranquila',
  'mate-ahogado': 'Rey ahogado',
  'medio-juego': 'Medio juego',
  'peon-pasado': 'Peón pasado',
  'pieza-atrapada': 'Pieza atrapada',
  'ventaja-decisiva': 'Ventaja decisiva',
  intermedia: 'Jugada intermedia',
  descubierta: 'Ataque descubierto',
};

export const themeGroup = (slug: string): string => GROUP_OF[slug] ?? 'otros';

export function themeLabel(slug: string): string {
  if (LABEL[slug]) return LABEL[slug];
  const text = slug.replace(/-/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}
