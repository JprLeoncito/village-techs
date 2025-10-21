import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { UserAccountService } from '@/services/userAccountService'
import type { CreateMemberInput, HouseholdMember } from '@/types/households.types'
import toast from 'react-hot-toast'

export function useHouseholdMembers() {
  const user = useAuthStore((state) => state.user)
  const tenant_id = user?.tenant_id
  const queryClient = useQueryClient()

  const createMemberMutation = useMutation({
    mutationFn: async (input: CreateMemberInput) => {
      // Transform empty strings to null for date fields
      const transformedInput = {
        ...input,
        date_of_birth: input.date_of_birth || null,
        tenant_id: tenant_id!,
        status: 'active',
      }

      const { data, error } = await supabase
        .from('household_members')
        .insert(transformedInput)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['household', variables.household_id] })
      toast.success('Member added successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add member')
    },
  })

  const updateMemberMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<HouseholdMember> }) => {
      // Transform empty strings to null for date fields
      const transformedUpdates = {
        ...updates,
        date_of_birth: updates.date_of_birth || null,
      }

      const { data, error } = await supabase
        .from('household_members')
        .update(transformedUpdates)
        .eq('id', id)
        .eq('tenant_id', tenant_id!)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['household'] })
      toast.success('Member updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update member')
    },
  })

  const uploadPhotoMutation = useMutation({
    mutationFn: async ({ memberId, file }: { memberId: string; file: File }) => {
      // Upload to Supabase Storage
      const fileName = `${tenant_id}/${memberId}.${file.name.split('.').pop()}`
      const { error: uploadError } = await supabase.storage
        .from('member-photos')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('member-photos')
        .getPublicUrl(fileName)

      // Update member record
      const { error: updateError } = await supabase
        .from('household_members')
        .update({ photo_url: publicUrl })
        .eq('id', memberId)

      if (updateError) throw updateError

      return publicUrl
    },
    onSuccess: () => {
      toast.success('Photo uploaded successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to upload photo')
    },
  })

  const deleteMemberMutation = useMutation({
    mutationFn: async ({ memberId, householdId }: { memberId: string; householdId: string }) => {
      // Check if the member is the household head
      const { data: household } = await supabase
        .from('households')
        .select('household_head_id')
        .eq('id', householdId)
        .single()

      if (household?.household_head_id === memberId) {
        throw new Error('Cannot delete the head of the household')
      }

      const { error } = await supabase
        .from('household_members')
        .delete()
        .eq('id', memberId)
        .eq('tenant_id', tenant_id!)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['household', variables.householdId] })
      queryClient.invalidateQueries({ queryKey: ['households', tenant_id] })
      toast.success('Member deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete member')
    },
  })

  const setHouseholdHeadMutation = useMutation({
    mutationFn: async ({ householdId, memberId }: { householdId: string; memberId: string }) => {
      const { error } = await supabase
        .from('households')
        .update({ household_head_id: memberId })
        .eq('id', householdId)
        .eq('tenant_id', tenant_id!)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['household', variables.householdId] })
      queryClient.invalidateQueries({ queryKey: ['households', tenant_id] })
      toast.success('Household head updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update household head')
    },
  })

  const createAccountForExistingMemberMutation = useMutation({
    mutationFn: async ({ memberId, email, password }: { memberId: string; email: string; password: string }) => {
      console.log('🔧 useHouseholdMembers: Creating account for existing member', { memberId, email })

      if (!supabaseAdmin) {
        throw new Error('Supabase admin client not available')
      }

      const result = await UserAccountService.createAccountForExistingMember(memberId, email, password)
      console.log('✅ useHouseholdMembers: Account created successfully', result)
      return result
    },
    onSuccess: (result) => {
      console.log('🎉 useHouseholdMembers: Account creation success callback')
      queryClient.invalidateQueries({ queryKey: ['household'] })
      queryClient.invalidateQueries({ queryKey: ['households', tenant_id] })
      toast.success('Residence App account created successfully!')
    },
    onError: (error: Error) => {
      console.error('❌ useHouseholdMembers: Account creation error:', error)
      toast.error(error.message || 'Failed to create account')
    },
  })

  return {
    createMember: createMemberMutation.mutate,
    updateMember: updateMemberMutation.mutate,
    deleteMember: deleteMemberMutation.mutate,
    uploadPhoto: uploadPhotoMutation.mutate,
    setHouseholdHead: setHouseholdHeadMutation.mutate,
    createAccountForExistingMember: createAccountForExistingMemberMutation.mutate,
    isCreating: createMemberMutation.isPending,
    isUpdating: updateMemberMutation.isPending,
    isDeleting: deleteMemberMutation.isPending,
    isUploading: uploadPhotoMutation.isPending,
    isCreatingAccountForExisting: createAccountForExistingMemberMutation.isPending,
  }
}
