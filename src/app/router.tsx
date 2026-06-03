import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthGuard } from './auth-guard';
import { AdminGuard } from './admin-guard';
import { RootLayout } from '@/components/layout/RootLayout';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { PrivacyPage } from '@/pages/PrivacyPage';
import { TermsPage } from '@/pages/TermsPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { LogFoodPage } from '@/pages/LogFoodPage';
import { LogWorkoutPage } from '@/pages/LogWorkoutPage';
import { LogAlcoholPage } from '@/pages/LogAlcoholPage';
import { LogWeightPage } from '@/pages/LogWeightPage';
import { LogMentalHealthPage } from '@/pages/LogMentalHealthPage';
import { FriendsPage } from '@/pages/FriendsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { PlanWeeklyPage } from '@/pages/PlanWeeklyPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { ExploreRecipesPage } from '@/pages/ExploreRecipesPage';
import { ExploreWorkoutsPage } from '@/pages/ExploreWorkoutsPage';
import { AdminPage } from '@/pages/AdminPage';

export const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  { path: '/auth', element: <LoginPage /> },
  { path: '/auth/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/auth/reset-password', element: <ResetPasswordPage /> },
  { path: '/privacy', element: <PrivacyPage /> },
  { path: '/terms', element: <TermsPage /> },
  {
    path: '/app',
    element: (
      <AuthGuard>
        <RootLayout />
      </AuthGuard>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'plan', element: <PlanWeeklyPage /> },
      { path: 'plan/:day', element: <PlanWeeklyPage /> },
      { path: 'log/food', element: <LogFoodPage /> },
      { path: 'log/workout', element: <LogWorkoutPage /> },
      { path: 'log/alcohol', element: <LogAlcoholPage /> },
      { path: 'log/weight', element: <LogWeightPage /> },
      { path: 'log/mental', element: <LogMentalHealthPage /> },
      { path: 'friends', element: <FriendsPage /> },
      { path: 'explore/recipes', element: <ExploreRecipesPage /> },
      { path: 'explore/workouts', element: <ExploreWorkoutsPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      { path: 'profile', element: <ProfilePage /> },
      {
        path: 'admin',
        element: (
          <AdminGuard>
            <AdminPage />
          </AdminGuard>
        ),
      },
      { path: '*', element: <Navigate to="/app" replace /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
