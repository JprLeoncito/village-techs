import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { communitySchema, type CommunityFormData } from '@/lib/validations/community'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { LogoUpload } from './LogoUpload'

interface CommunityFormProps {
  onSubmit: (data: CommunityFormData) => void
  isSubmitting?: boolean
}


export function CommunityForm({ onSubmit, isSubmitting }: CommunityFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CommunityFormData>({
    resolver: zodResolver(communitySchema),
    defaultValues: {},
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Information */}
      <div>
        <h3 className="text-lg font-semibold">Basic Information</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Input
              label="Community Name"
              {...register('name')}
              error={errors.name?.message}
              placeholder="e.g., Sunset Valley HOA"
            />
          </div>

          <div className="md:col-span-2">
            <Input
              label="Address"
              {...register('location')}
              error={errors.location?.message}
              placeholder="e.g., 123 Main Street, City, State, ZIP"
            />
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div>
        <h3 className="text-lg font-semibold">Contact Information</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Input
            label="Email"
            type="email"
            {...register('contact_email')}
            error={errors.contact_email?.message}
            placeholder="contact@community.com"
          />

          <Input
            label="Phone"
            {...register('contact_phone')}
            error={errors.contact_phone?.message}
            placeholder="+1 (555) 123-4567"
          />
        </div>
      </div>

  
      {/* Logo Upload */}
      <div>
        <h3 className="text-lg font-semibold">Community Logo (Optional)</h3>
        <div className="mt-4">
          <LogoUpload
            onChange={(file) => setValue('logo', file)}
            error={errors.logo?.message as string}
          />
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-3 border-t pt-6">
        <Button type="button" variant="secondary">
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Create Community
        </Button>
      </div>
    </form>
  )
}
