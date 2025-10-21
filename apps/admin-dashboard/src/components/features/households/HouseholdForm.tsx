import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { householdFormSchema, type HouseholdFormData } from '@/lib/validations/households'
import { useHouseholds } from '@/hooks/useHouseholds'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ResidenceSelector } from './ResidenceSelector'
import { Loader2 } from 'lucide-react'

interface HouseholdFormProps {
  onSuccess?: (householdId: string) => void
}

export function HouseholdForm({ onSuccess }: HouseholdFormProps) {
  const { createHousehold, isCreating } = useHouseholds()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<HouseholdFormData>({
    resolver: zodResolver(householdFormSchema),
  })

  const onSubmit = (data: HouseholdFormData) => {
    createHousehold(data, {
      onSuccess: (newHousehold) => {
        reset()
        onSuccess?.(newHousehold.id)
      },
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <ResidenceSelector
        value={watch('residence_id')}
        onChange={(value) => setValue('residence_id', value)}
        error={errors.residence_id?.message}
      />

      <div className="space-y-2">
        <Label htmlFor="move_in_date">Move-in Date *</Label>
        <Input
          id="move_in_date"
          type="date"
          {...register('move_in_date')}
          className={errors.move_in_date ? 'border-red-500' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'}
        />
        {errors.move_in_date && (
          <p className="text-sm text-red-500">{errors.move_in_date.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contact_email">Contact Email</Label>
          <Input
            id="contact_email"
            type="email"
            {...register('contact_email')}
            className={errors.contact_email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'}
          />
          {errors.contact_email && (
            <p className="text-sm text-red-500">{errors.contact_email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact_phone">Contact Phone</Label>
          <Input
            id="contact_phone"
            {...register('contact_phone')}
            className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => reset()}>
          Reset
        </Button>
        <Button type="submit" disabled={isCreating}>
          {isCreating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Household...
            </>
          ) : (
            'Create Household'
          )}
        </Button>
      </div>
    </form>
  )
}
