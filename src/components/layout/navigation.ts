/** Las 5 secciones del menú y las pantallas que cuelgan de cada una. */

export interface Section {
  /** Pantalla raíz: la que abre el menú */
  to: string;
  label: string;
  icon: string;
  /** Rutas de la sección (incluyen sus subrutas): con cualquiera de ellas queda marcada */
  paths: string[];
}

export const SECTIONS: Section[] = [
  { to: '/', label: 'Hoy', icon: 'home', paths: ['/', '/semana'] },
  { to: '/practica', label: 'Práctica', icon: 'puzzle', paths: ['/practica', '/repaso', '/rush'] },
  { to: '/club', label: 'Club', icon: 'users', paths: ['/club', '/unirse', '/crear-club'] },
  { to: '/mapa', label: 'Índice', icon: 'notebook', paths: ['/mapa', '/leccion', '/aperturas', '/partidas', '/biblioteca', '/test-nivel'] },
  { to: '/perfil', label: 'Perfil', icon: 'user', paths: ['/perfil', '/progreso', '/logros', '/ajustes'] },
];

const trim = (pathname: string) => pathname.replace(/\/+$/, '') || '/';

export function sectionOf(pathname: string): Section | undefined {
  const path = trim(pathname);
  // «/» solo coincide consigo misma: ninguna ruta empieza por «//»
  return SECTIONS.find((s) => s.paths.some((p) => path === p || path.startsWith(`${p}/`)));
}

export const isSectionRoot = (pathname: string) => SECTIONS.some((s) => s.to === trim(pathname));
