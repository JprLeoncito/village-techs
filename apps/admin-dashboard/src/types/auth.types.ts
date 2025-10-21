import type { User } from '@supabase/supabase-js'

/**
 * Extended user type for the HOA Admin Dashboard
 * Includes the full Supabase User object plus custom properties
 */
export interface AdminUser extends User {
  role?: 'admin_head' | 'admin_officer'
  isAdminHead?: boolean
  tenant_id?: string
}

/**
 * Type guard to check if a value is an AdminUser
 */
export function isAdminUser(user: unknown): user is AdminUser {
  return (
    typeof user === 'object' &&
    user !== null &&
    'id' in user &&
    'email' in user &&
    'app_metadata' in user
  )
}
