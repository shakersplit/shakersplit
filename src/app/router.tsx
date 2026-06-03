import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthGuard } from './auth-guard';
import { RootLayout } from '@/components/layout/RootLayout';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { LogFoodPage } from '@/pages/LogFoodPage';
import { LogWorkoutPage } from '@/pages/LogWorkoutPage';
import { LogAlcoholPage } from '@/pages/LogAlcoholPage';
import { ProfilePage } from '@/pages/ProfilePage';

export const router = createBrowserRouter([
  {
    path: '/auth',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <AuthGuard>
        <RootLayout />
      </AuthGuard>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'log/food', element: <LogFoodPage /> },
      { path: 'log/workout', element: <LogWorkoutPage /> },
      { path: 'log/alcohol', element: <LogAlcoholPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
