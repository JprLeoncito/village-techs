import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabaseAdmin, requireSuperadmin } from '@/lib/supabase'
import { queryKeys } from '@/lib/query'
import type { AdminUserFormData } from '@/lib/validations/community'
import type { Database } from '@/types/database.types'

type AdminUser = Database['public']['Tables']['admin_users']['Row']
type AdminUserUpdate = Database['public']['Tables']['admin_users']['Update']

// Export this type for use in components
export type AdminUserWithEmail = Database['public']['Functions']['get_admin_users_with_email']['Returns'][0]

/**
 * Fetch all admin users for a specific community
 * Uses RPC function to join with auth.users for email
 */
export function useAdminUsers(communityId: string) {
  return useQuery({
    queryKey: queryKeys.adminUsers.list(communityId),
    queryFn: async () => {
      // Validate authentication before fetching
      await requireSuperadmin()

      const { data, error } = await supabaseAdmin
        .rpc('get_admin_users_with_email', { p_tenant_id: communityId })

      if (error) throw error
      return data as AdminUserWithEmail[]
    },
    enabled: !!communityId,
  })
}

/**
 * Fetch a single admin user by ID
 * Uses RPC function to join with auth.users for email
 */
export function useAdminUser(userId: string) {
  return useQuery({
    queryKey: queryKeys.adminUsers.detail(userId),
    queryFn: async () => {
      // Validate authentication before fetching
      await requireSuperadmin()

      const { data, error } = await supabase
        .rpc('get_admin_user_with_email', { p_user_id: userId })

      if (error) throw error
      return data[0] as AdminUserWithEmail
    },
    enabled: !!userId,
  })
}

/**
 * Create a new admin officer user
 * Calls the Edge Function to create auth user + admin_users record
 */
export function useCreateAdminOfficer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: AdminUserFormData & { tenant_id: string }) => {
      // CRITICAL: Validate authentication before proceeding
      await requireSuperadmin()

      const { data, error } = await supabase.functions.invoke('create-community-admin', {
        body: {
          email: input.email,
          tenant_id: input.tenant_id,
          role: input.role,
          first_name: input.first_name,
          last_name: input.last_name,
          phone: input.phone,
        },
      })

      if (error) {
        // Handle specific error cases
        if (error.message?.includes('JWT') || error.message?.includes('expired')) {
          throw new Error('Your session has expired. Please log in again.')
        }
        if (error.message?.includes('duplicate') || error.message?.includes('already exists') || error.message?.includes('unique')) {
          throw new Error('A user with this email address already exists')
        }
        if (error.message?.includes('invalid') || error.message?.includes('validation')) {
          throw new Error('Please check that all fields are filled correctly')
        }
        if (error.message?.includes('permission') || error.message?.includes('unauthorized')) {
          throw new Error('You do not have permission to create admin users')
        }
        // Pass through the original error message if it's a specific one
        throw new Error(error.message || 'Failed to create admin user')
      }
      if (!data.success) {
        // Handle specific error messages from the Edge Function
        if (data.error?.includes('duplicate') || data.error?.includes('already exists')) {
          throw new Error('A user with this email address already exists')
        }
        if (data.error?.includes('permission') || data.error?.includes('unauthorized')) {
          throw new Error('You do not have permission to create admin users')
        }
        throw new Error(data.error || 'Failed to create admin user')
      }

      return {
        user: data.data,
        temporary_password: data.data.temporary_password,
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate admin users list
      queryClient.invalidateQueries({
        queryKey: queryKeys.adminUsers.list(variables.tenant_id),
      })
    },
  })
}

/**
 * Reset an admin user's password
 * Calls the Edge Function to generate new temp password and send email
 */
export function useResetAdminPassword() {
  return useMutation({
    mutationFn: async ({ userId, email }: { userId: string; email: string }) => {
      // CRITICAL: Validate authentication before proceeding
      await requireSuperadmin()

      const { data, error } = await supabase.functions.invoke('reset-admin-password', {
        body: {
          user_id: userId,
          email,
        },
      })

      if (error) {
        // Handle specific error cases
        if (error.message?.includes('JWT') || error.message?.includes('expired')) {
          throw new Error('Your session has expired. Please log in again.')
        }
        if (error.message?.includes('not found') || error.message?.includes('does not exist')) {
          throw new Error('Admin user not found')
        }
        if (error.message?.includes('permission') || error.message?.includes('unauthorized')) {
          throw new Error('You do not have permission to reset this user\'s password')
        }
        throw new Error(error.message || 'Failed to reset password')
      }
      if (!data.success) {
        // Handle specific error messages from the Edge Function
        if (data.error?.includes('not found')) {
          throw new Error('Admin user not found')
        }
        throw new Error(data.error || 'Failed to reset password')
      }

      return {
        temporary_password: data.temporary_password,
      }
    },
  })
}

/**
 * Deactivate an admin user
 * Sets status to 'inactive', preventing login
 */
export function useDeactivateAdminUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, tenantId }: { userId: string; tenantId: string }) => {
      // CRITICAL: Validate authentication before proceeding
      await requireSuperadmin()

      const updateData: AdminUserUpdate = {
        status: 'deactivated',
      }

      const { data, error } = await supabase
        .from('admin_users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        // Handle specific error cases
        if (error.message?.includes('JWT') || error.message?.includes('expired')) {
          throw new Error('Your session has expired. Please log in again.')
        }
        if (error.message?.includes('not found') || error.message?.includes('does not exist')) {
          throw new Error('Admin user not found')
        }
        if (error.message?.includes('permission') || error.message?.includes('unauthorized')) {
          throw new Error('You do not have permission to perform this action')
        }
        if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
          throw new Error('An admin user with this email already exists')
        }
        throw new Error(error.message || 'Failed to update admin user')
      }
      return { data: data as AdminUser, tenantId }
    },
    onSuccess: ({ tenantId }) => {
      // Invalidate admin users list
      queryClient.invalidateQueries({
        queryKey: queryKeys.adminUsers.list(tenantId),
      })
    },
  })
}

/**
 * Reactivate an admin user
 * Sets status to 'active', allowing login
 */
export function useReactivateAdminUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, tenantId }: { userId: string; tenantId: string }) => {
      // CRITICAL: Validate authentication before proceeding
      await requireSuperadmin()

      const updateData: AdminUserUpdate = {
        status: 'active',
      }

      const { data, error } = await supabase
        .from('admin_users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        // Handle specific error cases
        if (error.message?.includes('JWT') || error.message?.includes('expired')) {
          throw new Error('Your session has expired. Please log in again.')
        }
        if (error.message?.includes('not found') || error.message?.includes('does not exist')) {
          throw new Error('Admin user not found')
        }
        if (error.message?.includes('permission') || error.message?.includes('unauthorized')) {
          throw new Error('You do not have permission to perform this action')
        }
        if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
          throw new Error('An admin user with this email already exists')
        }
        throw new Error(error.message || 'Failed to update admin user')
      }
      return { data: data as AdminUser, tenantId }
    },
    onSuccess: ({ tenantId }) => {
      // Invalidate admin users list
      queryClient.invalidateQueries({
        queryKey: queryKeys.adminUsers.list(tenantId),
      })
    },
  })
}

/**
 * Update an admin user's details
 * Updates first_name, last_name, phone, and role
 */
export function useUpdateAdminUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      userId,
      tenantId,
      data
    }: {
      userId: string
      tenantId: string
      data: Partial<AdminUserFormData>
    }) => {
      // CRITICAL: Validate authentication before proceeding
      await requireSuperadmin()

      const updateData: AdminUserUpdate = {
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        role: data.role,
      }

      const { data: updatedUser, error } = await supabase
        .from('admin_users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        // Handle specific error cases
        if (error.message?.includes('JWT') || error.message?.includes('expired')) {
          throw new Error('Your session has expired. Please log in again.')
        }
        if (error.message?.includes('not found') || error.message?.includes('does not exist')) {
          throw new Error('Admin user not found')
        }
        if (error.message?.includes('permission') || error.message?.includes('unauthorized')) {
          throw new Error('You do not have permission to perform this action')
        }
        if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
          throw new Error('An admin user with this email already exists')
        }
        throw new Error(error.message || 'Failed to update admin user')
      }
      return { data: updatedUser as AdminUser, tenantId }
    },
    onSuccess: ({ tenantId }) => {
      // Invalidate admin users list
      queryClient.invalidateQueries({
        queryKey: queryKeys.adminUsers.list(tenantId),
      })
    },
  })
}

/**
 * Delete an admin user
 * Permanently removes admin_users record
 * NOTE: This does NOT delete the auth.users record (requires service_role)
 */
export function useDeleteAdminUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, tenantId }: { userId: string; tenantId: string }) => {
      // CRITICAL: Validate authentication before proceeding
      await requireSuperadmin()

      const { error } = await supabase
        .from('admin_users')
        .delete()
        .eq('id', userId)

      if (error) {
        // Handle specific error cases
        if (error.message?.includes('JWT') || error.message?.includes('expired')) {
          throw new Error('Your session has expired. Please log in again.')
        }
        if (error.message?.includes('not found') || error.message?.includes('does not exist')) {
          throw new Error('Admin user not found')
        }
        if (error.message?.includes('permission') || error.message?.includes('unauthorized')) {
          throw new Error('You do not have permission to perform this action')
        }
        if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
          throw new Error('An admin user with this email already exists')
        }
        throw new Error(error.message || 'Failed to update admin user')
      }
      return { tenantId }
    },
    onSuccess: ({ tenantId }) => {
      // Invalidate admin users list
      queryClient.invalidateQueries({
        queryKey: queryKeys.adminUsers.list(tenantId),
      })
    },
  })
}
