import { useMutation, useQuery } from '@tanstack/react-query'
import { supabaseAdmin, requireSuperadmin } from '@/lib/supabase'
import { queryKeys } from '@/lib/query'
import type { Database } from '@/types/database.types'

type AuditLog = Database['public']['Tables']['audit_logs']['Row']

interface AuditLogEntry {
  action_type: string
  entity_type: string
  entity_id: string
  changes: Record<string, unknown>
}

export function useAuditLog() {
  return useMutation({
    mutationFn: async (entry: AuditLogEntry) => {
      // Validate authentication and get superadmin user
      const user = await requireSuperadmin()

      const { error } = await supabaseAdmin.from('audit_logs').insert({
        superadmin_id: user.id,
        action_type: entry.action_type,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id,
        changes: entry.changes,
      })

      if (error) {
        if (error.message?.includes('JWT') || error.message?.includes('expired')) {
          throw new Error('Your session has expired. Please log in again.')
        }
        throw error
      }
    },
  })
}

/**
 * Fetch recent audit logs
 */
export function useRecentAuditLogs(limit = 10) {
  return useQuery({
    queryKey: [...queryKeys.audit, 'recent', limit],
    queryFn: async () => {
      // Validate authentication before fetching
      await requireSuperadmin()

      const { data, error } = await supabaseAdmin
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data as AuditLog[]
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}
