import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { VehicleSticker } from '@/types/stickers.types'
import toast from 'react-hot-toast'

export function useStickers(status?: string) {
  const user = useAuthStore((state) => state.user)
  const tenant_id = user?.tenant_id

  return useQuery({
    queryKey: ['stickers', tenant_id, status],
    queryFn: async () => {
      console.log('=== Admin UseStickers Query ===');
      console.log('Tenant ID:', tenant_id);
      console.log('Status filter:', status);

      let query = supabase
        .from('vehicle_stickers')
        .select(`
          *,
          households!household_id(
            id,
            residences!inner(unit_number)
          )
        `)
        .eq('tenant_id', tenant_id!)
        .is('deleted_at', null)  // Exclude soft-deleted records
        .order('created_at', { ascending: false })

      if (status && status !== 'all') {
        query = query.eq('status', status)
      }

      console.log('Executing query...');
      const { data, error } = await query

      if (error) {
        console.error('Query error:', error);
        throw error
      }

      console.log('Raw data:', data);
      console.log('Number of stickers found:', data?.length || 0);

      // Transform the data to match expected structure
      const transformedData = (data || []).map((sticker: any) => ({
        ...sticker,
        household: sticker.households ? {
          ...sticker.households,
          residence: sticker.households.residences ? {
            unit_number: sticker.households.residences.unit_number
          } : null
        } : null
      }));

      console.log('Transformed data:', transformedData);
      return transformedData as VehicleSticker[]
    },
    enabled: !!tenant_id,
  })
}

export function useStickerActions() {
  const user = useAuthStore((state) => state.user)
  const tenant_id = user?.tenant_id
  const queryClient = useQueryClient()

  const approveMutation = useMutation({
    mutationFn: async ({ sticker_id, expiry_date }: { sticker_id: string; expiry_date: string }) => {
      try {
        // Add timeout for Edge Function call (15 seconds)
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Server timeout. Please try again.')), 15000)
        })

        const functionCall = supabase.functions.invoke('approve-sticker', {
          body: {
            sticker_id,
            action: 'approve',
            expiry_date,
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
            throw new Error(error.message || 'Failed to approve sticker')
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
      queryClient.invalidateQueries({ queryKey: ['stickers', tenant_id] })
      toast.success('Sticker activated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to approve sticker')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async ({ sticker_id, rejection_reason }: { sticker_id: string; rejection_reason: string }) => {
      try {
        // Add timeout for Edge Function call (15 seconds)
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Server timeout. Please try again.')), 15000)
        })

        const functionCall = supabase.functions.invoke('approve-sticker', {
          body: {
            sticker_id,
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
            throw new Error(error.message || 'Failed to reject sticker')
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
      queryClient.invalidateQueries({ queryKey: ['stickers', tenant_id] })
      toast.success('Sticker rejected')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reject sticker')
    },
  })

  const revokeMutation = useMutation({
    mutationFn: async ({ sticker_id, revocation_reason }: { sticker_id: string; revocation_reason: string }) => {
      const { data, error } = await supabase.rpc('revoke_sticker', {
        p_sticker_id: sticker_id,
        p_revocation_reason: revocation_reason,
      })

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stickers', tenant_id] })
      toast.success('Sticker revoked successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to revoke sticker')
    },
  })

  const bulkApproveMutation = useMutation({
    mutationFn: async ({ sticker_ids, expiry_date }: { sticker_ids: string[]; expiry_date: string }) => {
      const { data, error } = await supabase.rpc('approve_sticker_bulk', {
        p_sticker_ids: sticker_ids,
        p_expiry_date: expiry_date,
      })

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stickers', tenant_id] })
      toast.success(`${variables.sticker_ids.length} stickers approved successfully`)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to approve stickers')
    },
  })

  const createMutation = useMutation({
    mutationFn: async (input: {
      household_id: string
      vehicle_plate: string
      vehicle_make?: string
      vehicle_model?: string
      vehicle_color?: string
      member_id?: string
    }) => {
      const { data, error } = await supabase
        .from('vehicle_stickers')
        .insert({
          tenant_id: tenant_id!,
          ...input,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stickers', tenant_id] })
      toast.success('Vehicle sticker request created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create sticker request')
    },
  })

  return {
    createSticker: createMutation.mutate,
    approveSticker: approveMutation.mutate,
    rejectSticker: rejectMutation.mutate,
    revokeSticker: revokeMutation.mutate,
    bulkApproveStickers: bulkApproveMutation.mutate,
    isCreating: createMutation.isPending,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
    isRevoking: revokeMutation.isPending,
    isBulkApproving: bulkApproveMutation.isPending,
  }
}
