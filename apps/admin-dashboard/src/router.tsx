import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RootLayout } from './components/layout/RootLayout'
import { LoginPage } from './pages/auth/LoginPage'
import { ChangePasswordPage } from './pages/auth/ChangePasswordPage'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { HouseholdsPage } from './pages/households/HouseholdsPage'
import { HouseholdDetailPage } from './pages/households/HouseholdDetailPage'
import { StickersPage } from './pages/stickers/StickersPage'
import { PermitsPage } from './pages/permits/PermitsPage'
import { FeesPage } from './pages/fees/FeesPage'
import { AnnouncementsPage } from './pages/announcements/AnnouncementsPage'
import { GateEntriesPage } from './pages/gate-entries/GateEntriesPage'
import { IncidentsPage } from './pages/incidents/IncidentsPage'
import { ProfilePage } from './pages/profile/ProfilePage'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
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
        path: 'households',
        element: <HouseholdsPage />,
      },
      {
        path: 'households/:id',
        element: <HouseholdDetailPage />,
      },
      {
        path: 'stickers',
        element: <StickersPage />,
      },
      {
        path: 'permits',
        element: <PermitsPage />,
      },
      {
        path: 'fees',
        element: <FeesPage />,
      },
      {
        path: 'announcements',
        element: <AnnouncementsPage />,
      },
      {
        path: 'gate-entries',
        element: <GateEntriesPage />,
      },
      {
        path: 'incidents',
        element: <IncidentsPage />,
      },
      {
        path: 'profile',
        element: <ProfilePage />,
      },
      {
        path: 'change-password',
        element: <ChangePasswordPage />,
      },
    ],
  },
])
