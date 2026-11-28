import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Button, EmptyState, Loader } from '@/components/ui';

/** Carga diferida por feature: cada pantalla es su propio chunk. */
const page = (load: () => Promise<Record<string, unknown>>, name: string) =>
  lazy(async () => ({ default: (await load())[name] as React.ComponentType }));

const HomePage = page(() => import('@/features/daily-plan/HomePage'), 'HomePage');
const WeekPage = page(() => import('@/features/daily-plan/WeekPage'), 'WeekPage');
const IndexPage = page(() => import('@/features/gamification/IndexPage'), 'IndexPage');
const MapPage = page(() => import('@/features/gamification/MapPage'), 'MapPage');
const LessonPage = page(() => import('@/features/lessons/LessonPage'), 'LessonPage');
const PracticeHubPage = page(() => import('@/features/exercises/PracticeHubPage'), 'PracticeHubPage');
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
const ProfilePage = page(() => import('@/features/profile/ProfilePage'), 'ProfilePage');
const SettingsPage = page(() => import('@/features/settings/SettingsPage'), 'SettingsPage');
const PlanSetupPage = page(() => import('@/features/onboarding/PlanSetupPage'), 'PlanSetupPage');
const LoginPage = page(() => import('@/features/auth/LoginPage'), 'LoginPage');
const ClubPage = page(() => import('@/features/club/ClubPage'), 'ClubPage');
const CreateClubPage = page(() => import('@/features/club/CreateClubPage'), 'CreateClubPage');
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
      { path: 'semana', element: withSuspense(<WeekPage />) },
      { path: 'mapa', element: withSuspense(<IndexPage />) },
      { path: 'mapa/capitulos', element: withSuspense(<MapPage />) },
      { path: 'leccion/:lessonId', element: withSuspense(<LessonPage />) },
      { path: 'practica', element: withSuspense(<PracticeHubPage />) },
      { path: 'practica/ejercicios', element: withSuspense(<PracticePage />) },
      // Antes el progreso colgaba de Práctica: un enlace guardado sigue funcionando
      { path: 'practica/progreso', element: <Navigate to="/progreso" replace /> },
      { path: 'repaso', element: withSuspense(<ReviewPage />) },
      { path: 'aperturas', element: withSuspense(<OpeningsPage />) },
      { path: 'aperturas/:openingId', element: withSuspense(<OpeningDetailPage />) },
      { path: 'rush', element: withSuspense(<RushPage />) },
      { path: 'logros', element: withSuspense(<AchievementsPage />) },
      { path: 'partidas', element: withSuspense(<ClassicGamesPage />) },
      { path: 'progreso', element: withSuspense(<ProgressPage />) },
      { path: 'test-nivel', element: withSuspense(<PlacementPage />) },
      { path: 'biblioteca', element: withSuspense(<LibraryPage />) },
      { path: 'perfil', element: withSuspense(<ProfilePage />) },
      { path: 'ajustes', element: withSuspense(<SettingsPage />) },
      { path: 'empezar', element: withSuspense(<PlanSetupPage />) },
      { path: 'entrar', element: withSuspense(<LoginPage />) },
      { path: 'club', element: withSuspense(<ClubPage />) },
      { path: 'club/miembro/:memberId', element: withSuspense(<MemberProfilePage />) },
      { path: 'club/reto/:challengeId', element: withSuspense(<ChallengePage />) },
      { path: 'club/semana', element: withSuspense(<WeeklyChallengePage />) },
      { path: 'crear-club/:token', element: withSuspense(<CreateClubPage />) },
      { path: 'unirse/:code', element: withSuspense(<JoinPage />) },
      { path: '*', element: <EmptyState icon="compass" title="Página no encontrada" action={<Button to="/">Volver al inicio</Button>} /> },
    ],
  },
]);
