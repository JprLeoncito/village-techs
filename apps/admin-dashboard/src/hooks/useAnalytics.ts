import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

export interface DashboardStats {
  households: {
    total: number
    active: number
    moved_out: number
  }
  stickers: {
    total: number
    active: number
    requested: number
    expiring_soon: number
  }
  fees: {
    total_amount: number
    collected: number
    outstanding: number
    overdue_count: number
  }
  permits: {
    total: number
    pending: number
    in_progress: number
    completed: number
  }
  announcements: {
    total: number
    published: number
    draft: number
  }
  security: {
    entries_today: number
    visitors_today: number
    open_incidents: number
    resolved_incidents_week: number
  }
}

export function useDashboardStats() {
  const user = useAuthStore((state) => state.user)
  const tenant_id = user?.tenant_id

  return useQuery({
    queryKey: ['dashboard_stats', tenant_id],
    queryFn: async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayISO = today.toISOString()

      const weekAgo = new Date(today)
      weekAgo.setDate(weekAgo.getDate() - 7)
      const weekAgoISO = weekAgo.toISOString()

      // Parallel fetch all stats
      const [
        householdsResult,
        stickersResult,
        feesResult,
        permitsResult,
        announcementsResult,
        entriesResult,
        incidentsResult,
      ] = await Promise.all([
        // Households
        supabase
          .from('households')
          .select('status')
          .eq('tenant_id', tenant_id!)
          .is('deleted_at', null),

        // Stickers
        supabase
          .from('vehicle_stickers')
          .select('status, expiry_date')
          .eq('tenant_id', tenant_id!),

        // Fees
        supabase
          .from('association_fees')
          .select('amount, payment_status')
          .eq('tenant_id', tenant_id!),

        // Permits
        supabase
          .from('construction_permits')
          .select('status')
          .eq('tenant_id', tenant_id!),

        // Announcements
        supabase
          .from('announcements')
          .select('status')
          .eq('tenant_id', tenant_id!),

        // Gate Entries
        supabase
          .from('gate_entries')
          .select('entry_type')
          .eq('tenant_id', tenant_id!)
          .gte('entry_timestamp', todayISO),

        // Incidents
        supabase
          .from('incident_reports')
          .select('resolution_status, resolved_at')
          .eq('tenant_id', tenant_id!),
      ])

      if (householdsResult.error) throw householdsResult.error
      if (stickersResult.error) throw stickersResult.error
      if (feesResult.error) throw feesResult.error
      if (permitsResult.error) throw permitsResult.error
      if (announcementsResult.error) throw announcementsResult.error
      if (entriesResult.error) throw entriesResult.error
      if (incidentsResult.error) throw incidentsResult.error

      const households = householdsResult.data || []
      const stickers = stickersResult.data || []
      const fees = feesResult.data || []
      const permits = permitsResult.data || []
      const announcements = announcementsResult.data || []
      const entries = entriesResult.data || []
      const incidents = incidentsResult.data || []

      // Calculate expiring stickers (within 30 days)
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

      const stats: DashboardStats = {
        households: {
          total: households.length,
          active: households.filter((h) => h.status === 'active').length,
          moved_out: households.filter((h) => h.status === 'moved_out').length,
        },
        stickers: {
          total: stickers.length,
          active: stickers.filter((s) => s.status === 'active').length,
          requested: stickers.filter((s) => s.status === 'requested').length,
          expiring_soon: stickers.filter(
            (s) =>
              s.status === 'active' &&
              s.expiry_date &&
              new Date(s.expiry_date) <= thirtyDaysFromNow &&
              new Date(s.expiry_date) > new Date()
          ).length,
        },
        fees: {
          total_amount: fees.reduce((sum, f) => sum + (f.amount || 0), 0),
          collected: fees
            .filter((f) => f.payment_status === 'paid')
            .reduce((sum, f) => sum + (f.amount || 0), 0),
          outstanding: fees
            .filter((f) => f.payment_status === 'unpaid')
            .reduce((sum, f) => sum + (f.amount || 0), 0),
          overdue_count: fees.filter((f) => f.payment_status === 'overdue').length,
        },
        permits: {
          total: permits.length,
          pending: permits.filter((p) => p.status === 'pending').length,
          in_progress: permits.filter((p) => p.status === 'in_progress').length,
          completed: permits.filter((p) => p.status === 'completed').length,
        },
        announcements: {
          total: announcements.length,
          published: announcements.filter((a) => a.status === 'published').length,
          draft: announcements.filter((a) => a.status === 'draft').length,
        },
        security: {
          entries_today: entries.length,
          visitors_today: entries.filter((e) => e.entry_type === 'visitor').length,
          open_incidents: incidents.filter((i) =>
            ['open', 'investigating'].includes(i.resolution_status)
          ).length,
          resolved_incidents_week: incidents.filter(
            (i) =>
              i.resolution_status === 'resolved' &&
              i.resolved_at &&
              new Date(i.resolved_at) >= weekAgo
          ).length,
        },
      }

      return stats
    },
    enabled: !!tenant_id,
    refetchInterval: 60000, // Refresh every minute
  })
}

export function useRecentActivity() {
  const user = useAuthStore((state) => state.user)
  const tenant_id = user?.tenant_id

  return useQuery({
    queryKey: ['recent_activity', tenant_id],
    queryFn: async () => {
      const threeDaysAgo = new Date()
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
      const threeDaysAgoISO = threeDaysAgo.toISOString()

      const activities: Array<{
        type: string
        title: string
        timestamp: string
        status?: string
      }> = []

      // Get recent households
      const { data: households } = await supabase
        .from('households')
        .select('created_at, residence:residences(unit_number)')
        .eq('tenant_id', tenant_id!)
        .gte('created_at', threeDaysAgoISO)
        .order('created_at', { ascending: false })
        .limit(5)

      households?.forEach((h: any) => {
        activities.push({
          type: 'household',
          title: `New household registered: ${h.residence?.unit_number || 'Unit'}`,
          timestamp: h.created_at,
        })
      })

      // Get recent sticker requests
      const { data: stickers } = await supabase
        .from('vehicle_stickers')
        .select('created_at, status')
        .eq('tenant_id', tenant_id!)
        .gte('created_at', threeDaysAgoISO)
        .order('created_at', { ascending: false })
        .limit(5)

      stickers?.forEach((s) => {
        activities.push({
          type: 'sticker',
          title: `Vehicle sticker ${s.status}`,
          timestamp: s.created_at,
          status: s.status,
        })
      })

      // Get recent permits
      const { data: permits } = await supabase
        .from('construction_permits')
        .select('created_at, project_description, status')
        .eq('tenant_id', tenant_id!)
        .gte('created_at', threeDaysAgoISO)
        .order('created_at', { ascending: false })
        .limit(5)

      permits?.forEach((p) => {
        activities.push({
          type: 'permit',
          title: `Construction permit ${p.status}`,
          timestamp: p.created_at,
          status: p.status,
        })
      })

      // Sort all activities by timestamp
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      return activities.slice(0, 10)
    },
    enabled: !!tenant_id,
  })
}
