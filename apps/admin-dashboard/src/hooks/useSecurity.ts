import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type {
  GateEntry,
  Incident,
  SecurityOfficer,
  GateStats,
  CreateGateEntryInput,
  UpdateGateEntryInput,
  CreateIncidentInput,
  UpdateIncidentInput,
} from '@/types/security.types'
import toast from 'react-hot-toast'
import { useEffect } from 'react'

export function useGateEntries(date?: string) {
  const user = useAuthStore((state) => state.user)
  const tenant_id = user?.tenant_id
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['gate_entries', tenant_id, date],
    queryFn: async () => {
      let query = supabase
        .from('gate_entries')
        .select(`
          *,
          household:households!household_id(
            id,
            residence:residences(unit_number),
            household_head:household_members!household_head_id(first_name, last_name)
          )
        `)
        .eq('tenant_id', tenant_id!)
        .order('entry_timestamp', { ascending: false })

      if (date) {
        const startOfDay = new Date(date)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(date)
        endOfDay.setHours(23, 59, 59, 999)
        query = query
          .gte('entry_timestamp', startOfDay.toISOString())
          .lte('entry_timestamp', endOfDay.toISOString())
      }

      const { data, error } = await query

      if (error) throw error
      return data as GateEntry[]
    },
    enabled: !!tenant_id,
  })

  // Subscribe to realtime updates
  useEffect(() => {
    if (!tenant_id) return

    const channel = supabase
      .channel('gate_entries_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gate_entries',
          filter: `tenant_id=eq.${tenant_id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['gate_entries', tenant_id] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tenant_id, queryClient])

  return query
}

export function useIncidents(status?: string) {
  const user = useAuthStore((state) => state.user)
  const tenant_id = user?.tenant_id

  return useQuery({
    queryKey: ['incidents', tenant_id, status],
    queryFn: async () => {
      let query = supabase
        .from('incident_reports')
        .select(`
          *,
          household:households!household_id(
            id,
            residence:residences(unit_number),
            household_head:household_members!household_head_id(first_name, last_name)
          )
        `)
        .eq('tenant_id', tenant_id!)
        .order('incident_timestamp', { ascending: false })

      if (status) {
        query = query.eq('resolution_status', status)
      }

      const { data, error } = await query

      if (error) throw error
      return data as Incident[]
    },
    enabled: !!tenant_id,
  })
}

export function useSecurityOfficers(active_only = false) {
  const user = useAuthStore((state) => state.user)
  const tenant_id = user?.tenant_id

  return useQuery({
    queryKey: ['security_officers', tenant_id, active_only],
    queryFn: async () => {
      // TODO: security_officers table doesn't exist yet
      // Return empty array for now
      return [] as SecurityOfficer[]
    },
    enabled: !!tenant_id,
  })
}

export function useGateStats() {
  const user = useAuthStore((state) => state.user)
  const tenant_id = user?.tenant_id

  return useQuery({
    queryKey: ['gate_stats', tenant_id],
    queryFn: async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayISO = today.toISOString()

      const [entriesResult, incidentsResult] = await Promise.all([
        supabase
          .from('gate_entries')
          .select('entry_type')
          .eq('tenant_id', tenant_id!)
          .gte('entry_timestamp', todayISO),
        supabase
          .from('incident_reports')
          .select('id')
          .eq('tenant_id', tenant_id!)
          .in('resolution_status', ['open', 'investigating']),
      ])

      if (entriesResult.error) throw entriesResult.error
      if (incidentsResult.error) throw incidentsResult.error

      const entries = entriesResult.data || []
      const stats: GateStats = {
        total_entries_today: entries.length,
        total_visitors_today: entries.filter((e) => e.entry_type === 'visitor').length,
        total_residents_today: entries.filter((e) => e.entry_type === 'resident').length,
        active_officers: 0, // TODO: security_officers table doesn't exist yet
        open_incidents: incidentsResult.data?.length || 0,
      }

      return stats
    },
    enabled: !!tenant_id,
    refetchInterval: 30000, // Refresh every 30 seconds
  })
}

export function useGateEntryActions() {
  const user = useAuthStore((state) => state.user)
  const tenant_id = user?.tenant_id
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: async (input: CreateGateEntryInput) => {
      const { data, error } = await supabase
        .from('gate_entries')
        .insert({
          tenant_id: tenant_id!,
          security_officer_id: user!.id,
          entry_timestamp: new Date().toISOString(),
          ...input,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gate_entries', tenant_id] })
      queryClient.invalidateQueries({ queryKey: ['gate_stats', tenant_id] })
      toast.success('Gate entry recorded successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to record entry')
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ entry_id, ...updates }: UpdateGateEntryInput) => {
      const { data, error } = await supabase
        .from('gate_entries')
        .update(updates)
        .eq('id', entry_id)
        .eq('tenant_id', tenant_id!)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gate_entries', tenant_id] })
      toast.success('Gate entry updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update entry')
    },
  })

  return {
    createGateEntry: createMutation.mutate,
    updateGateEntry: updateMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  }
}

export function useIncidentActions() {
  const user = useAuthStore((state) => state.user)
  const tenant_id = user?.tenant_id
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: async (input: CreateIncidentInput) => {
      const { incident_time, ...rest } = input
      const { data, error } = await supabase
        .from('incident_reports')
        .insert({
          tenant_id: tenant_id!,
          reported_by: user!.id,
          resolution_status: 'open',
          incident_timestamp: incident_time,
          ...rest,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', tenant_id] })
      queryClient.invalidateQueries({ queryKey: ['gate_stats', tenant_id] })
      toast.success('Incident reported successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to report incident')
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ incident_id, ...updates }: UpdateIncidentInput) => {
      const { data, error } = await supabase
        .from('incident_reports')
        .update(updates)
        .eq('id', incident_id)
        .eq('tenant_id', tenant_id!)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', tenant_id] })
      queryClient.invalidateQueries({ queryKey: ['gate_stats', tenant_id] })
      toast.success('Incident updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update incident')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (incident_id: string) => {
      const { error } = await supabase
        .from('incident_reports')
        .delete()
        .eq('id', incident_id)
        .eq('tenant_id', tenant_id!)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', tenant_id] })
      toast.success('Incident deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete incident')
    },
  })

  return {
    createIncident: createMutation.mutate,
    updateIncident: updateMutation.mutate,
    deleteIncident: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
