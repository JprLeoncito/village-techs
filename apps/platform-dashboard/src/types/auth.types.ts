import type { User } from '@supabase/supabase-js'

/**
 * Extended user type for the Platform Dashboard
 * Includes the full Supabase User object plus custom properties
 */
export interface AppUser extends User {
  role?: string
  isSuperadmin?: boolean
}

/**
 * Type guard to check if a value is an AppUser
 */
export function isAppUser(user: unknown): user is AppUser {
  return (
    typeof user === 'object' &&
    user !== null &&
    'id' in user &&
    'email' in user &&
    'app_metadata' in user
  )
}
