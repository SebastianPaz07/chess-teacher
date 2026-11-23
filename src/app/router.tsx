import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Button, EmptyState, Loader } from '@/components/ui';

/** Carga diferida por feature: cada pantalla es su propio chunk. */
const page = (load: () => Promise<Record<string, unknown>>, name: string) =>
  lazy(async () => ({ default: (await load())[name] as React.ComponentType }));

const HomePage = page(() => import('@/features/daily-plan/HomePage'), 'HomePage');
const MapPage = page(() => import('@/features/gamification/MapPage'), 'MapPage');
const LessonPage = page(() => import('@/features/lessons/LessonPage'), 'LessonPage');
const PracticePage = page(() => import('@/features/exercises/PracticePage'), 'PracticePage');
const ReviewPage = page(() => import('@/features/review/ReviewPage'), 'ReviewPage');
const OpeningsPage = page(() => import('@/features/openings/OpeningsPage'), 'OpeningsPage');
const OpeningDetailPage = page(() => import('@/features/openings/OpeningDetailPage'), 'OpeningDetailPage');
const RushPage = page(() => import('@/features/gamification/RushPage'), 'RushPage');
const AchievementsPage = page(() => import('@/features/gamification/AchievementsPage'), 'AchievementsPage');
const ClassicGamesPage = page(() => import('@/features/classics/ClassicGamesPage'), 'ClassicGamesPage');
const ProgressPage = page(() => import('@/features/progress/ProgressPage'), 'ProgressPage');
const PlacementPage = page(() => import('@/features/placement/PlacementPage'), 'PlacementPage');
const LibraryPage = page(() => import('@/features/library/LibraryPage'), 'LibraryPage');
const SettingsPage = page(() => import('@/features/settings/SettingsPage'), 'SettingsPage');
const PlanSetupPage = page(() => import('@/features/onboarding/PlanSetupPage'), 'PlanSetupPage');
const LoginPage = page(() => import('@/features/auth/LoginPage'), 'LoginPage');
const ClubPage = page(() => import('@/features/club/ClubPage'), 'ClubPage');
const JoinPage = page(() => import('@/features/club/JoinPage'), 'JoinPage');
const MemberProfilePage = page(() => import('@/features/club/MemberProfilePage'), 'MemberProfilePage');
const ChallengePage = page(() => import('@/features/club/ChallengePage'), 'ChallengePage');
const WeeklyChallengePage = page(() => import('@/features/club/WeeklyChallengePage'), 'WeeklyChallengePage');

const withSuspense = (node: ReactNode) => <Suspense fallback={<Loader fullscreen />}>{node}</Suspense>;

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <EmptyState icon="x-circle" title="Algo salió mal" description="Recarga la página o vuelve al inicio." action={<Button to="/">Inicio</Button>} />,
    children: [
      { index: true, element: withSuspense(<HomePage />) },
      { path: 'mapa', element: withSuspense(<MapPage />) },
      { path: 'leccion/:lessonId', element: withSuspense(<LessonPage />) },
      { path: 'practica', element: withSuspense(<PracticePage />) },
      { path: 'repaso', element: withSuspense(<ReviewPage />) },
      { path: 'aperturas', element: withSuspense(<OpeningsPage />) },
      { path: 'aperturas/:openingId', element: withSuspense(<OpeningDetailPage />) },
      { path: 'rush', element: withSuspense(<RushPage />) },
      { path: 'logros', element: withSuspense(<AchievementsPage />) },
      { path: 'partidas', element: withSuspense(<ClassicGamesPage />) },
      { path: 'progreso', element: withSuspense(<ProgressPage />) },
      { path: 'test-nivel', element: withSuspense(<PlacementPage />) },
      { path: 'biblioteca', element: withSuspense(<LibraryPage />) },
      { path: 'ajustes', element: withSuspense(<SettingsPage />) },
      { path: 'empezar', element: withSuspense(<PlanSetupPage />) },
      { path: 'entrar', element: withSuspense(<LoginPage />) },
      { path: 'club', element: withSuspense(<ClubPage />) },
      { path: 'club/miembro/:memberId', element: withSuspense(<MemberProfilePage />) },
      { path: 'club/reto/:challengeId', element: withSuspense(<ChallengePage />) },
      { path: 'club/semana', element: withSuspense(<WeeklyChallengePage />) },
      { path: 'unirse/:code', element: withSuspense(<JoinPage />) },
      { path: '*', element: <EmptyState icon="compass" title="Página no encontrada" action={<Button to="/">Volver al inicio</Button>} /> },
    ],
  },
]);
