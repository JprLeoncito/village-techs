import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { Container } from '@/components/layout/Container'
import { ChangePasswordForm } from '@/components/features/auth/ChangePasswordForm'
import { showErrorToast, showSuccessToast } from '@/lib/errorHandling'
import type { ChangePasswordFormData } from '@/components/features/auth/ChangePasswordForm'
import { KeyIcon } from '@heroicons/react/24/outline'

export function ChangePasswordPage() {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (data: ChangePasswordFormData) => {
    setIsSubmitting(true)

    try {
      // Step 1: Verify current password by re-authenticating
      const { data: { user } } = await supabase.auth.getUser()

      if (!user?.email) {
        throw new Error('User not found')
      }

      // Re-authenticate with current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: data.currentPassword,
      })

      if (signInError) {
        throw new Error('Current password is incorrect')
      }

      // Step 2: Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.newPassword,
      })

      if (updateError) {
        throw new Error(updateError.message)
      }

      // Step 3: Show success message
      showSuccessToast(
        'Password changed successfully!',
        'Your password has been updated. You can continue using your account.',
        toast
      )

      // Step 4: Navigate back to dashboard
      setTimeout(() => {
        navigate('/dashboard')
      }, 2000)
    } catch (error: any) {
      console.error('Error changing password:', error)
      showErrorToast(error, window.toast)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Container>
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-600">
            <KeyIcon className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-3xl font-bold text-gray-900 dark:text-gray-100">Change Password</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Update your account password for better security
          </p>
        </div>

        {/* Form */}
        <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 p-8 shadow-sm">
          <ChangePasswordForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
        </div>

        {/* Help Section */}
        <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20 p-6">
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">Security Tips</h3>
          <ul className="mt-2 text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• Use a unique password that you haven't used elsewhere</li>
            <li>• Include a mix of letters, numbers, and special characters</li>
            <li>• Avoid using personal information like birthdays or names</li>
            <li>• Consider using a password manager to generate strong passwords</li>
          </ul>
        </div>

        {/* Back Button */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </Container>
  )
}