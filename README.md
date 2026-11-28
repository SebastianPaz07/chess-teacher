# ♞ ChezzClub

App React (Vite + TypeScript) que enseña ajedrez **un poco cada día**, de forma progresiva y gamificada. El temario sigue el material de la carpeta de Drive (clases grabadas + libros). El progreso se guarda en `localStorage`.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 54 pruebas: motor de juego, SM-2, plan diario y legalidad de TODO el contenido
npm run build
npm run inventory  # vuelve a leer la carpeta de Drive (solo nombres) → src/content/resources.json
```

## Cómo enseña

| Mecánica | Dónde |
|---|---|
| **Plan diario** (repaso → lección → práctica → apertura del día), fijo para cada fecha | `services/scheduler/dailyPlan.ts` |
| **Repetición espaciada SM-2** de ejercicios y líneas de apertura | `services/scheduler/sm2.ts` |
| **Desbloqueo progresivo** (prerrequisitos al 80 %, o test de nivel) | `services/scheduler/progression.ts` |
| **Práctica adaptativa** según rating y temas débiles | `services/game/rating.ts` |
| **XP, niveles y rangos** (Novato → Maestro), racha 🔥 con protectores, misiones diarias, medallas | `services/game/*` |
| Vidas ❤️ y combos en lecciones, Rush táctico, "Adivina la jugada", profesor animado, confeti y sonidos | `features/*` |

## Arquitectura

```
src/
├─ app/            Router (carga diferida por pantalla) y App
├─ components/
│  ├─ ui/          Button, Card, Loader, Skeleton, Modal, Badge, ProgressBar, ProgressRing,
│  │               Tabs, EmptyState, StatPill, Hearts, RichText  (sin lógica de negocio)
│  ├─ chess/       ChessBoard, PuzzleBoard (+ usePuzzle), LineTrainer, BoardStepper, MoveList
│  └─ layout/      AppShell, TopBar, PageHeader
├─ features/       Una carpeta por funcionalidad (página + componentes + hooks propios)
│  ├─ daily-plan/  "Hoy"           ├─ lessons/    lector de lecciones
│  ├─ exercises/   práctica        ├─ review/     repaso SM-2
│  ├─ openings/    repertorio      ├─ classics/   partidas clásicas
│  ├─ gamification/ índice, mapa, logros, rush, recompensas, profesor
│  ├─ profile/      perfil: cuenta, puntaje, avatar y accesos
│  ├─ progress/  placement/  library/  settings/
├─ content/
│  ├─ schema.ts     Esquemas Zod (Module, Lesson, Step, Exercise, Opening, ClassicGame)
│  ├─ registry.ts   Auto-descubrimiento de módulos con import.meta.glob
│  ├─ resources.json Catálogo del Drive
│  └─ modules/<id>/ module.json, lessons/*.json, exercises.json, openings.json, games.json
├─ services/       Lógica pura y testeable (sin React)
│  ├─ game/        engine.ts (evento → XP/racha/misiones/logros), xp, rating, streak, quests, achievements
│  ├─ scheduler/   dailyPlan, sm2, progression
│  ├─ storage/     StorageAdapter + localStorageAdapter  ← cambiar aquí para usar un backend
│  └─ chess/       utilidades de chess.js
├─ store/          Zustand + persist: progress, review, game, settings
├─ hooks/  lib/  styles/ (tokens de diseño, tema claro/oscuro)
```

**Reglas del diseño**
- Las *features* emiten **eventos** (`LESSON_COMPLETED`, `PUZZLE_SOLVED`…) y el motor puro `applyEvent` decide recompensas. Añadir un logro o misión = añadir una entrada en `achievements.ts` / `quests.ts`.
- Los componentes de `components/` no conocen los stores; las features sí.
- Todo el contenido se valida con Zod al cargar y con `content.test.ts` (cada jugada se comprueba con chess.js).

## Cómo ampliar

**Nuevo módulo/tema:** crea `src/content/modules/<id>/module.json` (+ `lessons/01-x.json`, `exercises.json`…). Aparece solo en el mapa, el plan diario y la práctica. Ejecuta `npm test` para validar las posiciones.

**Nuevo tipo de paso de lección:** añádelo a `StepSchema` en `content/schema.ts`, crea su vista en `features/lessons/steps/` y regístrala en `stepRegistry.tsx`.

**Nuevo backend (Supabase, API…):** implementa `StorageAdapter` y cámbialo en `services/storage/localStorageAdapter.ts`.

**Ejercicio:** `{ id, fen, solution: [SAN…], themes, rating }`. La solución alterna jugada del alumno / respuesta automática y debe terminar con jugada del alumno. Si la última jugada es mate, se acepta cualquier mate.

## Material del Drive

`scripts/inventory.mjs` recorre la carpeta pública por su link (vista embebida, sin credenciales) y **solo lee nombres y estructura**. Las lecciones enlazan los videos/PDF relacionados por *tags* y se abren dentro de la app con la vista previa de Drive; para eso la carpeta debe seguir compartida por link.

En la copia actual algunas subcarpetas están vacías (Escocesa, Italiana, Siciliana Dragón, Colle, Londres). Cuando subas más material, vuelve a ejecutar `npm run inventory`.
