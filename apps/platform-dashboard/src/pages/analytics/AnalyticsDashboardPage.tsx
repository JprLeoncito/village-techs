import { Container } from '@/components/layout/Container'
import { PlatformStats } from '@/components/features/analytics/PlatformStats'
import { SubscriptionBreakdown } from '@/components/features/analytics/SubscriptionBreakdown'
import { UsageMetrics } from '@/components/features/analytics/UsageMetrics'
import { ReportGenerator } from '@/components/features/analytics/ReportGenerator'
import { ChartBarIcon } from '@heroicons/react/24/outline'

export function AnalyticsDashboardPage() {
  return (
    <Container>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary-100 p-3">
            <ChartBarIcon className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Platform Analytics</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              Monitor platform performance and business metrics
            </p>
          </div>
        </div>
      </div>

      {/* Platform Stats */}
      <div className="mb-8">
        <PlatformStats />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 mb-8">
        {/* Subscription Breakdown */}
        <SubscriptionBreakdown />

        {/* Report Generator */}
        <ReportGenerator />
      </div>

      {/* Usage Metrics */}
      <div className="mb-8">
        <UsageMetrics />
      </div>

      {/* Additional Info */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-white dark:bg-gray-800 p-2 shadow-sm">
            <ChartBarIcon className="h-5 w-5 text-primary-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Real-Time Analytics</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Analytics data is updated every 5 minutes to provide near real-time insights into
              platform performance. All metrics reflect the current state of active, suspended, and
              deleted communities.
            </p>
            <div className="mt-3 flex gap-4 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span>Auto-refresh enabled</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <span>5-minute cache</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Container>
  )
}
