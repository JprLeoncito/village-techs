import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabaseAdmin, requireSuperadmin } from '@/lib/supabase'
import { queryKeys } from '@/lib/query'
import { uploadCommunityLogo } from '@/lib/storage'
import type { CommunityFormData } from '@/lib/validations/community'
import type { Database } from '@/types/database.types'

type Community = Database['public']['Tables']['communities']['Row']

export function useCommunities() {
  return useQuery({
    queryKey: queryKeys.communities.lists(),
    queryFn: async () => {
      // Validate authentication before fetching
      await requireSuperadmin()

      const { data, error } = await supabaseAdmin
        .from('communities')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Community[]
    },
  })
}

export function useCommunity(id: string) {
  return useQuery({
    queryKey: queryKeys.communities.detail(id),
    queryFn: async () => {
      // Validate authentication before fetching
      await requireSuperadmin()

      const { data, error } = await supabaseAdmin
        .from('communities')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Community
    },
    enabled: !!id,
  })
}

interface CreateCommunityInput extends Omit<CommunityFormData, 'logo'> {
  logo?: File | null
}

export function useCreateCommunity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateCommunityInput) => {
      // CRITICAL: Validate authentication and superadmin role before proceeding
      await requireSuperadmin()

      // 1. Create community record
      const { data: community, error: communityError } = await supabaseAdmin
        .from('communities')
        .insert({
          name: input.name,
          location: input.location,
          contact_email: input.contact_email,
          contact_phone: input.contact_phone,
          regional_settings: {
            timezone: input.timezone,
            currency: input.currency,
            language: input.language,
          },
          status: 'active',
        })
        .select()
        .single()

      if (communityError) {
        // Check if it's an auth error
        if (communityError.message?.includes('JWT') || communityError.message?.includes('expired')) {
          throw new Error('Your session has expired. Please log in again.')
        }
        throw communityError
      }

      // 2. Upload logo if provided
      if (input.logo && community) {
        try {
          const logoUrl = await uploadCommunityLogo(input.logo, community.id)

          // Update community with logo URL
          const { error: updateError } = await supabaseAdmin
            .from('communities')
            .update({ logo_url: logoUrl })
            .eq('id', community.id)

          if (updateError) throw updateError
        } catch (error) {
          console.error('Failed to upload logo:', error)
          // Continue even if logo upload fails
        }
      }

      return community
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.communities.lists() })
    },
  })
}

export function useSuspendCommunity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (communityId: string) => {
      // CRITICAL: Validate authentication before proceeding
      await requireSuperadmin()

      const { error } = await supabase.rpc('suspend_community', {
        community_id: communityId,
      })

      if (error) {
        if (error.message?.includes('JWT') || error.message?.includes('expired')) {
          throw new Error('Your session has expired. Please log in again.')
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.communities.all })
    },
  })
}

export function useReactivateCommunity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (communityId: string) => {
      // CRITICAL: Validate authentication before proceeding
      await requireSuperadmin()

      const { error } = await supabase.rpc('reactivate_community', {
        community_id: communityId,
      })

      if (error) {
        if (error.message?.includes('JWT') || error.message?.includes('expired')) {
          throw new Error('Your session has expired. Please log in again.')
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.communities.all })
    },
  })
}

export function useSoftDeleteCommunity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (communityId: string) => {
      // CRITICAL: Validate authentication before proceeding
      await requireSuperadmin()

      const { error } = await supabase.rpc('soft_delete_community', {
        community_id: communityId,
      })

      if (error) {
        if (error.message?.includes('JWT') || error.message?.includes('expired')) {
          throw new Error('Your session has expired. Please log in again.')
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.communities.all })
    },
  })
}
