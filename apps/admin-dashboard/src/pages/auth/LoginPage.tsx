import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { setUser } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        // Validate role
        const role = data.user.app_metadata?.role
        if (!role || !['admin_head', 'admin_officer'].includes(role)) {
          await supabase.auth.signOut()
          toast.error('Access denied: This dashboard is for HOA administrators only')
          return
        }

        setUser({
          ...data.user,
          role: role as 'admin_head' | 'admin_officer',
          isAdminHead: role === 'admin_head',
          tenant_id: data.user.app_metadata?.tenant_id,
        })
        toast.success('Signed in successfully')
        navigate('/dashboard')
      }
    } catch (error) {
      console.error('Login error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">HOA Admin Dashboard</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Sign in to manage your community</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 rounded-md bg-blue-50 dark:bg-blue-900/20 p-4">
            <p className="text-center text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Demo Accounts</p>
            <div className="text-xs text-blue-700 dark:text-blue-300 space-y-2">
              <div>
                <p><strong>Admin Head:</strong></p>
                <p>Email: admin.head@greenvalley.com</p>
                <p>Password: AdminHead123!</p>
              </div>
              <div>
                <p><strong>Admin Officer:</strong></p>
                <p>Email: admin.officer@greenvalley.com</p>
                <p>Password: AdminOfficer123!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
