import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query'
import { useAuthStore } from '@/stores/authStore'
import type { Database } from '@/types/database.types'

type AdminUser = Database['public']['Tables']['admin_users']['Row']

/**
 * Fetch the current user's profile data from admin_users table
 */
export function useProfile() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: queryKeys.profile.detail(),
    queryFn: async () => {
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        // If no record exists, return a default profile
        if (error.code === 'PGRST116') {
          return {
            id: user.id,
            first_name: null,
            last_name: null,
            phone: null,
            role: 'admin',
            status: 'active',
            tenant_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as AdminUser
        }
        throw error
      }

      return data as AdminUser
    },
    enabled: !!user,
  })
}