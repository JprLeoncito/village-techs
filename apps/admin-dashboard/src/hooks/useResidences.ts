import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { Residence, CreateResidenceInput } from '@/types/households.types'
import toast from 'react-hot-toast'

export function useResidences() {
  const user = useAuthStore((state) => state.user)
  const tenant_id = user?.tenant_id
  const queryClient = useQueryClient()

  const residencesQuery = useQuery({
    queryKey: ['residences', tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('residences')
        .select('*')
        .eq('tenant_id', tenant_id!)
        .order('unit_number', { ascending: true })

      if (error) throw error
      return data as Residence[]
    },
    enabled: !!tenant_id,
  })

  const createResidenceMutation = useMutation({
    mutationFn: async (input: CreateResidenceInput) => {
      console.log('Creating residence with input:', input)
      console.log('Tenant ID:', tenant_id)

      // First create the residence
      const { data: residence, error: residenceError } = await supabase
        .from('residences')
        .insert({
          ...input,
          tenant_id: tenant_id!,
        })
        .select()
        .single()

      if (residenceError) {
        console.error('Residence creation error:', residenceError)
        throw residenceError
      }

      console.log('Residence created successfully:', residence)

      // Then create an associated household with inactive status
      const { data: household, error: householdError } = await supabase
        .from('households')
        .insert({
          residence_id: residence.id,
          tenant_id: tenant_id!,
          status: 'inactive',
          move_in_date: new Date().toISOString().split('T')[0], // Default to today
        })
        .select()
        .single()

      if (householdError) {
        console.error('Household creation error:', householdError)
        throw householdError
      }

      console.log('Household created successfully:', household)
      return { residence, household }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residences', tenant_id] })
      queryClient.invalidateQueries({ queryKey: ['households', tenant_id] })
      toast.success('Residence created successfully')
    },
    onError: (error: Error) => {
      console.error('Create residence mutation error:', error)
      toast.error(error.message || 'Failed to create residence')
    },
  })

  return {
    residences: residencesQuery.data ?? [],
    isLoading: residencesQuery.isLoading,
    createResidence: createResidenceMutation.mutate,
    isCreating: createResidenceMutation.isPending,
  }
}

export function useVacantResidences() {
  const user = useAuthStore((state) => state.user)
  const tenant_id = user?.tenant_id

  return useQuery({
    queryKey: ['vacant-residences', tenant_id],
    queryFn: async () => {
      // Get all residences
      const { data: residences, error: residencesError } = await supabase
        .from('residences')
        .select('*')
        .eq('tenant_id', tenant_id!)

      if (residencesError) throw residencesError

      // Get all occupied residences (active households)
      const { data: occupiedHouseholds, error: householdsError } = await supabase
        .from('households')
        .select('residence_id')
        .eq('tenant_id', tenant_id!)
        .eq('status', 'active')

      if (householdsError) throw householdsError

      const occupiedResidenceIds = new Set(
        occupiedHouseholds.map((h) => h.residence_id)
      )

      // Filter out occupied residences
      const vacantResidences = residences.filter(
        (r) => !occupiedResidenceIds.has(r.id)
      )

      return vacantResidences as Residence[]
    },
    enabled: !!tenant_id,
  })
}
