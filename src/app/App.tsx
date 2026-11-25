import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import { router } from './router';

function useThemeAttribute() {
  const theme = useSettingsStore((s) => s.theme);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
  }, [theme]);
}

export function App() {
  useThemeAttribute();
  // Si se cerró la app a mitad de una sesión, aplica el rating pendiente
  useEffect(() => {
    const g = useGameStore.getState();
    if ((g.pendingGain ?? 0) || (g.pendingLoss ?? 0)) g.dispatch({ type: 'RATING_FLUSH' });
  }, []);
  return <RouterProvider router={router} />;
}
