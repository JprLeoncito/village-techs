import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { ConstructionPermit } from '@/types/permits.types'
import type { CreatePermitFormData } from '@/lib/validations/permits'
import toast from 'react-hot-toast'

export function usePermits(status?: string) {
  const user = useAuthStore((state) => state.user)
  const tenant_id = user?.tenant_id

  return useQuery({
    queryKey: ['permits', tenant_id, status],
    queryFn: async () => {
      let query = supabase
        .from('construction_permits')
        .select(`
          *,
          household:households(
            id,
            residence:residences(unit_number),
            household_head:household_members!household_head_id(first_name, last_name)
          )
        `)
        .eq('tenant_id', tenant_id!)
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query

      if (error) throw error
      return data as ConstructionPermit[]
    },
    enabled: !!tenant_id,
  })
}

export function usePermitActions() {
  const user = useAuthStore((state) => state.user)
  const tenant_id = user?.tenant_id
  const queryClient = useQueryClient()

  const approveMutation = useMutation({
    mutationFn: async ({
      permit_id,
      road_fee_amount,
      start_date,
    }: {
      permit_id: string
      road_fee_amount: number
      start_date?: string
    }) => {
      try {
        // Add timeout for Edge Function call (15 seconds)
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Server timeout. Please try again.')), 15000)
        })

        const functionCall = supabase.functions.invoke('process-construction-permit', {
          body: {
            permit_id,
            action: 'approve',
            road_fee_amount,
            start_date,
          },
        })

        const { data, error } = await Promise.race([functionCall, timeoutPromise])

        if (error) {
          // Handle different types of errors
          if (error.message?.includes('fetch')) {
            throw new Error('Unable to connect to server. Please check your connection and try again.')
          } else if (error.message?.includes('503')) {
            throw new Error('Service temporarily unavailable. Please try again in a few moments.')
          } else {
            throw new Error(error.message || 'Failed to approve permit')
          }
        }

        return data
      } catch (error: any) {
        if (error.message === 'Server timeout. Please try again.') {
          throw error
        }
        if (error.message?.includes('Failed to fetch')) {
          throw new Error('Network error. Please check your connection and try again.')
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permits', tenant_id] })
      toast.success('Permit approved successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to approve permit')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async ({ permit_id, rejection_reason }: { permit_id: string; rejection_reason: string }) => {
      try {
        // Add timeout for Edge Function call (15 seconds)
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Server timeout. Please try again.')), 15000)
        })

        const functionCall = supabase.functions.invoke('process-construction-permit', {
          body: {
            permit_id,
            action: 'reject',
            rejection_reason,
          },
        })

        const { data, error } = await Promise.race([functionCall, timeoutPromise])

        if (error) {
          // Handle different types of errors
          if (error.message?.includes('fetch')) {
            throw new Error('Unable to connect to server. Please check your connection and try again.')
          } else if (error.message?.includes('503')) {
            throw new Error('Service temporarily unavailable. Please try again in a few moments.')
          } else {
            throw new Error(error.message || 'Failed to reject permit')
          }
        }

        return data
      } catch (error: any) {
        if (error.message === 'Server timeout. Please try again.') {
          throw error
        }
        if (error.message?.includes('Failed to fetch')) {
          throw new Error('Network error. Please check your connection and try again.')
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permits', tenant_id] })
      toast.success('Permit rejected')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reject permit')
    },
  })

  const markInProgressMutation = useMutation({
    mutationFn: async ({ permit_id, start_date }: { permit_id: string; start_date: string }) => {
      const { data, error } = await supabase
        .from('construction_permits')
        .update({
          status: 'in_progress',
          project_start_date: start_date,
        })
        .eq('id', permit_id)
        .eq('tenant_id', tenant_id!)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permits', tenant_id] })
      toast.success('Permit marked as in progress')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update permit')
    },
  })

  const markCompletedMutation = useMutation({
    mutationFn: async ({ permit_id, end_date }: { permit_id: string; end_date: string }) => {
      try {
        // Add timeout for Edge Function call (15 seconds)
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Server timeout. Please try again.')), 15000)
        })

        const functionCall = supabase.functions.invoke('process-construction-permit', {
          body: {
            permit_id,
            action: 'mark_completed',
            end_date,
          },
        })

        const { data, error } = await Promise.race([functionCall, timeoutPromise])

        if (error) {
          // Handle different types of errors
          if (error.message?.includes('fetch')) {
            throw new Error('Unable to connect to server. Please check your connection and try again.')
          } else if (error.message?.includes('503')) {
            throw new Error('Service temporarily unavailable. Please try again in a few moments.')
          } else {
            throw new Error(error.message || 'Failed to complete permit')
          }
        }

        return data
      } catch (error: any) {
        if (error.message === 'Server timeout. Please try again.') {
          throw error
        }
        if (error.message?.includes('Failed to fetch')) {
          throw new Error('Network error. Please check your connection and try again.')
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permits', tenant_id] })
      toast.success('Permit marked as completed')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to complete permit')
    },
  })

  const markRoadFeePaidMutation = useMutation({
    mutationFn: async ({ permit_id }: { permit_id: string }) => {
      try {
        // Add timeout for Edge Function call (15 seconds)
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Server timeout. Please try again.')), 15000)
        })

        const functionCall = supabase.functions.invoke('process-construction-permit', {
          body: {
            permit_id,
            action: 'mark_paid',
          },
        })

        const { data, error } = await Promise.race([functionCall, timeoutPromise])

        if (error) {
          // Handle different types of errors
          if (error.message?.includes('fetch')) {
            throw new Error('Unable to connect to server. Please check your connection and try again.')
          } else if (error.message?.includes('503')) {
            throw new Error('Service temporarily unavailable. Please try again in a few moments.')
          } else {
            throw new Error(error.message || 'Failed to mark road fee as paid')
          }
        }

        return data
      } catch (error: any) {
        if (error.message === 'Server timeout. Please try again.') {
          throw error
        }
        if (error.message?.includes('Failed to fetch')) {
          throw new Error('Network error. Please check your connection and try again.')
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permits', tenant_id] })
      toast.success('Road fee marked as paid')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to mark road fee as paid')
    },
  })

  const createPermitMutation = useMutation({
    mutationFn: async (formData: CreatePermitFormData) => {
      const { data, error } = await supabase
        .from('construction_permits')
        .insert({
          tenant_id: tenant_id!,
          household_id: formData.household_id,
          project_description: formData.project_description,
          project_start_date: formData.project_start_date,
          project_end_date: formData.project_end_date,
          contractor_name: formData.contractor_name,
          contractor_contact: formData.contractor_contact || null,
          contractor_license: formData.contractor_license || null,
          estimated_worker_count: formData.estimated_worker_count,
          road_fee_amount: formData.road_fee_amount || null,
          status: 'pending',
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permits', tenant_id] })
      toast.success('Permit created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create permit')
    },
  })

  return {
    approvePermit: approveMutation.mutate,
    rejectPermit: rejectMutation.mutate,
    markInProgress: markInProgressMutation.mutate,
    markCompleted: markCompletedMutation.mutate,
    markRoadFeePaid: markRoadFeePaidMutation.mutate,
    createPermit: createPermitMutation.mutate,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
    isMarkingInProgress: markInProgressMutation.isPending,
    isMarkingCompleted: markCompletedMutation.isPending,
    isMarkingPaid: markRoadFeePaidMutation.isPending,
    isCreating: createPermitMutation.isPending,
  }
}
