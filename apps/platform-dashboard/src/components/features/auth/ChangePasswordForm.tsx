import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one lowercase letter, one uppercase letter, and one number'
      ),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>

interface ChangePasswordFormProps {
  onSubmit: (data: ChangePasswordFormData) => Promise<void>
  isSubmitting?: boolean
}

export function ChangePasswordForm({ onSubmit, isSubmitting }: ChangePasswordFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  })

  const newPassword = watch('newPassword')

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

  const passwordStrength = getPasswordStrength(newPassword || '')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Input
        label="Current Password"
        type="password"
        {...register('currentPassword')}
        error={errors.currentPassword?.message}
        placeholder="Enter your current password"
        autoComplete="current-password"
        required
      />

      <div>
        <Input
          label="New Password"
          type="password"
          {...register('newPassword')}
          error={errors.newPassword?.message}
          placeholder="Enter your new password"
          autoComplete="new-password"
          required
        />

        {newPassword && (
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
            <div className="mt-2 text-xs text-gray-600">
              <p>Password must contain:</p>
              <ul className="mt-1 list-inside list-disc space-y-1">
                <li className={newPassword.length >= 8 ? 'text-green-600' : 'text-gray-500'}>
                  At least 8 characters
                </li>
                <li className={/[a-z]/.test(newPassword) ? 'text-green-600' : 'text-gray-500'}>
                  One lowercase letter
                </li>
                <li className={/[A-Z]/.test(newPassword) ? 'text-green-600' : 'text-gray-500'}>
                  One uppercase letter
                </li>
                <li className={/\d/.test(newPassword) ? 'text-green-600' : 'text-gray-500'}>
                  One number
                </li>
                <li className={/[^a-zA-Z\d]/.test(newPassword) ? 'text-green-600' : 'text-gray-500'}>
                  Special character (recommended)
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <Input
        label="Confirm New Password"
        type="password"
        {...register('confirmPassword')}
        error={errors.confirmPassword?.message}
        placeholder="Confirm your new password"
        autoComplete="new-password"
        required
      />

      <div className="flex justify-end gap-3 border-t pt-6">
        <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
          {isSubmitting ? 'Changing Password...' : 'Change Password'}
        </Button>
      </div>
    </form>
  )
}