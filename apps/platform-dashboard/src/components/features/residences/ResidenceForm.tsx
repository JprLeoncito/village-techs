import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { residenceSchema, type ResidenceFormData } from '@/lib/validations/residence'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { Database } from '@/types/database.types'

type Residence = Database['public']['Tables']['residences']['Row']

interface ResidenceFormProps {
  communityId: string
  onSubmit: (data: ResidenceFormData) => void
  onCancel: () => void
  isSubmitting?: boolean
  mode?: 'create' | 'edit'
  initialData?: Residence
}

const RESIDENCE_TYPES = [
  { value: 'single_family', label: 'Single Family Home' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'condo', label: 'Condominium' },
  { value: 'apartment', label: 'Apartment' },
]

export function ResidenceForm({
  communityId,
  onSubmit,
  onCancel,
  isSubmitting,
  mode = 'create',
  initialData,
}: ResidenceFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResidenceFormData>({
    resolver: zodResolver(residenceSchema),
    defaultValues: mode === 'edit' && initialData ? {
      tenant_id: communityId,
      unit_number: initialData.unit_number,
      type: initialData.type,
      max_occupancy: initialData.max_occupancy,
      floor_area: initialData.floor_area,
    } : {
      tenant_id: communityId,
      type: 'condo',
      max_occupancy: 4,
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <input type="hidden" {...register('tenant_id')} />

      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Unit Number"
          {...register('unit_number')}
          error={errors.unit_number?.message}
          placeholder="e.g., 101, A-205"
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Residence Type</label>
          <select
            {...register('type')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          >
            {RESIDENCE_TYPES.map((type) => (
              <option key={type.value} value={type.value} className="text-gray-900">
                {type.label}
              </option>
            ))}
          </select>
          {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>}
        </div>

        <Input
          label="Max Occupancy"
          type="number"
          {...register('max_occupancy')}
          error={errors.max_occupancy?.message}
          placeholder="4"
          min="1"
          max="20"
        />

        <Input
          label="Floor Area (sq m)"
          type="number"
          step="0.01"
          {...register('floor_area')}
          error={errors.floor_area?.message}
          placeholder="120.5"
        />

              </div>

      <div className="flex justify-end gap-3 border-t pt-6">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {mode === 'edit' ? 'Update Residence' : 'Add Residence'}
        </Button>
      </div>
    </form>
  )
}
