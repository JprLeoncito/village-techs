import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase, getCurrentUser, clearLocalSession, getSessionDiagnostics } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface AuthGuardProps {
  children: React.ReactNode
  requireAdminHead?: boolean // If true, only admin_head can access
}

const AUTH_CHECK_TIMEOUT = 10000 // 10 seconds

export function AuthGuard({ children, requireAdminHead = false }: AuthGuardProps) {
  const { user, setUser, clearUser } = useAuthStore()
  // Only show loading on initial mount if there's no cached user
  const [loading, setLoading] = useState(!user)
  const [error, setError] = useState<string | null>(null)
  const [sessionInfo, setSessionInfo] = useState<string>('')

  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    // Only check auth if there's no user in store
    // If user exists, they're already logged in from localStorage
    if (!user) {
      const checkAuth = async () => {
        try {
          console.log('[Admin AuthGuard] No cached user, checking authentication...')

          // Get session diagnostics for debugging
          const diagnostics = await getSessionDiagnostics()
          if (diagnostics.hasSession) {
            setSessionInfo(diagnostics.message || '')
            console.log('[Admin AuthGuard] Session diagnostics:', diagnostics)
          }

          // Set a timeout to prevent infinite loading
          const timeoutPromise = new Promise<null>((_, reject) => {
            timeoutId = setTimeout(() => {
              reject(new Error('Authentication check timed out after 10 seconds'))
            }, AUTH_CHECK_TIMEOUT)
          })

          // Race between auth check and timeout
          const currentUser = await Promise.race([getCurrentUser(), timeoutPromise])

          clearTimeout(timeoutId)

          console.log(
            '[Admin AuthGuard] Current user:',
            currentUser ? currentUser.email : 'none'
          )
          setUser(currentUser)
          setError(null)
        } catch (error) {
          console.error('[Admin AuthGuard] Auth check failed:', error)
          clearUser()
          setError(error instanceof Error ? error.message : 'Authentication failed')
        } finally {
          setLoading(false)
        }
      }

      checkAuth()
    } else {
      console.log('[Admin AuthGuard] User loaded from cache, skipping auth check')
      setLoading(false)
    }

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Skip SIGNED_IN event on initial load if we already have cached user
      // This prevents unnecessary auth checks on page reload
      if (event === 'SIGNED_IN' && user) {
        console.log('[Admin AuthGuard] SIGNED_IN event with cached user, skipping check')
        return
      }

      console.log('[Admin AuthGuard] Auth state changed:', event, session?.user?.email)

      if (event === 'SIGNED_OUT') {
        clearUser()
        return
      }

      if (event === 'TOKEN_REFRESHED') {
        console.log('[Admin AuthGuard] Token refreshed successfully')
      }

      if (session?.user) {
        try {
          const currentUser = await getCurrentUser()
          setUser(currentUser)
          setError(null)
        } catch (error) {
          console.error('[Admin AuthGuard] Failed to get user:', error)
          clearUser()
        }
      } else {
        clearUser()
      }
    })

    return () => {
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [setUser, clearUser])

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-sm text-gray-600">Verifying authentication...</p>
        {sessionInfo && <p className="mt-2 text-xs text-gray-500">{sessionInfo}</p>}
        {/* Show clear session button after 5 seconds if still loading */}
        <button
          onClick={() => {
            clearLocalSession()
            window.location.reload()
          }}
          className="mt-6 text-xs text-blue-600 hover:text-blue-700 hover:underline"
        >
          Taking too long? Click here to clear session data
        </button>
      </div>
    )
  }

  // Error state - show error with option to clear session
  if (error) {
    console.error('[Admin AuthGuard] Error encountered:', error)
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-lg border border-yellow-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
            <svg
              className="h-6 w-6 text-yellow-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Authentication Error</h1>
          <p className="mt-2 text-sm text-gray-600">{error}</p>
          <p className="mt-3 text-xs text-gray-500">
            This is usually caused by outdated session data.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={() => {
                clearLocalSession()
                clearUser()
                window.location.href = '/login'
              }}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Clear Session & Try Again
            </button>
            <button
              onClick={() => {
                window.location.href = '/login'
              }}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Not authenticated
  if (!user) {
    console.log('[Admin AuthGuard] No user, redirecting to login')
    return <Navigate to="/login" replace />
  }

  // Check if user has admin role
  if (!user.role || !['admin_head', 'admin_officer'].includes(user.role)) {
    console.error('[Admin AuthGuard] User is not an HOA admin:', {
      email: user.email,
      role: user.role,
    })
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="rounded-lg border border-red-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-sm text-gray-600">
            This dashboard is for HOA administrators only.
          </p>
          <button
            onClick={async () => {
              await supabase.auth.signOut()
              window.location.href = '/login'
            }}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  // Check if admin_head is required
  if (requireAdminHead && !user.isAdminHead) {
    console.error('[Admin AuthGuard] Admin Head access required but user is officer')
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="rounded-lg border border-orange-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
            <svg
              className="h-6 w-6 text-orange-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Insufficient Permissions</h1>
          <p className="mt-2 text-sm text-gray-600">
            This feature requires Admin Head privileges.
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Your account: {user.email} ({user.role})
          </p>
          <button
            onClick={() => {
              window.location.href = '/'
            }}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  console.log('[Admin AuthGuard] User authenticated successfully')
  return <>{children}</>
}
