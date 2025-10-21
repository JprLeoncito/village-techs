import { Link } from 'react-router-dom'
import { Container } from '@/components/layout/Container'
import { useAuthStore } from '@/stores/authStore'
import { useDashboardStats, useRecentActivity } from '@/hooks/useAnalytics'
import {
  Home,
  Car,
  FileText,
  DollarSign,
  Megaphone,
  AlertTriangle,
  TrendingUp,
  Clock,
  Activity,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export function DashboardPage() {
  const { user } = useAuthStore()
  const { data: stats, isLoading } = useDashboardStats()
  const { data: recentActivity } = useRecentActivity()

  const getActivityIcon = (type: string) => {
    const icons = {
      household: Home,
      sticker: Car,
      permit: FileText,
      fee: DollarSign,
      announcement: Megaphone,
      incident: AlertTriangle,
    }
    return icons[type as keyof typeof icons] || Activity
  }

  return (
    <Container>
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Welcome back, {user?.email?.split('@')[0] || 'Admin'}!
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage your community efficiently with the HOA Admin Dashboard
        </p>
      </div>

      {/* Main Stats Grid */}
      <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Households */}
        <Link
          to="/households"
          className="group rounded-lg border border-gray-200 bg-white dark:border-subtle-transparent dark:bg-gray-800 p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Households</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                {isLoading ? '-' : stats?.households.total || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                {stats?.households.active || 0} active households
              </p>
            </div>
            <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-3">
              <Home className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Link>

        {/* Active Stickers */}
        <Link
          to="/stickers"
          className="group rounded-lg border border-gray-200 bg-white dark:border-subtle-transparent dark:bg-gray-800 p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Stickers</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                {isLoading ? '-' : stats?.stickers.active || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                {stats?.stickers.requested || 0} pending approval
              </p>
            </div>
            <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3">
              <Car className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Link>

        {/* Outstanding Fees */}
        <Link
          to="/fees"
          className="group rounded-lg border border-gray-200 bg-white dark:border-subtle-transparent dark:bg-gray-800 p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Outstanding Fees</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                {isLoading ? '-' : `₱${(stats?.fees.outstanding || 0).toLocaleString()}`}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                {stats?.fees.overdue_count || 0} overdue payments
              </p>
            </div>
            <div className="rounded-full bg-orange-100 dark:bg-orange-900/30 p-3">
              <DollarSign className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </Link>

        {/* Open Incidents */}
        <Link
          to="/incidents"
          className="group rounded-lg border border-gray-200 bg-white dark:border-subtle-transparent dark:bg-gray-800 p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Open Incidents</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                {isLoading ? '-' : stats?.security.open_incidents || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                {stats?.security.entries_today || 0} gate entries today
              </p>
            </div>
            <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-3">
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </Link>
      </div>

      {/* Community Status Overview */}
      <div className="mb-8 grid gap-6 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white dark:border-subtle-transparent dark:bg-gray-800 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Construction Permits</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
                {isLoading ? '-' : stats?.permits.total || 0}
              </p>
              <div className="mt-2 flex gap-2">
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                  {stats?.permits.pending || 0} pending
                </span>
                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  {stats?.permits.in_progress || 0} active
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white dark:border-subtle-transparent dark:bg-gray-800 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Announcements</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
                {isLoading ? '-' : stats?.announcements.published || 0}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">published</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white dark:border-subtle-transparent dark:bg-gray-800 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Fee Collection</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
                {isLoading
                  ? '-'
                  : stats?.fees.total_amount
                  ? `${Math.round((stats.fees.collected / stats.fees.total_amount) * 100)}%`
                  : '0%'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                ₱{(stats?.fees.collected || 0).toLocaleString()} collected
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <div className="rounded-lg border border-gray-200 bg-white dark:border-subtle-transparent dark:bg-gray-800 p-6 shadow-sm lg:col-span-1">
          <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-gray-100">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              to="/households"
              className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-subtle-transparent p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-2">
                <Home className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Register Household</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Add new household member</p>
              </div>
            </Link>

            <Link
              to="/stickers"
              className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-subtle-transparent p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-2">
                <Car className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Vehicle Stickers</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Approve sticker requests</p>
              </div>
            </Link>

            <Link
              to="/fees"
              className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-subtle-transparent p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <div className="rounded-full bg-orange-100 dark:bg-orange-900/30 p-2">
                <DollarSign className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Record Fees</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Track fee payments</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-lg border border-gray-200 bg-white dark:border-subtle-transparent dark:bg-gray-800 p-6 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Recent Activity</h2>
            <Clock className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>

          {recentActivity && recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((activity, index) => {
                const Icon = getActivityIcon(activity.type)
                return (
                  <div
                    key={index}
                    className="flex items-start gap-3 rounded-lg border border-gray-100 dark:border-subtle-transparent p-3 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {activity.title}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 p-8 text-center">
              <Activity className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">No recent activity</p>
            </div>
          )}
        </div>
      </div>
    </Container>
  )
}
