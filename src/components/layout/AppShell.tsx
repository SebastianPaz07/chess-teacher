import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { DailyStepBanner } from '@/features/daily-plan/components/DailyStepBanner';
import { RewardsCenter } from '@/features/gamification/components/RewardsCenter';
import { useStudyTimer } from '@/hooks/useStudyTimer';
import { useSettingsStore } from '@/store/settingsStore';
import { isSectionRoot, SECTIONS, sectionOf } from './navigation';
import { TopBar } from './TopBar';
import styles from './AppShell.module.css';

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const onboarded = useSettingsStore((s) => s.onboarded);
  // Primer arranque: aún no hay plan ni cuenta, así que sin menú ni cabecera de progreso
  const bare = !onboarded && location.pathname === '/empezar';
  const section = sectionOf(location.pathname);
  // «Volver» en toda pantalla que no sea una de las del menú
  const canGoBack = !bare && !isSectionRoot(location.pathname) && location.pathname !== '/empezar' && location.pathname !== '/entrar';
  // Sin historial (se abrió el enlace directo), «Volver» lleva al menú de su sección
  const goBack = () => ((window.history.state?.idx ?? 0) > 0 ? navigate(-1) : navigate(section?.to ?? '/'));

  // Conecta el club (sesión, sincronización y "realtime") una sola vez
  useStudyTimer();

  // (import diferido para no inflar el bundle inicial)
  useEffect(() => {
    import('@/store/clubStore').then((m) => m.useClubStore.getState().init());
    import('@/store/authStore').then((m) => m.useAuthStore.getState().init());
  }, []);

  // Cada pantalla empieza desde arriba
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className={[styles.shell, bare && styles.bare].filter(Boolean).join(' ')}>
      <aside className={styles.sidebar}>
        <Link to="/" className={styles.brand}>
          <span className={styles.logo} aria-hidden>
            ♞
          </span>
          <span>ChezzClub</span>
        </Link>
        <nav className={styles.nav} aria-label="Secciones">
          {SECTIONS.map((it, i) => {
            const active = it === section;
            return (
              <Link key={it.to} to={it.to} className={[styles.link, active && styles.active].filter(Boolean).join(' ')} aria-current={active ? 'page' : undefined}>
                <span className={styles.linkNum}>{String(i + 1).padStart(2, '0')}</span>
                <span className={styles.linkLabel}>{it.label}</span>
                <Icon name={it.icon} className={styles.linkIcon} weight="light" />
              </Link>
            );
          })}
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
            <DailyStepBanner />
            <Outlet />
          </motion.div>
        </main>
      </div>

      {!bare && (
        <nav className={styles.bottomNav} aria-label="Navegación principal">
          {SECTIONS.map((it) => {
            const active = it === section;
            return (
              <Link key={it.to} to={it.to} className={[styles.bottomLink, active && styles.active].filter(Boolean).join(' ')} aria-current={active ? 'page' : undefined}>
                <Icon name={it.icon} size={24} weight="regular" />
                <span>{it.label}</span>
              </Link>
            );
          })}
        </nav>
      )}

      <RewardsCenter />
    </div>
  );
}
