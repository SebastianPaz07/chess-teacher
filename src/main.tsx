import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import { restoreCachedPuzzles } from '@/services/lichess/lichessPuzzles';
import '@/styles/global.css';

// Los ejercicios de Lichess del plan se guardan en el dispositivo: hay que
// registrarlos al arrancar para que la práctica del día los encuentre tras recargar.
restoreCachedPuzzles();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
