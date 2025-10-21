import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { adminUserSchema, type AdminUserFormData } from '@/lib/validations/community'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { AdminUserWithEmail } from '@/hooks/useAdminUsers'

interface AdminUserFormProps {
  onSubmit: (data: AdminUserFormData) => void
  isSubmitting?: boolean
  defaultRole?: 'admin_head' | 'admin_officer'
  hideButtons?: boolean
  formId?: string
  mode?: 'create' | 'edit'
  initialData?: AdminUserWithEmail
}

export function AdminUserForm({
  onSubmit,
  isSubmitting,
  defaultRole = 'admin_head',
  hideButtons = false,
  formId = 'admin-user-form',
  mode = 'create',
  initialData,
}: AdminUserFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminUserFormData>({
    resolver: zodResolver(adminUserSchema),
    defaultValues: mode === 'edit' && initialData ? {
      first_name: initialData.first_name,
      last_name: initialData.last_name,
      email: initialData.email,
      phone: initialData.phone || '',
      role: initialData.role,
    } : {
      role: defaultRole,
    },
  })

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">
          {mode === 'edit' ? 'Edit Admin User' : 'Initial Admin User'}
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          {mode === 'edit'
            ? 'Update the admin user details below'
            : 'This user will receive an email with temporary login credentials'
          }
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="First Name"
          {...register('first_name')}
          error={errors.first_name?.message}
          placeholder="John"
        />

        <Input
          label="Last Name"
          {...register('last_name')}
          error={errors.last_name?.message}
          placeholder="Doe"
        />

        <Input
          label="Email Address"
          type="email"
          {...register('email')}
          error={errors.email?.message}
          placeholder="admin@community.com"
          disabled={mode === 'edit'}
        />

        <Input
          label="Phone (Optional)"
          {...register('phone')}
          error={errors.phone?.message}
          placeholder="+1 (555) 123-4567"
        />

        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">Role</label>
          <select
            {...register('role')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="admin_head" className="text-gray-900">Admin Head (Primary Administrator)</option>
            <option value="admin_officer" className="text-gray-900">Admin Officer (Supporting Administrator)</option>
          </select>
          {errors.role && <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>}
        </div>
      </div>

      {mode === 'create' && (
        <div className="rounded-lg bg-blue-50 p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> A temporary password will be automatically generated and sent to the
            admin's email address. They will be prompted to change it on first login.
          </p>
        </div>
      )}

      {/* Submit Button */}
      {!hideButtons && (
        <div className="flex justify-end gap-3 border-t pt-6">
          <Button type="button" variant="secondary" onClick={() => window.history.back()}>
            Back
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {mode === 'edit' ? 'Update Admin User' : 'Create Community & Admin'}
          </Button>
        </div>
      )}
    </form>
  )
}
