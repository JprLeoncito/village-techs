import { BuildingOfficeIcon, UserGroupIcon, HomeIcon, KeyIcon } from '@heroicons/react/24/outline'
import { usePlatformStats } from '@/hooks/useAnalytics'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export function PlatformStats() {
  const { data: stats, isLoading } = usePlatformStats()

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    )
  }

  if (!stats) return null

  const statCards = [
    {
      label: 'Total Communities',
      value: stats.totalCommunities,
      icon: BuildingOfficeIcon,
      color: 'blue',
      breakdown: [
        { label: 'Active', value: stats.activeCommunities, color: 'text-green-600' },
        { label: 'Suspended', value: stats.suspendedCommunities, color: 'text-orange-600' },
        { label: 'Deleted', value: stats.deletedCommunities, color: 'text-gray-600' },
      ],
    },
    {
      label: 'Total Admin Users',
      value: stats.totalAdminUsers,
      icon: UserGroupIcon,
      color: 'purple',
    },
    {
      label: 'Total Residences',
      value: stats.totalResidences,
      icon: HomeIcon,
      color: 'green',
    },
    {
      label: 'Total Gates',
      value: stats.totalGates,
      icon: KeyIcon,
      color: 'orange',
    },
  ]

  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => {
        const Icon = stat.icon
        const colorClass = colorClasses[stat.color as keyof typeof colorClasses]

        return (
          <div
            key={stat.label}
            className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
          >
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className={`rounded-lg p-3 ${colorClass}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-3xl font-bold text-gray-900">{stat.value.toLocaleString()}</div>
                <div className="mt-1 text-sm font-medium text-gray-600">{stat.label}</div>
              </div>
              {stat.breakdown && (
                <div className="mt-4 flex gap-4 border-t border-gray-100 pt-4">
                  {stat.breakdown.map((item) => (
                    <div key={item.label} className="flex-1">
                      <div className={`text-lg font-semibold ${item.color}`}>
                        {item.value}
                      </div>
                      <div className="text-xs text-gray-500">{item.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
