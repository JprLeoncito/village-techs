import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query'
import type { ResidenceFormData } from '@/lib/validations/residence'
import type { Database } from '@/types/database.types'

type Residence = Database['public']['Tables']['residences']['Row']

export function useResidences(communityId?: string) {
  return useQuery({
    queryKey: communityId ? queryKeys.residences.list(communityId) : queryKeys.residences.all,
    queryFn: async () => {
      let query = supabase.from('residences').select('*').order('unit_number', { ascending: true })

      if (communityId) {
        query = query.eq('tenant_id', communityId)
      }

      const { data, error } = await query

      if (error) throw error
      return data as Residence[]
    },
    enabled: !!communityId,
  })
}

export function useCreateResidence() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: ResidenceFormData) => {
      const { data, error } = await supabase
        .from('residences')
        .insert({
          tenant_id: input.tenant_id,
          unit_number: input.unit_number,
          type: input.type,
          max_occupancy: input.max_occupancy,
          lot_area: input.lot_area || null,
          floor_area: input.floor_area,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.residences.list(data.tenant_id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.residences.all })
    },
  })
}

interface BulkCreateResult {
  success: number
  failed: number
  errors: Array<{ row: number; unit_number: string; error: string }>
}

export function useUpdateResidence() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      residenceId,
      data,
    }: {
      residenceId: string
      data: Partial<ResidenceFormData>
    }) => {
      const { data: updated, error } = await supabase
        .from('residences')
        .update({
          unit_number: data.unit_number,
          type: data.type,
          max_occupancy: data.max_occupancy,
          lot_area: data.lot_area || null,
          floor_area: data.floor_area,
        })
        .eq('id', residenceId)
        .select()
        .single()

      if (error) throw error
      return updated
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.residences.list(data.tenant_id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.residences.all })
    },
  })
}

export function useDeleteResidence() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ residenceId, tenantId }: { residenceId: string; tenantId: string }) => {
      const { error } = await supabase.from('residences').delete().eq('id', residenceId)

      if (error) throw error
      return { tenantId }
    },
    onSuccess: ({ tenantId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.residences.list(tenantId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.residences.all })
    },
  })
}

export function useBulkCreateResidences() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      communityId,
      residences,
    }: {
      communityId: string
      residences: Omit<ResidenceFormData, 'tenant_id'>[]
    }): Promise<BulkCreateResult> => {
      const result: BulkCreateResult = {
        success: 0,
        failed: 0,
        errors: [],
      }

      // Check for duplicate unit numbers first
      const unitNumbers = residences.map((r) => r.unit_number)
      const duplicates = unitNumbers.filter((num, idx) => unitNumbers.indexOf(num) !== idx)

      if (duplicates.length > 0) {
        throw new Error(`Duplicate unit numbers in CSV: ${duplicates.join(', ')}`)
      }

      // Process each residence
      for (let i = 0; i < residences.length; i++) {
        const residence = residences[i]

        try {
          // Check if unit number already exists
          const { data: existing } = await supabase
            .from('residences')
            .select('id')
            .eq('tenant_id', communityId)
            .eq('unit_number', residence.unit_number)
            .single()

          if (existing) {
            throw new Error(`Unit number ${residence.unit_number} already exists`)
          }

          // Insert residence
          const { error } = await supabase.from('residences').insert({
            tenant_id: communityId,
            unit_number: residence.unit_number,
            type: residence.type,
            max_occupancy: residence.max_occupancy,
            lot_area: residence.lot_area || null,
            floor_area: residence.floor_area,
          })

          if (error) throw error

          result.success++
        } catch (error: any) {
          result.failed++
          result.errors.push({
            row: i + 2, // +2 because row 1 is header and we're 0-indexed
            unit_number: residence.unit_number,
            error: error.message || 'Unknown error',
          })
        }
      }

      return result
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.residences.list(variables.communityId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.residences.all })
    },
  })
}
