import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { registerSchema, type RegisterFormData } from '@/lib/validations/auth'

interface RegisterFormProps {
  onSubmit: (data: RegisterFormData) => Promise<void>
  isSubmitting?: boolean
  emailExistsError?: string | null
  checkEmailExists?: (email: string) => Promise<boolean>
}

export function RegisterForm({ onSubmit, isSubmitting, emailExistsError, checkEmailExists }: RegisterFormProps) {
  const [emailBlurred, setEmailBlurred] = useState(false)
  const [emailChecking, setEmailChecking] = useState(false)
  const [emailExists, setEmailExists] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    trigger,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      acceptTerms: false,
    },
  })

  const password = watch('password')
  const confirmPassword = watch('confirmPassword')

  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, label: 'Enter a password', color: 'text-gray-400' }

    let strength = 0
    if (password.length >= 8) strength++
    if (password.length >= 12) strength++
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++
    if (/\d/.test(password)) strength++
    if (/[^a-zA-Z\d]/.test(password)) strength++

    const strengthMap = [
      { strength: 0, label: 'Very Weak', color: 'text-red-600' },
      { strength: 1, label: 'Weak', color: 'text-orange-600' },
      { strength: 2, label: 'Fair', color: 'text-yellow-600' },
      { strength: 3, label: 'Good', color: 'text-blue-600' },
      { strength: 4, label: 'Strong', color: 'text-green-600' },
      { strength: 5, label: 'Very Strong', color: 'text-green-700' },
    ]

    return strengthMap[Math.min(strength, 5)]
  }

  const passwordStrength = getPasswordStrength(password || '')

  const passwordsMatch = password && confirmPassword && password === confirmPassword

  const email = watch('email')
  const isValidEmail = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const handleEmailBlur = async () => {
    setEmailBlurred(true)
    await trigger('email')

    // Check if email exists if it's valid
    if (isValidEmail && checkEmailExists) {
      setEmailChecking(true)
      try {
        const exists = await checkEmailExists(email)
        setEmailExists(exists)
      } catch (error) {
        console.error('Email check failed:', error)
        setEmailExists(false)
      } finally {
        setEmailChecking(false)
      }
    }
  }

  // Reset email exists state when email changes
  useEffect(() => {
    if (emailExists && email !== watch('email')) {
      setEmailExists(false)
    }
  }, [email, emailExists, watch])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="First Name"
          {...register('firstName')}
          error={errors.firstName?.message}
          placeholder="John"
          required
        />

        <Input
          label="Last Name"
          {...register('lastName')}
          error={errors.lastName?.message}
          placeholder="Doe"
          required
        />
      </div>

      <div>
        <Input
          label="Email Address"
          type="email"
          {...register('email')}
          error={errors.email?.message || emailExistsError}
          placeholder="john.doe@example.com"
          autoComplete="email"
          onBlur={handleEmailBlur}
          required
        />
        {emailBlurred && !errors.email && !emailExistsError && email && (
          <div className="mt-2 flex items-center gap-2 text-sm">
            {emailChecking ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-blue-600">Checking email...</span>
              </>
            ) : emailExists ? (
              <>
                <span className="text-red-600">✗</span>
                <span className="text-red-600">This email is already registered</span>
              </>
            ) : isValidEmail ? (
              <>
                <span className="text-green-600">✓</span>
                <span className="text-green-600">Email available</span>
              </>
            ) : (
              <>
                <span className="text-red-600">✗</span>
                <span className="text-red-600">Please enter a valid email address</span>
              </>
            )}
          </div>
        )}
        {(emailExistsError || emailExists) && (
          <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
            <span>⚠️</span>
            <span>{emailExistsError || 'This email address is already registered. Please use a different email or try logging in.'}</span>
          </div>
        )}
      </div>

      <Input
        label="Phone Number"
        {...register('phone')}
        error={errors.phone?.message}
        placeholder="+1 (555) 123-4567"
        autoComplete="tel"
        required
      />

      <div>
        <Input
          label="Password"
          type="password"
          {...register('password')}
          error={errors.password?.message}
          placeholder="Create a strong password"
          autoComplete="new-password"
          required
        />

        {password && (
          <div className="mt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Password Strength:</span>
              <span className={`text-sm ${passwordStrength.color}`}>
                {passwordStrength.label}
              </span>
            </div>
            <div className="mt-1 h-2 w-full rounded-full bg-gray-200">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  passwordStrength.strength <= 2
                    ? 'bg-red-500'
                    : passwordStrength.strength <= 3
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
              />
            </div>
            <div className="mt-2 text-xs text-gray-600 dark:text-gray-600">
              <p>Password must contain:</p>
              <ul className="mt-1 list-inside list-disc space-y-1">
                <li className={password.length >= 8 ? 'text-green-600' : 'text-gray-500'}>
                  At least 8 characters
                </li>
                <li className={/[a-z]/.test(password) ? 'text-green-600' : 'text-gray-500'}>
                  One lowercase letter
                </li>
                <li className={/[A-Z]/.test(password) ? 'text-green-600' : 'text-gray-500'}>
                  One uppercase letter
                </li>
                <li className={/\d/.test(password) ? 'text-green-600' : 'text-gray-500'}>
                  One number
                </li>
                <li className={/[^a-zA-Z\d]/.test(password) ? 'text-green-600' : 'text-gray-500'}>
                  Special character (recommended)
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <div>
        <Input
          label="Confirm Password"
          type="password"
          {...register('confirmPassword')}
          error={errors.confirmPassword?.message}
          placeholder="Confirm your password"
          autoComplete="new-password"
          required
        />

        {confirmPassword && (
          <div className="mt-2">
            <div className={`flex items-center gap-2 text-sm ${
              passwordsMatch ? 'text-green-600' : 'text-red-600'
            }`}>
              {passwordsMatch ? '✓' : '✗'}
              <span>
                {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
              </span>
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            {...register('acceptTerms')}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-600 dark:text-gray-600">
            I agree to the{' '}
            <a href="#" className="text-primary-600 hover:text-primary-700 underline">
              Terms and Conditions
            </a>{' '}
            and{' '}
            <a href="#" className="text-primary-600 hover:text-primary-700 underline">
              Privacy Policy
            </a>
          </span>
        </label>
        {errors.acceptTerms && (
          <p className="mt-1 text-sm text-red-600">{errors.acceptTerms.message}</p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full"
        loading={isSubmitting}
        disabled={isSubmitting || !!emailExistsError || emailExists}
      >
        {isSubmitting ? 'Creating Account...' : (emailExistsError || emailExists) ? 'Please fix errors to continue' : 'Create Account'}
      </Button>
    </form>
  )
}