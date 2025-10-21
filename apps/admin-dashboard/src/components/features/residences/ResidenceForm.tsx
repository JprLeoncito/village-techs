import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { residenceFormSchema, type ResidenceFormData } from '@/lib/validations/residences'
import { useResidences } from '@/hooks/useResidences'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

interface ResidenceFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

const RESIDENCE_TYPES = [
  { value: 'single_family', label: 'Single Family Home' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'condo', label: 'Condominium' },
  { value: 'apartment', label: 'Apartment' },
]

export function ResidenceForm({ onSuccess, onCancel }: ResidenceFormProps) {
  const { createResidence, isCreating } = useResidences()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ResidenceFormData>({
    resolver: zodResolver(residenceFormSchema),
    defaultValues: {
      type: 'condo',
      max_occupancy: 4,
    },
  })

  const onSubmit = (data: ResidenceFormData) => {
    createResidence(data, {
      onSuccess: () => {
        reset()
        onSuccess?.()
      },
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="unit_number">Unit Number *</Label>
        <Input
          id="unit_number"
          placeholder="e.g., 101, A-205"
          {...register('unit_number')}
          className={errors.unit_number ? 'border-red-500' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'}
        />
        {errors.unit_number && (
          <p className="text-sm text-red-500">{errors.unit_number.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Residence Type *</Label>
        <select
          id="type"
          {...register('type')}
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        >
          {RESIDENCE_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        {errors.type && (
          <p className="text-sm text-red-500">{errors.type.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="max_occupancy">Max Occupancy *</Label>
          <Input
            id="max_occupancy"
            type="number"
            min="1"
            max="20"
            placeholder="4"
            {...register('max_occupancy', {
              valueAsNumber: true,
              setValueAs: (v) => v === '' ? undefined : Number(v)
            })}
            className={errors.max_occupancy ? 'border-red-500' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'}
          />
          {errors.max_occupancy && (
            <p className="text-sm text-red-500">{errors.max_occupancy.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="floor_area">Floor Area (m²) *</Label>
          <Input
            id="floor_area"
            type="number"
            step="0.01"
            placeholder="120.5"
            {...register('floor_area', {
              valueAsNumber: true,
              setValueAs: (v) => v === '' ? undefined : Number(v)
            })}
            className={errors.floor_area ? 'border-red-500' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'}
          />
          {errors.floor_area && (
            <p className="text-sm text-red-500">{errors.floor_area.message}</p>
          )}
        </div>
      </div>

      
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="button" variant="outline" onClick={() => reset()}>
          Reset
        </Button>
        <Button type="submit" disabled={isCreating}>
          {isCreating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Residence...
            </>
          ) : (
            'Create Residence'
          )}
        </Button>
      </div>
    </form>
  )
}