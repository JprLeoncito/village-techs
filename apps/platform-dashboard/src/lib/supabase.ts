import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import type { AppUser } from '@/types/auth.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env.local file.'
  )
}

// Session configuration constants
const SESSION_CONFIG = {
  // Access token expires after 24 hours (in seconds)
  ACCESS_TOKEN_EXPIRY: 24 * 60 * 60, // 86400 seconds = 24 hours
  // Refresh token expires after 7 days (in seconds)
  REFRESH_TOKEN_EXPIRY: 7 * 24 * 60 * 60, // 604800 seconds = 7 days
} as const

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Configure token expiry times
    // Note: These need to match Supabase project settings for full effect
    storage: globalThis?.localStorage,
  },
})

// Admin client for privileged operations (user management, role assignment, etc.)
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
})

/**
 * Helper function to add timeout to async operations
 * @param promise The promise to wrap with timeout
 * @param timeoutMs Timeout in milliseconds
 * @param errorMessage Error message if timeout occurs
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
  })
  return Promise.race([promise, timeoutPromise])
}

/**
 * Get the current authenticated user with role information
 * @returns AppUser object or null if not authenticated
 */
export async function getCurrentUser(): Promise<AppUser | null> {
  try {
    // First check for existing session (from localStorage)
    console.log('[Auth] Checking for existing session...')

    // Get session without timeout to prevent premature logout
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    console.log('[Auth] getSession() completed')

    if (sessionError) {
      console.error('[Auth] Session error:', sessionError.message)
      console.log('[Auth] This is usually due to old/invalid localStorage data')
      // Don't sign out - just return null and let AuthGuard handle it
      return null
    }

    if (!session) {
      console.log('[Auth] No session found')
      return null
    }

    // Log session expiry info for debugging
    const expiresAt = session.expires_at
      ? new Date(session.expires_at * 1000).toLocaleString()
      : 'unknown'
    console.log('[Auth] Session found, expires at:', expiresAt)

    // Then validate the user (ensures token is still valid)
    console.log('[Auth] Validating user...')
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    console.log('[Auth] getUser() completed')

    if (userError) {
      console.error('[Auth] User validation error:', userError.message)
      // Check if it's a token expired error
      if (userError.message.includes('expired') || userError.message.includes('invalid')) {
        console.log('[Auth] Token expired or invalid - user needs to re-login')
        // Sign out only on expired/invalid token
        await supabase.auth.signOut()
      }
      return null
    }

    if (!user) {
      console.log('[Auth] No user found after validation')
      return null
    }

    // Role is in app_metadata for security (user_metadata can be edited by users)
    const role = user.app_metadata?.role
    const isSuperadmin = role === 'superadmin'

    console.log('[Auth] User validated successfully:', {
      email: user.email,
      role,
      isSuperadmin,
      id: user.id.slice(0, 8) + '...'
    })

    // Return the full user object with additional properties
    const appUser: AppUser = {
      ...user,
      role,
      isSuperadmin,
    }

    return appUser
  } catch (error) {
    console.error('[Auth] Unexpected error in getCurrentUser:', error)
    console.log('[Auth] Error details:', error instanceof Error ? error.message : 'Unknown error')
    // Don't sign out on unexpected errors - just return null
    // This prevents data corruption issues from logging you out
    return null
  }
}

/**
 * Helper for superadmin-only operations
 */
export async function requireSuperadmin() {
  const user = await getCurrentUser()

  if (!user || !user.isSuperadmin) {
    throw new Error('Unauthorized: Superadmin access required')
  }

  return user
}

/**
 * Get session diagnostics for debugging
 * @returns Session information or null if no session
 */
export async function getSessionDiagnostics() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error || !session) {
      return {
        hasSession: false,
        error: error?.message || null,
        message: 'No active session found'
      }
    }

    const now = Date.now() / 1000 // Current time in seconds
    const expiresAt = session.expires_at || 0
    const timeUntilExpiry = expiresAt - now
    const hoursUntilExpiry = Math.floor(timeUntilExpiry / 3600)
    const minutesUntilExpiry = Math.floor((timeUntilExpiry % 3600) / 60)

    return {
      hasSession: true,
      email: session.user.email,
      expiresAt: new Date(expiresAt * 1000).toLocaleString(),
      timeUntilExpiry: `${hoursUntilExpiry}h ${minutesUntilExpiry}m`,
      isExpired: timeUntilExpiry <= 0,
      message: timeUntilExpiry <= 0
        ? 'Session has expired'
        : `Session expires in ${hoursUntilExpiry}h ${minutesUntilExpiry}m`
    }
  } catch (error) {
    return {
      hasSession: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Error checking session'
    }
  }
}

/**
 * Clear local session data without calling Supabase signOut
 * Useful for clearing corrupted local data
 */
export function clearLocalSession() {
  try {
    // Clear Supabase auth data from localStorage
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith('sb-') || key.includes('supabase')) {
        localStorage.removeItem(key)
      }
    })
    console.log('[Auth] Local session data cleared')
    return true
  } catch (error) {
    console.error('[Auth] Failed to clear local session:', error)
    return false
  }
}
