import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { showErrorToast, showSuccessToast } from '@/lib/toast'
import type { Database } from '@/types/database.types'

type PendingUser = Database['public']['Tables']['pending_users']['Row']

export function usePendingUsers() {
  return useQuery({
    queryKey: ['pending-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pending_users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as PendingUser[]
    },
  })
}

export function useApprovePendingUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      userId,
      role,
      tenantId,
      adminNotes
    }: {
      userId: string
      role: 'superadmin' | 'admin_head' | 'admin_officer'
      tenantId?: string
      adminNotes?: string
    }) => {
      // Store the role for the success message
      const assignedRole = role
      // First get the pending user details
      const { data: pendingUser, error: fetchError } = await supabase
        .from('pending_users')
        .select('*')
        .eq('id', userId)
        .single()

      if (fetchError) throw fetchError

      // Update the pending user status
      const { error: updateError } = await supabase
        .from('pending_users')
        .update({
          status: 'approved',
          admin_notes: adminNotes,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (updateError) throw updateError

      // Create admin_users record
      const adminUserData = {
        id: pendingUser.auth_user_id,
        tenant_id: tenantId || null,
        role: role,
        status: 'active' as const,
        first_name: pendingUser.first_name,
        last_name: pendingUser.last_name,
        phone: pendingUser.phone,
      }

      const { error: adminError } = await supabase
        .from('admin_users')
        .insert(adminUserData)

      if (adminError) throw adminError

      // Update user's app_metadata in Supababase Auth
      if (pendingUser.auth_user_id) {
        console.log(`[ApprovePendingUser] Updating auth metadata for user ${pendingUser.auth_user_id} with role: ${role}`)

        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
          pendingUser.auth_user_id,
          {
            user_metadata: {
              role: role,
              first_name: pendingUser.first_name,
              last_name: pendingUser.last_name,
              phone: pendingUser.phone,
            },
            app_metadata: {
              role: role,
              tenant_id: tenantId,
            }
          }
        )

        if (authError) {
          console.error('Failed to update user auth metadata:', authError)
          throw new Error(`Failed to assign role: ${authError.message}`)
        }

        console.log(`[ApprovePendingUser] Successfully updated auth metadata for role: ${role}`)

        // Force refresh the user's session to pick up new metadata
        const { error: refreshError } = await supabaseAdmin.auth.admin.signOut(pendingUser.auth_user_id)
        if (refreshError) {
          console.warn('Failed to sign out user after role assignment:', refreshError)
          // Don't fail the operation as the role has been assigned
        } else {
          console.log(`[ApprovePendingUser] User signed out successfully to refresh session for role: ${role}`)
        }
      }

      return {
        pendingUser,
        assignedRole
      }
    },
    onSuccess: (data) => {
      showSuccessToast(
        'User Approved Successfully',
        `The user has been approved and assigned the ${data.assignedRole} role. They will need to log in again to access their new permissions.`
      )
      queryClient.invalidateQueries({ queryKey: ['pending-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (error) => {
      showErrorToast(error)
    },
  })
}

export function useRejectPendingUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      userId,
      adminNotes
    }: {
      userId: string
      adminNotes?: string
    }) => {
      const { error } = await supabase
        .from('pending_users')
        .update({
          status: 'rejected',
          admin_notes: adminNotes,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (error) throw error
    },
    onSuccess: () => {
      showSuccessToast(
        'User Rejected',
        'The registration request has been rejected.'
      )
      queryClient.invalidateQueries({ queryKey: ['pending-users'] })
    },
    onError: (error) => {
      showErrorToast(error)
    },
  })
}

export function useUpdatePendingUserNotes() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      userId,
      adminNotes
    }: {
      userId: string
      adminNotes: string
    }) => {
      const { error } = await supabase
        .from('pending_users')
        .update({
          admin_notes: adminNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (error) throw error
    },
    onSuccess: () => {
      showSuccessToast(
        'Notes Updated',
        'Admin notes have been updated successfully.'
      )
      queryClient.invalidateQueries({ queryKey: ['pending-users'] })
    },
    onError: (error) => {
      showErrorToast(error)
    },
  })
}