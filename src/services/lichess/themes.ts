/** Temas de Lichess → tags de la app (en español). Los no listados se ignoran. Espejo de scripts/import-lichess.mjs. */
export const LICHESS_TO_TAG: Record<string, string> = {
  mate: 'mate', mateIn1: 'mate', mateIn2: 'mate', mateIn3: 'mate', mateIn4: 'mate', mateIn5: 'mate',
  backRankMate: 'pasillo', smotheredMate: 'mate-ahogado', anastasiaMate: 'mate', arabianMate: 'mate', hookMate: 'mate',
  bodenMate: 'mate', doubleBishopMate: 'mate', dovetailMate: 'mate',
  fork: 'horquilla', pin: 'clavada', skewer: 'ensartada', discoveredAttack: 'descubierta', doubleCheck: 'jaque-doble',
  sacrifice: 'sacrificio', deflection: 'desviacion', attraction: 'atraccion', decoy: 'atraccion', clearance: 'despeje',
  interference: 'interferencia', intermezzo: 'intermedia', xRayAttack: 'rayos-x', trappedPiece: 'pieza-atrapada',
  hangingPiece: 'captura', capturingDefender: 'eliminar-defensor', overloading: 'sobrecarga',
  quietMove: 'jugada-tranquila', defensiveMove: 'defensa', zugzwang: 'zugzwang', exposedKing: 'ataque-al-rey',
  kingsideAttack: 'ataque-al-rey', queensideAttack: 'ataque-flanco-dama', attackingF2F7: 'f7',
  advancedPawn: 'peon-pasado', promotion: 'promocion', underPromotion: 'promocion',
  endgame: 'final', pawnEndgame: 'final-peones', rookEndgame: 'final-torres', bishopEndgame: 'final', knightEndgame: 'final',
  queenEndgame: 'final', queenRookEndgame: 'final',
  opening: 'apertura', middlegame: 'medio-juego',
  crushing: 'ventaja-decisiva', advantage: 'ventaja', equality: 'igualar',
};

/** Tag de la app → tema (angle) de Lichess para pedir ejercicios de ese tema. */
export const TAG_TO_ANGLE: Record<string, string> = {
  mate: 'mate', pasillo: 'backRankMate', 'mate-ahogado': 'smotheredMate', horquilla: 'fork', clavada: 'pin', ensartada: 'skewer',
  descubierta: 'discoveredAttack', 'jaque-doble': 'doubleCheck', sacrificio: 'sacrifice', desviacion: 'deflection', atraccion: 'attraction',
  despeje: 'clearance', interferencia: 'interference', intermedia: 'intermezzo', 'pieza-atrapada': 'trappedPiece', captura: 'hangingPiece',
  'jugada-tranquila': 'quietMove', defensa: 'defensiveMove', zugzwang: 'zugzwang', 'ataque-al-rey': 'kingsideAttack',
  'ataque-flanco-dama': 'queensideAttack', 'peon-pasado': 'advancedPawn', promocion: 'promotion', final: 'endgame',
  'final-peones': 'pawnEndgame', 'final-torres': 'rookEndgame', apertura: 'opening', 'medio-juego': 'middlegame',
  'ventaja-decisiva': 'crushing', ventaja: 'advantage', sobrecarga: 'overloading', 'eliminar-defensor': 'capturingDefender',
};

export const TITLE_BY_TAG: Record<string, string> = {
  mate: 'Mate', pasillo: 'Mate del pasillo', 'mate-ahogado': 'Mate de la coz', horquilla: 'Horquilla', clavada: 'Clavada',
  ensartada: 'Ensartada', descubierta: 'Ataque a la descubierta', 'jaque-doble': 'Jaque doble', sacrificio: 'Sacrificio',
  desviacion: 'Desviación', atraccion: 'Atracción', despeje: 'Despeje', interferencia: 'Interferencia', intermedia: 'Jugada intermedia',
  sobrecarga: 'Sobrecarga', 'eliminar-defensor': 'Elimina al defensor', zugzwang: 'Zugzwang', 'jugada-tranquila': 'Jugada tranquila',
  defensa: 'Defensa precisa', promocion: 'Promoción', 'final-torres': 'Final de torres', 'final-peones': 'Final de peones',
  final: 'Final', 'pieza-atrapada': 'Pieza atrapada', captura: 'Pieza colgando', 'ataque-al-rey': 'Ataque al rey',
  'ventaja-decisiva': 'Golpe decisivo', ventaja: 'Mejor jugada',
};

/** Motivo principal de un ejercicio (para variar las sesiones). */
export const motifOf = (e: { themes: string[] }) => MOTIF_ORDER.find((m) => e.themes.includes(m)) ?? e.themes[0];

/** El tag que mejor describe el «motivo» del ejercicio (para el título). */
export const MOTIF_ORDER = ['mate', 'pasillo', 'mate-ahogado', 'horquilla', 'clavada', 'ensartada', 'descubierta', 'jaque-doble', 'sacrificio', 'desviacion', 'atraccion', 'despeje', 'interferencia', 'intermedia', 'sobrecarga', 'eliminar-defensor', 'zugzwang', 'jugada-tranquila', 'defensa', 'promocion', 'final-torres', 'final-peones', 'final', 'pieza-atrapada', 'captura', 'ataque-al-rey', 'ventaja-decisiva', 'ventaja'];
