import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { RewardsCenter } from '@/features/gamification/components/RewardsCenter';
import { useStudyTimer } from '@/hooks/useStudyTimer';
import { useSettingsStore } from '@/store/settingsStore';
import { TopBar } from './TopBar';
import styles from './AppShell.module.css';

export const NAV_ITEMS = [
  { to: '/', label: 'Hoy', icon: 'home', end: true },
  { to: '/practica', label: 'Práctica', icon: 'puzzle' },
  { to: '/club', label: 'Club', icon: 'users' },
  { to: '/mapa', label: 'Índice', icon: 'notebook' },
  { to: '/aperturas', label: 'Aperturas', icon: 'books' },
  { to: '/repaso', label: 'Repaso', icon: 'review' },
  { to: '/rush', label: 'Rush', icon: 'lightning' },
  { to: '/partidas', label: 'Clásicas', icon: 'classic' },
  { to: '/progreso', label: 'Progreso', icon: 'progress' },
  { to: '/logros', label: 'Logros', icon: 'trophy' },
  { to: '/biblioteca', label: 'Biblioteca', icon: 'video' },
  { to: '/ajustes', label: 'Ajustes', icon: 'settings' },
];

/** Las 4 secciones del pulgar; el resto vive en la hoja "Más". */
const PRIMARY = ['/', '/practica', '/club', '/mapa'];
const SECONDARY = NAV_ITEMS.filter((it) => !PRIMARY.includes(it.to));

/** Las lecciones cuelgan del Índice: allí se resalta el menú aunque se esté dentro de una lección. */
const linkClass = (base: string, to?: string) => ({ isActive }: { isActive: boolean }) => {
  const active = isActive || (to === '/mapa' && window.location.pathname.startsWith('/leccion/'));
  return [base, active && styles.active].filter(Boolean).join(' ');
};

export function AppShell() {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const onboarded = useSettingsStore((s) => s.onboarded);
  // Primer arranque: aún no hay plan ni cuenta, así que sin menú ni cabecera de progreso
  const bare = !onboarded && location.pathname === '/empezar';
  // «Volver» solo en pantallas internas, no en las secciones principales del menú
  const isSection = NAV_ITEMS.some((it) => it.to === location.pathname);
  const canGoBack = !bare && !isSection && location.pathname !== '/empezar' && location.pathname !== '/entrar';
  // Si no hay historial (se abrió el enlace directo), «Volver» lleva a Hoy
  const goBack = () => ((window.history.state?.idx ?? 0) > 0 ? navigate(-1) : navigate('/'));
  const inMore = SECONDARY.some((it) => location.pathname.startsWith(it.to));

  // Conecta el club (sesión, sincronización y "realtime") una sola vez
  useStudyTimer();

  // (import diferido para no inflar el bundle inicial)
  useEffect(() => {
    import('@/store/clubStore').then((m) => m.useClubStore.getState().init());
    import('@/store/authStore').then((m) => m.useAuthStore.getState().init());
  }, []);

  // Cierra la hoja al navegar y empieza cada pantalla desde arriba
  useEffect(() => {
    setMoreOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className={[styles.shell, bare && styles.bare].filter(Boolean).join(' ')}>
      <aside className={styles.sidebar}>
        <NavLink to="/" className={styles.brand}>
          <span className={styles.logo} aria-hidden>
            ♞
          </span>
          <span>
            Profe de
            <br />
            Ajedrez
          </span>
        </NavLink>
        <nav className={styles.nav} aria-label="Secciones">
          {NAV_ITEMS.map((it, i) => (
            <NavLink key={it.to} to={it.to} end={it.end} className={linkClass(styles.link, it.to)}>
              <span className={styles.linkNum}>{String(i + 1).padStart(2, '0')}</span>
              <span className={styles.linkLabel}>{it.label}</span>
              <Icon name={it.icon} className={styles.linkIcon} weight="light" />
            </NavLink>
          ))}
        </nav>
        <p className={styles.colophon}>Puzzles: base abierta de Lichess (CC0).</p>
      </aside>

      <div className={styles.main}>
        {!bare && <TopBar />}
        <main className={styles.content}>
          {canGoBack && (
            <div className={styles.backRow}>
              <button type="button" className={styles.backBtn} onClick={goBack}>
                <Icon name="arrow-left" size="1em" /> Volver
              </button>
            </div>
          )}
          <motion.div key={location.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}>
            <Outlet />
          </motion.div>
        </main>
      </div>

      {!bare && (
        <nav className={styles.bottomNav} aria-label="Navegación principal">
          {NAV_ITEMS.filter((it) => PRIMARY.includes(it.to)).map((it) => (
            <NavLink key={it.to} to={it.to} end={it.end} className={linkClass(styles.bottomLink, it.to)}>
              <Icon name={it.icon} size={24} weight="regular" />
              <span>{it.label}</span>
            </NavLink>
          ))}
          <button type="button" className={[styles.bottomLink, (inMore || moreOpen) && styles.active].filter(Boolean).join(' ')} onClick={() => setMoreOpen((o) => !o)} aria-expanded={moreOpen}>
            <Icon name="more" size={24} weight="regular" />
            <span>Más</span>
          </button>
        </nav>
      )}

      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div className={styles.sheetBackdrop} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMoreOpen(false)} />
            <motion.div
              className={styles.sheet}
              role="dialog"
              aria-label="Más secciones"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'tween', duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <p className="eyebrow">Más secciones</p>
              <div className={styles.sheetGrid}>
                {SECONDARY.map((it) => (
                  <NavLink key={it.to} to={it.to} className={linkClass(styles.sheetLink)}>
                    <Icon name={it.icon} size={22} weight="light" />
                    {it.label}
                  </NavLink>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <RewardsCenter />
    </div>
  );
}
