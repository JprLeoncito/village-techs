import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useCommunityGrowth } from '@/hooks/useAnalytics'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useState } from 'react'

export function UsageMetrics() {
  const [timeRange, setTimeRange] = useState<30 | 60 | 90>(30)
  const { data: growth, isLoading } = useCommunityGrowth(timeRange)

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    )
  }

  if (!growth || growth.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
        <p className="text-gray-600">No growth data available</p>
      </div>
    )
  }

  const chartData = growth.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    communities: item.count,
  }))

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Community Growth</h3>

        <div className="flex gap-2">
          <button
            onClick={() => setTimeRange(30)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              timeRange === 30
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            30 Days
          </button>
          <button
            onClick={() => setTimeRange(60)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              timeRange === 60
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            60 Days
          </button>
          <button
            onClick={() => setTimeRange(90)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              timeRange === 90
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            90 Days
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="date"
            stroke="#6B7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#6B7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
          />
          <Line
            type="monotone"
            dataKey="communities"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={{ fill: '#3B82F6', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600">
        <div className="h-3 w-3 rounded-full bg-blue-500" />
        <span>Total Communities Over Time</span>
      </div>
    </div>
  )
}
