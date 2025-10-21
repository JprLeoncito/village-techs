import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FormField } from '@/components/ui/FormField'
import { DarkModeToggle } from '@/components/ui/DarkModeToggle'

export function LoginPage() {
  const navigate = useNavigate()
  const setUser = useAuthStore((state) => state.setUser)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError

      if (!authData.user) {
        throw new Error('No user data returned')
      }

      // Check if user is superadmin (role is in app_metadata for security)
      const role = authData.user.app_metadata?.role
      if (role !== 'superadmin') {
        await supabase.auth.signOut()
        throw new Error('Access denied. Superadmin access required.')
      }

      // Store the full user object with extended properties
      setUser({
        ...authData.user,
        role,
        isSuperadmin: true,
      })

      // Redirect to dashboard
      navigate('/dashboard')
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'Failed to login. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-900">
      {/* Dark mode toggle in top right */}
      <div className="absolute top-4 right-4">
        <DarkModeToggle />
      </div>

      <div className="w-full max-w-md rounded-lg bg-white dark:bg-gray-800 p-8 shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Village Tech</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Platform Dashboard - Superadmin Access</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          <FormField label="Email" name="email" required>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="superadmin@example.com"
              required
              autoComplete="email"
              autoFocus
            />
          </FormField>

          <FormField label="Password" name="password" required>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />
          </FormField>

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            loading={loading}
            disabled={loading || !email || !password}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Need an account?{' '}
            <Link
              to="/register"
              className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
            >
              Register here
            </Link>
          </p>
        </div>

        <div className="mt-4 rounded-md bg-blue-50 dark:bg-blue-900/20 p-4">
          <p className="text-center text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Demo Account</p>
          <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
            <p><strong>Email:</strong> superadmin@villagetech.com</p>
            <p><strong>Password:</strong> SuperAdmin123!</p>
          </div>
        </div>
      </div>
    </div>
  )
}
