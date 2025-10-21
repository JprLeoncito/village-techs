import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Container } from '@/components/layout/Container'
import { Button } from '@/components/ui/Button'
import { CheckCircleIcon, ClockIcon, EnvelopeIcon } from '@heroicons/react/24/outline'

export function RegistrationConfirmationPage() {
  const navigate = useNavigate()

  useEffect(() => {
    // Auto-redirect after 30 seconds
    const timer = setTimeout(() => {
      navigate('/login')
    }, 30000)

    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <Container>
      <div className="mx-auto max-w-md">
        {/* Success Icon */}
        <div className="mb-8 text-center">
          <div className="mx-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
            <CheckCircleIcon className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">
            Registration Submitted!
          </h1>
          <p className="mt-2 text-gray-600">
            Your account is now pending review by our administrators
          </p>
        </div>

        {/* Confirmation Card */}
        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          <div className="space-y-6">
            {/* Status Information */}
            <div className="flex items-start gap-3">
              <ClockIcon className="mt-1 h-5 w-5 text-blue-600 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-gray-900">Review Process</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Our administrators will review your registration request within 1-2 business days.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <EnvelopeIcon className="mt-1 h-5 w-5 text-blue-600 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-gray-900">Email Notification</h3>
                <p className="mt-1 text-sm text-gray-600">
                  You will receive an email notification once your account has been approved and assigned a role.
                </p>
              </div>
            </div>

            {/* Next Steps */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="font-medium text-gray-900 mb-3">What happens next?</h3>
              <ol className="space-y-2 text-sm text-gray-600">
                <li className="flex gap-2">
                  <span className="font-medium text-blue-600">1.</span>
                  <span>Admin review of your registration request</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-blue-600">2.</span>
                  <span>Role assignment (admin_officer, admin_head, or other)</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-blue-600">3.</span>
                  <span>Community assignment (if applicable)</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-blue-600">4.</span>
                  <span>Account approval email with login instructions</span>
                </li>
              </ol>
            </div>

            {/* Contact Information */}
            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-600 text-center">
                Questions? Contact our support team at{' '}
                <a href="mailto:support@villagetech.com" className="text-blue-600 hover:text-blue-700">
                  support@villagetech.com
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 space-y-3">
          <Button
            asChild
            className="w-full"
            onClick={() => navigate('/login')}
          >
            <Link to="/login">
              Return to Login
            </Link>
          </Button>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              This page will automatically redirect in 30 seconds
            </p>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="mt-8 flex justify-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <span className="text-green-600">🔒</span>
            <span>Secure Registration</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-blue-600">✓</span>
            <span>Admin Review</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-purple-600">⏱️</span>
            <span>Quick Response</span>
          </div>
        </div>
      </div>
    </Container>
  )
}