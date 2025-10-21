import { Link } from 'react-router-dom'
import { Container } from '@/components/layout/Container'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { usePlatformStats } from '@/hooks/useAnalytics'
import { useRecentAuditLogs } from '@/hooks/useAuditLog'
import { useAuthStore } from '@/stores/authStore'
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  HomeIcon,
  ShieldCheckIcon,
  PlusIcon,
  ChartBarIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  TrashIcon,
} from '@heroicons/react/24/solid'

export function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const { data: stats, isLoading: statsLoading } = usePlatformStats()
  const { data: recentLogs, isLoading: logsLoading } = useRecentAuditLogs(10)

  // Get user email or default
  const userEmail = user?.email || 'Superadmin'

  // Format action type for display
  const formatActionType = (actionType: string) => {
    return actionType
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // Get relative time
  const getRelativeTime = (date: string) => {
    const now = new Date()
    const then = new Date(date)
    const diffMs = now.getTime() - then.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return then.toLocaleDateString()
  }

  return (
    <Container>
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Welcome back, {userEmail.split('@')[0]}!
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Here's what's happening with your communities today
        </p>
      </div>

      {/* Platform Stats Cards */}
      {statsLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : stats ? (
        <>
          {/* Main Stats Grid */}
          <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Total Communities */}
            <Link
              to="/communities"
              className="group rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Communities</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.totalCommunities}</p>
                </div>
                <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-3">
                  <BuildingOfficeIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </Link>

            {/* Total Admin Users */}
            <Link
              to="/admin-users"
              className="group rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Admin Users</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.totalAdminUsers}</p>
                </div>
                <div className="rounded-full bg-purple-100 dark:bg-purple-900/30 p-3">
                  <UserGroupIcon className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </Link>

            {/* Total Residences */}
            <Link
              to="/residences"
              className="group rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Residences</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.totalResidences}</p>
                </div>
                <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3">
                  <HomeIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </Link>

            {/* Total Gates */}
            <Link
              to="/gates"
              className="group rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Security Gates</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.totalGates}</p>
                </div>
                <div className="rounded-full bg-orange-100 dark:bg-orange-900/30 p-3">
                  <ShieldCheckIcon className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </Link>
          </div>

          {/* Community Status Overview */}
          <div className="mb-8 grid gap-6 md:grid-cols-3">
            <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Communities</p>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-green-600 dark:text-green-400">
                    {stats.activeCommunities}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <ExclamationTriangleIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Suspended</p>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {stats.suspendedCommunities}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <TrashIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Deleted</p>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-gray-600 dark:text-gray-400">
                    {stats.deletedCommunities}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {/* Quick Actions & Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 p-6 shadow-sm lg:col-span-1">
          <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-gray-100">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              to="/communities/create"
              className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-600 p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-2">
                <PlusIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Create Community</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Set up a new community</p>
              </div>
            </Link>

            <Link
              to="/analytics"
              className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-600 p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <div className="rounded-full bg-purple-100 dark:bg-purple-900/30 p-2">
                <ChartBarIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">View Analytics</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Platform insights & reports</p>
              </div>
            </Link>

            <Link
              to="/communities"
              className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-600 p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-2">
                <BuildingOfficeIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Manage Communities</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">View & edit communities</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 p-6 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Recent Activity</h2>
            <ClockIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>

          {logsLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : recentLogs && recentLogs.length > 0 ? (
            <div className="space-y-3">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 rounded-lg border border-gray-100 dark:border-gray-700 p-3 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {formatActionType(log.action_type)}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {log.entity_type} • {log.entity_id.slice(0, 8)}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                      {getRelativeTime(log.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 p-8 text-center">
              <ClockIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">No recent activity</p>
            </div>
          )}
        </div>
      </div>
    </Container>
  )
}
