import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
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
  return <RouterProvider router={router} />;
}
