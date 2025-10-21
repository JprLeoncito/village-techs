import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Container } from '@/components/layout/Container'
import { RegisterForm } from '@/components/features/auth/RegisterForm'
import { useRegister } from '@/hooks/useRegister'
import { showErrorToast, showSuccessToast } from '@/lib/toast'
import type { RegisterFormData } from '@/lib/validations/auth'
import { UserPlusIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { DarkModeToggle } from '@/components/ui/DarkModeToggle'

export function RegisterPage() {
  const navigate = useNavigate()
  const register = useRegister()
  const [isRegistered, setIsRegistered] = useState(false)
  const [countdown, setCountdown] = useState(3)
  const [emailExistsError, setEmailExistsError] = useState<string | null>(null)

  const handleSubmit = async (data: RegisterFormData) => {
    try {
      setEmailExistsError(null) // Clear any previous email error
      await register.mutateAsync(data)
      setIsRegistered(true)

      // Countdown timer for better UX
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            navigate('/registration-confirmation')
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (error: any) {
      console.error('Registration error:', error)
      // Check if it's an email exists error
      if (error.message?.includes('already been registered') ||
          error.message?.includes('user already exists') ||
          error.message?.includes('duplicate')) {
        setEmailExistsError(error.message)
      }
      // Error is already handled by the hook with toast
    }
  }

  return (
    <Container>
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-900">
        {/* Dark mode toggle in top right */}
        <div className="absolute top-4 right-4">
          <DarkModeToggle />
        </div>

        <div className="w-full max-w-md">
          {!isRegistered ? (
            <>
              {/* Header */}
              <div className="mb-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                  <UserPlusIcon className="h-6 w-6" />
                </div>
                <h1 className="mt-4 text-3xl font-bold text-gray-900 dark:text-gray-100">Create Account</h1>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Join Village Tech to manage your community efficiently
                </p>
              </div>

              {/* Registration Form */}
              <div className="rounded-lg border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 p-8 shadow-sm">
                <RegisterForm
                  onSubmit={handleSubmit}
                  isSubmitting={register.isPending}
                  emailExistsError={emailExistsError}
                  checkEmailExists={register.checkEmailExists}
                />
              </div>

              {/* Login Link */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
                  >
                    Sign in
                  </Link>
                </p>
              </div>

              {/* Benefits Section */}
              <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/50 p-6">
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3">Why Join Village Tech?</h3>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
                  <li>• Complete community management solution</li>
                  <li>• Real-time security monitoring</li>
                  <li>• Streamlined resident communication</li>
                  <li>• Automated fee collection</li>
                  <li>• 24/7 support and assistance</li>
                </ul>
              </div>

              {/* Trust Indicators */}
              <div className="mt-6 flex justify-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <span className="text-green-600">🔒</span>
                  <span>Secure Registration</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-blue-600">📧</span>
                  <span>Email Verification</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-purple-600">⚡</span>
                  <span>Quick Setup</span>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Success State */}
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 mb-4">
                  <CheckCircleIcon className="h-8 w-8" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Registration Successful!
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
                  Your account has been created and is pending review.
                </p>

                {/* Success Message Card */}
                <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/50 p-6 mb-6">
                  <h3 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2">
                    What happens next?
                  </h3>
                  <div className="space-y-2 text-sm text-green-700 dark:text-green-300">
                    <p>✓ Your registration has been submitted successfully</p>
                    <p>✓ Our administrators will review your application within 1-2 business days</p>
                    <p>✓ You'll receive an email notification once approved</p>
                  </div>
                </div>

                {/* Countdown Timer */}
                <div className="mb-6">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm text-blue-800 dark:text-blue-200">
                      Redirecting in {countdown} seconds...
                    </span>
                  </div>
                </div>

                {/* Manual Navigation */}
                <div className="space-y-3">
                  <Link
                    to="/registration-confirmation"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    View Detailed Confirmation
                  </Link>
                  <div>
                    <Link
                      to="/login"
                      className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Go directly to login page
                    </Link>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Container>
  )
}