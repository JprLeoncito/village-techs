import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RootLayout } from './components/layout/RootLayout'
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { RegistrationConfirmationPage } from './pages/auth/RegistrationConfirmationPage'
import { ChangePasswordPage } from './pages/auth/ChangePasswordPage'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { CommunitiesPage } from './pages/communities/CommunitiesPage'
import { CreateCommunityPage } from './pages/communities/CreateCommunityPage'
import { ResidencesPage } from './pages/residences/ResidencesPage'
import { GatesPage } from './pages/gates/GatesPage'
import { AdminUsersPage } from './pages/admin-users/AdminUsersPage'
import { PendingUsersPage } from './pages/pending-users/PendingUsersPage'
import { AnalyticsDashboardPage } from './pages/analytics/AnalyticsDashboardPage'
import { ProfilePage } from './pages/profile/ProfilePage'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/registration-confirmation',
    element: <RegistrationConfirmationPage />,
  },
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'change-password',
        element: <ChangePasswordPage />,
      },
      {
        path: 'profile',
        element: <ProfilePage />,
      },
      {
        path: 'communities',
        children: [
          {
            index: true,
            element: <CommunitiesPage />,
          },
          {
            path: 'create',
            element: <CreateCommunityPage />,
          },
        ],
      },
      {
        path: 'residences',
        element: <ResidencesPage />,
      },
      {
        path: 'gates',
        element: <GatesPage />,
      },
      {
        path: 'admin-users',
        element: <AdminUsersPage />,
      },
      {
        path: 'pending-users',
        element: <PendingUsersPage />,
      },
      {
        path: 'analytics',
        element: <AnalyticsDashboardPage />,
      },
    ],
  },
])
