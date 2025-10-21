import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query'
import type { GateFormData } from '@/lib/validations/gate'
import type { Database } from '@/types/database.types'

type Gate = Database['public']['Tables']['gates']['Row']
type GateInsert = Database['public']['Tables']['gates']['Insert']
type GateUpdate = Database['public']['Tables']['gates']['Update']

/**
 * Fetch all gates for a specific community
 */
export function useGates(communityId: string) {
  return useQuery({
    queryKey: queryKeys.gates.list(communityId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gates')
        .select('*')
        .eq('tenant_id', communityId)
        .order('name')

      if (error) throw error
      return data as Gate[]
    },
    enabled: !!communityId,
  })
}

/**
 * Fetch a single gate by ID
 */
export function useGate(gateId: string) {
  return useQuery({
    queryKey: queryKeys.gates.detail(gateId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gates')
        .select('*')
        .eq('id', gateId)
        .single()

      if (error) throw error
      return data as Gate
    },
    enabled: !!gateId,
  })
}

/**
 * Create a new gate
 */
export function useCreateGate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: GateFormData) => {
      const gateData: GateInsert = {
        tenant_id: input.tenant_id,
        name: input.name,
        type: input.type,
        latitude: input.latitude,
        longitude: input.longitude,
        description: input.description || null,
        is_active: input.is_active,
        operating_hours: input.operating_hours || null,
      }

      const { data, error } = await supabase
        .from('gates')
        .insert(gateData)
        .select()
        .single()

      if (error) throw error
      return data as Gate
    },
    onSuccess: (data) => {
      // Invalidate gates list for this community
      queryClient.invalidateQueries({
        queryKey: queryKeys.gates.list(data.tenant_id),
      })
    },
  })
}

/**
 * Update an existing gate
 */
export function useUpdateGate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ gateId, data }: { gateId: string; data: Partial<GateFormData> }) => {
      const updateData: GateUpdate = {}

      if (data.name !== undefined) updateData.name = data.name
      if (data.type !== undefined) updateData.type = data.type
      if (data.latitude !== undefined) updateData.latitude = data.latitude
      if (data.longitude !== undefined) updateData.longitude = data.longitude
      if (data.description !== undefined) updateData.description = data.description || null
      if (data.is_active !== undefined) updateData.is_active = data.is_active
      if (data.operating_hours !== undefined) updateData.operating_hours = data.operating_hours || null

      const { data: result, error } = await supabase
        .from('gates')
        .update(updateData)
        .eq('id', gateId)
        .select()
        .single()

      if (error) throw error
      return result as Gate
    },
    onSuccess: (data) => {
      // Invalidate gates list and detail
      queryClient.invalidateQueries({
        queryKey: queryKeys.gates.list(data.tenant_id),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.gates.detail(data.id),
      })
    },
  })
}

/**
 * Delete a gate (soft delete by setting is_active to false)
 */
export function useDeleteGate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (gateId: string) => {
      // First get the gate to know which community to invalidate
      const { data: gate, error: fetchError } = await supabase
        .from('gates')
        .select('tenant_id')
        .eq('id', gateId)
        .single()

      if (fetchError) throw fetchError

      const { error } = await supabase.from('gates').delete().eq('id', gateId)

      if (error) throw error
      return gate.tenant_id
    },
    onSuccess: (tenantId) => {
      // Invalidate gates list
      queryClient.invalidateQueries({
        queryKey: queryKeys.gates.list(tenantId),
      })
    },
  })
}

/**
 * Toggle gate active status
 */
export function useToggleGateStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ gateId, isActive }: { gateId: string; isActive: boolean }) => {
      const { data, error } = await supabase
        .from('gates')
        .update({ is_active: isActive })
        .eq('id', gateId)
        .select()
        .single()

      if (error) throw error
      return data as Gate
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.gates.list(data.tenant_id),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.gates.detail(data.id),
      })
    },
  })
}
