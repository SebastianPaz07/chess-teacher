/** Logros: condiciones sobre las estadísticas acumuladas. Añadir uno = añadir una entrada. */

export interface GameStats {
  lessonsCompleted: number;
  perfectLessons: number;
  puzzlesSolved: number;
  puzzlesAttempted: number;
  cleanPuzzles: number;
  mates: number;
  reviewsDone: number;
  openingLines: number;
  rushBest: number;
  rushPlayed: number;
  guessGames: number;
  modulesCompleted: string[];
  dailyPlansCompleted: number;
  placementDone: boolean;
  themeSolved: Record<string, number>;
  challengesPlayed: number;
  challengesWon: number;
  revengeWins: number;
  weeklyChallenges: number;
}

export const initialStats: GameStats = {
  lessonsCompleted: 0,
  perfectLessons: 0,
  puzzlesSolved: 0,
  puzzlesAttempted: 0,
  cleanPuzzles: 0,
  mates: 0,
  reviewsDone: 0,
  openingLines: 0,
  rushBest: 0,
  rushPlayed: 0,
  guessGames: 0,
  modulesCompleted: [],
  dailyPlansCompleted: 0,
  placementDone: false,
  themeSolved: {},
  challengesPlayed: 0,
  challengesWon: 0,
  revengeWins: 0,
  weeklyChallenges: 0,
};

export interface AchievementContext {
  stats: GameStats;
  streakBest: number;
  level: number;
  rating: number;
  /** Días desde que empezó a usar la app */
  daysLearning: number;
  /** Minutos de estudio acumulados */
  studyMinutes: number;
}

export type MedalTier = 'bronce' | 'plata' | 'oro';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  tier: MedalTier;
  check: (c: AchievementContext) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'week-1', title: 'Primera semana', description: '7 días aprendiendo', icon: 'calendar', tier: 'bronce', check: (c) => c.daysLearning >= 7 },
  { id: 'month-1', title: 'Un mes en el tablero', description: '30 días aprendiendo', icon: 'seal', tier: 'plata', check: (c) => c.daysLearning >= 30 },
  { id: 'hours-1', title: 'Primera hora', description: 'Suma 1 hora de estudio', icon: 'clock', tier: 'bronce', check: (c) => c.studyMinutes >= 60 },
  { id: 'hours-10', title: 'Diez horas', description: 'Suma 10 horas de estudio', icon: 'timer', tier: 'oro', check: (c) => c.studyMinutes >= 600 },
  { id: 'first-step', title: 'Primer paso', description: 'Completa tu primera lección', icon: 'footprints', tier: 'bronce', check: (c) => c.stats.lessonsCompleted >= 1 },
  { id: 'placement', title: '¿Cuánto sabes?', description: 'Haz el test de nivel', icon: 'compass', tier: 'bronce', check: (c) => c.stats.placementDone },
  { id: 'first-mate', title: 'Primer mate', description: 'Da jaque mate en un ejercicio', icon: 'piece-king', tier: 'bronce', check: (c) => c.stats.mates >= 1 },
  { id: 'mates-25', title: 'Verdugo', description: 'Da 25 jaques mate', icon: 'sword', tier: 'oro', check: (c) => c.stats.mates >= 25 },
  { id: 'puzzles-10', title: 'Calentando motores', description: 'Resuelve 10 ejercicios', icon: 'puzzle', tier: 'bronce', check: (c) => c.stats.puzzlesSolved >= 10 },
  { id: 'puzzles-100', title: 'Táctico', description: 'Resuelve 100 ejercicios', icon: 'target', tier: 'plata', check: (c) => c.stats.puzzlesSolved >= 100 },
  { id: 'forks-5', title: 'Tenedor de oro', description: 'Resuelve 5 horquillas', icon: 'fork', tier: 'plata', check: (c) => (c.stats.themeSolved['horquilla'] ?? 0) >= 5 },
  { id: 'perfect-3', title: 'Perfeccionista', description: '3 lecciones sin errores', icon: 'star', tier: 'plata', check: (c) => c.stats.perfectLessons >= 3 },
  { id: 'streak-3', title: 'Constancia', description: 'Racha de 3 días', icon: 'fire', tier: 'bronce', check: (c) => c.streakBest >= 3 },
  { id: 'streak-7', title: 'Semana de fuego', description: 'Racha de 7 días', icon: 'fire', tier: 'plata', check: (c) => c.streakBest >= 7 },
  { id: 'streak-30', title: 'Imparable', description: 'Racha de 30 días', icon: 'mountain', tier: 'oro', check: (c) => c.streakBest >= 30 },
  { id: 'opening-5', title: 'Teórico', description: 'Entrena 5 líneas de apertura', icon: 'books', tier: 'plata', check: (c) => c.stats.openingLines >= 5 },
  { id: 'reviews-20', title: 'Memoria de elefante', description: 'Completa 20 repasos', icon: 'brain', tier: 'plata', check: (c) => c.stats.reviewsDone >= 20 },
  { id: 'rush-10', title: 'Relámpago', description: '10 puntos en Rush táctico', icon: 'lightning', tier: 'plata', check: (c) => c.stats.rushBest >= 10 },
  { id: 'guess-1', title: 'Historiador', description: 'Juega una partida clásica', icon: 'classic', tier: 'bronce', check: (c) => c.stats.guessGames >= 1 },
  { id: 'daily-5', title: 'Alumno aplicado', description: 'Completa 5 sesiones diarias', icon: 'calendar', tier: 'plata', check: (c) => c.stats.dailyPlansCompleted >= 5 },
  { id: 'module-1', title: 'Módulo superado', description: 'Completa un módulo entero', icon: 'medal', tier: 'plata', check: (c) => c.stats.modulesCompleted.length >= 1 },
  { id: 'level-5', title: 'Aficionado', description: 'Alcanza el nivel 5', icon: 'piece-bishop', tier: 'plata', check: (c) => c.level >= 5 },
  { id: 'rating-1200', title: 'Club', description: 'Rating de entrenamiento 1200', icon: 'progress', tier: 'plata', check: (c) => c.rating >= 1200 },
  { id: 'challenge-1', title: 'Guante lanzado', description: 'Completa tu primer reto contra un compañero', icon: 'sword', tier: 'bronce', check: (c) => c.stats.challengesPlayed >= 1 },
  { id: 'challenge-wins-5', title: 'Rival temido', description: 'Gana 5 retos del club', icon: 'trophy', tier: 'oro', check: (c) => c.stats.challengesWon >= 5 },
  { id: 'revenge', title: 'Revancha', description: 'Gana la revancha de un reto que perdiste', icon: 'handshake', tier: 'plata', check: (c) => c.stats.revengeWins >= 1 },
  { id: 'weekly-1', title: 'Espíritu de club', description: 'Juega el desafío semanal del club', icon: 'users', tier: 'bronce', check: (c) => c.stats.weeklyChallenges >= 1 },
  { id: 'rating-1600', title: 'Calculador', description: 'Rating de entrenamiento 1600', icon: 'rocket', tier: 'oro', check: (c) => c.rating >= 1600 },
];
