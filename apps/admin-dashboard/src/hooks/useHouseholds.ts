import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { Household, CreateHouseholdInput, ActivateHouseholdInput } from '@/types/households.types'
import toast from 'react-hot-toast'

export function useHouseholds() {
  const user = useAuthStore((state) => state.user)
  const tenant_id = user?.tenant_id
  const queryClient = useQueryClient()

  const householdsQuery = useQuery({
    queryKey: ['households', tenant_id],
    queryFn: async () => {
      // Get all households with their residences
      const { data: households, error: householdsError } = await supabase
        .from('households')
        .select(`
          *,
          residence:residences(*),
          household_head:household_members!household_head_id(
            id,
            first_name,
            last_name,
            relationship_to_head,
            status,
            contact_email,
            contact_phone
          )
        `)
        .eq('tenant_id', tenant_id!)
        .order('created_at', { ascending: false })

      if (householdsError) throw householdsError

      // Also get residences that don't have households yet and create placeholder households
      const { data: residencesWithoutHouseholds, error: residencesError } = await supabase
        .from('residences')
        .select('*')
        .eq('tenant_id', tenant_id!)
        .not('id', 'in', `(${households.map(h => h.residence_id).join(',')})`)

      if (residencesError) throw residencesError

      // Create placeholder households for residences without households
      const placeholderHouseholds = residencesWithoutHouseholds.map(residence => ({
        id: `placeholder-${residence.id}`,
        tenant_id: tenant_id!,
        residence_id: residence.id,
        household_head_id: null,
        move_in_date: null,
        move_out_date: null,
        status: 'inactive' as const,
        contact_email: null,
        contact_phone: null,
        notes: null,
        created_at: residence.created_at,
        updated_at: residence.updated_at,
        residence,
        household_head: null,
      }))

      return [...households, ...placeholderHouseholds] as Household[]
    },
    enabled: !!tenant_id,
  })

  const createHouseholdMutation = useMutation({
    mutationFn: async (input: CreateHouseholdInput) => {
      const { data, error } = await supabase
        .from('households')
        .insert({
          ...input,
          tenant_id: tenant_id!,
          status: 'active',
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['households', tenant_id] })
      toast.success('Household created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create household')
    },
  })

  const updateHouseholdMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Household> }) => {
      const { data, error } = await supabase
        .from('households')
        .update(updates)
        .eq('id', id)
        .eq('tenant_id', tenant_id!)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['households', tenant_id] })
      toast.success('Household updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update household')
    },
  })

  const activateHouseholdMutation = useMutation({
    mutationFn: async (input: ActivateHouseholdInput) => {
      const { householdId, activationData, members } = input

      // Update the household with activation data
      const { data: household, error: householdError } = await supabase
        .from('households')
        .update({
          ...activationData,
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', householdId)
        .eq('tenant_id', tenant_id!)
        .select()
        .single()

      if (householdError) throw householdError

      // Add members if any
      if (members.length > 0) {
        const membersWithHouseholdId = members.map(member => ({
          ...member,
          household_id: householdId,
          tenant_id: tenant_id!,
          status: 'active' as const,
        }))

        const { error: membersError } = await supabase
          .from('household_members')
          .insert(membersWithHouseholdId)

        if (membersError) throw membersError

        // Set household head if first member
        if (members.length > 0) {
          const { error: headUpdateError } = await supabase
            .from('households')
            .update({ household_head_id: members[0].household_id })
            .eq('id', householdId)

          if (headUpdateError) throw headUpdateError
        }
      }

      return household
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['households', tenant_id] })
      toast.success('Residence activated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to activate residence')
    },
  })

  return {
    households: householdsQuery.data ?? [],
    isLoading: householdsQuery.isLoading,
    createHousehold: createHouseholdMutation.mutate,
    updateHousehold: updateHouseholdMutation.mutate,
    activateHousehold: activateHouseholdMutation.mutate,
    isCreating: createHouseholdMutation.isPending,
    isUpdating: updateHouseholdMutation.isPending,
    isActivating: activateHouseholdMutation.isPending,
  }
}

export function useHouseholdDetail(householdId: string) {
  const user = useAuthStore((state) => state.user)
  const tenant_id = user?.tenant_id

  return useQuery({
    queryKey: ['household', householdId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('households')
        .select(`
          *,
          residence:residences(*),
          household_head:household_members!household_head_id(
            id,
            first_name,
            last_name,
            relationship_to_head,
            status,
            contact_email,
            contact_phone
          ),
          members:household_members!household_id(*)
        `)
        .eq('id', householdId)
        .eq('tenant_id', tenant_id!)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!tenant_id && !!householdId,
  })
}
