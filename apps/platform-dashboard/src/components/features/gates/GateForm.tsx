import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { OperatingHoursInput } from './OperatingHoursInput'
import { gateSchema, gateTypes, formatCoordinates, type GateFormData, type OperatingHours } from '@/lib/validations/gate'
import { MapPinIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'

interface GateFormProps {
  communityId: string
  initialData?: Partial<GateFormData>
  onSubmit: (data: GateFormData) => Promise<void> | void
  onCancel: () => void
  isSubmitting?: boolean
}

export function GateForm({
  communityId,
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: GateFormProps) {
  const [operatingHours, setOperatingHours] = useState<OperatingHours[]>(
    initialData?.operating_hours || []
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<GateFormData>({
    resolver: zodResolver(gateSchema),
    defaultValues: {
      tenant_id: communityId,
      name: initialData?.name || '',
      type: initialData?.type || 'vehicle',
      latitude: initialData?.latitude || 0,
      longitude: initialData?.longitude || 0,
      description: initialData?.description || '',
      is_active: initialData?.is_active ?? true,
      operating_hours: initialData?.operating_hours || [],
    },
  })

  const latitude = watch('latitude')
  const longitude = watch('longitude')

  const handleFormSubmit = (data: GateFormData) => {
    onSubmit({ ...data, operating_hours: operatingHours })
  }

  const handleUseCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setValue('latitude', position.coords.latitude)
          setValue('longitude', position.coords.longitude)
        },
        (error) => {
          console.error('Error getting location:', error)
          alert('Unable to get your current location. Please enter coordinates manually.')
        }
      )
    } else {
      alert('Geolocation is not supported by your browser.')
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Basic Information */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
        <div className="space-y-4">
          <Input
            label="Gate Name"
            {...register('name')}
            error={errors.name?.message}
            placeholder="e.g., Main Entrance, North Gate"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gate Type <span className="text-red-500">*</span>
            </label>
            <select
              {...register('type')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            >
              {gateTypes.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
            {errors.type && (
              <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              placeholder="Optional description or notes about this gate"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              {...register('is_active')}
              className="h-4 w-4 rounded text-primary-600"
            />
            <label className="text-sm font-medium text-gray-900">
              Gate is active
            </label>
          </div>
        </div>
      </div>

      {/* GPS Coordinates */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">GPS Coordinates</h3>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleUseCurrentLocation}
          >
            <MapPinIcon className="h-4 w-4" />
            Use Current Location
          </Button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Latitude"
              type="number"
              step="any"
              {...register('latitude', { valueAsNumber: true })}
              error={errors.latitude?.message}
              placeholder="e.g., 14.5995"
              required
            />
            <Input
              label="Longitude"
              type="number"
              step="any"
              {...register('longitude', { valueAsNumber: true })}
              error={errors.longitude?.message}
              placeholder="e.g., 120.9842"
              required
            />
          </div>

          {latitude !== 0 && longitude !== 0 && (
            <div className="rounded-lg bg-blue-50 p-3">
              <div className="flex items-start gap-2">
                <InformationCircleIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <strong>Coordinates:</strong> {formatCoordinates(latitude, longitude)}
                  <br />
                  <a
                    href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-blue-900"
                  >
                    View on Google Maps
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Operating Hours */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Operating Hours</h3>
        <OperatingHoursInput
          value={operatingHours}
          onChange={setOperatingHours}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 border-t pt-6">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {initialData ? 'Update Gate' : 'Create Gate'}
        </Button>
      </div>
    </form>
  )
}
