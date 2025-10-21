import { useQuery } from '@tanstack/react-query'
import { supabaseAdmin } from '@/lib/supabase'
import { queryKeys } from '@/lib/query'
import type { Database } from '@/types/database.types'

type Community = Database['public']['Tables']['communities']['Row']

interface PlatformStats {
  totalCommunities: number
  activeCommunities: number
  suspendedCommunities: number
  deletedCommunities: number
  totalAdminUsers: number
  totalResidences: number
  totalGates: number
}

interface SubscriptionBreakdown {
  planName: string
  count: number
  percentage: number
}

interface CommunityGrowth {
  date: string
  count: number
}

/**
 * Fetch platform statistics
 */
export function usePlatformStats() {
  return useQuery({
    queryKey: queryKeys.analytics.platform(),
    queryFn: async () => {
      // Get communities grouped by status
      const { data: communities, error: communitiesError } = await supabaseAdmin
        .from('communities')
        .select('status')

      if (communitiesError) throw communitiesError

      // Get total admin users
      const { count: adminUsersCount, error: adminUsersError } = await supabaseAdmin
        .from('admin_users')
        .select('*', { count: 'exact', head: true })

      if (adminUsersError) throw adminUsersError

      // Get total residences
      const { count: residencesCount, error: residencesError } = await supabaseAdmin
        .from('residences')
        .select('*', { count: 'exact', head: true })

      if (residencesError) throw residencesError

      // Get total gates
      const { count: gatesCount, error: gatesError } = await supabaseAdmin
        .from('gates')
        .select('*', { count: 'exact', head: true })

      if (gatesError) throw gatesError

      // Calculate stats
      const stats: PlatformStats = {
        totalCommunities: communities?.length || 0,
        activeCommunities: communities?.filter((c) => c.status === 'active').length || 0,
        suspendedCommunities: communities?.filter((c) => c.status === 'suspended').length || 0,
        deletedCommunities: communities?.filter((c) => c.status === 'deleted').length || 0,
        totalAdminUsers: adminUsersCount || 0,
        totalResidences: residencesCount || 0,
        totalGates: gatesCount || 0,
      }

      return stats
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Fetch subscription breakdown
 */
export function useSubscriptionBreakdown() {
  return useQuery({
    queryKey: queryKeys.analytics.subscriptions(),
    queryFn: async () => {
      const { data: communities, error } = await supabaseAdmin
        .from('communities')
        .select('subscription_plan_id, subscription_plans(name)')
        .neq('status', 'deleted')

      if (error) throw error

      // Group by subscription plan
      const planCounts = new Map<string, number>()

      communities?.forEach((community) => {
        const planName = (community.subscription_plans as any)?.name || 'Unknown'
        planCounts.set(planName, (planCounts.get(planName) || 0) + 1)
      })

      const total = communities?.length || 0
      const breakdown: SubscriptionBreakdown[] = Array.from(planCounts.entries()).map(
        ([planName, count]) => ({
          planName,
          count,
          percentage: total > 0 ? Math.round((count / total) * 100) : 0,
        })
      )

      return breakdown.sort((a, b) => b.count - a.count)
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Fetch community growth over time
 */
export function useCommunityGrowth(days = 30) {
  return useQuery({
    queryKey: [...queryKeys.analytics.platform(), 'growth', days],
    queryFn: async () => {
      const { data: communities, error } = await supabaseAdmin
        .from('communities')
        .select('created_at')
        .order('created_at', { ascending: true })

      if (error) throw error

      // Group by date
      const dateCounts = new Map<string, number>()
      const today = new Date()
      const startDate = new Date(today)
      startDate.setDate(today.getDate() - days)

      // Initialize all dates with 0
      for (let i = 0; i <= days; i++) {
        const date = new Date(startDate)
        date.setDate(startDate.getDate() + i)
        const dateKey = date.toISOString().split('T')[0]
        dateCounts.set(dateKey, 0)
      }

      // Count communities created on each date
      let cumulativeCount = 0
      communities?.forEach((community) => {
        const createdDate = new Date(community.created_at).toISOString().split('T')[0]
        if (dateCounts.has(createdDate)) {
          cumulativeCount++
        }
      })

      // Convert to cumulative counts
      const growth: CommunityGrowth[] = []
      let cumulative = 0

      Array.from(dateCounts.keys())
        .sort()
        .forEach((date) => {
          const count = communities?.filter(
            (c) => new Date(c.created_at).toISOString().split('T')[0] <= date
          ).length || 0

          growth.push({
            date,
            count,
          })
        })

      return growth
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Export analytics data as CSV
 */
export async function exportCommunitiesCSV() {
  const { data: communities, error } = await supabaseAdmin
    .from('communities')
    .select('*, subscription_plans(name)')
    .order('created_at', { ascending: false })

  if (error) throw error

  // Create CSV content
  const headers = [
    'Name',
    'Location',
    'Contact Email',
    'Contact Phone',
    'Subscription Plan',
    'Status',
    'Created At',
  ]

  const rows = communities?.map((c) => [
    c.name,
    c.location || '',
    c.contact_email || '',
    c.contact_phone || '',
    (c.subscription_plans as any)?.name || '',
    c.status,
    new Date(c.created_at).toISOString(),
  ])

  const csvContent = [
    headers.join(','),
    ...(rows?.map((row) => row.map((cell) => `"${cell}"`).join(',')) || []),
  ].join('\n')

  return csvContent
}
