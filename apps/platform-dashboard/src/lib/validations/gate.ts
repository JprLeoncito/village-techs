import { z } from 'zod'

/**
 * Gate Type enum - must match database constraint
 */
export const gateTypes = ['vehicle', 'pedestrian', 'service', 'delivery'] as const

/**
 * Operating Hours Schema
 * Validates time format and ensures end time is after start time
 */
export const operatingHoursSchema = z.object({
  day_of_week: z.number().int().min(0).max(6), // 0 = Sunday, 6 = Saturday
  open_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  close_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  is_24_hours: z.boolean().default(false),
}).refine(
  (data) => {
    // If 24 hours, skip time validation
    if (data.is_24_hours) return true

    // Allow close time to be before open time (crosses midnight)
    return true
  },
  { message: 'Invalid operating hours' }
)

/**
 * GPS Coordinates Schema
 * Validates latitude and longitude ranges
 */
const coordinatesSchema = z.object({
  latitude: z.number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  longitude: z.number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
})

/**
 * Gate Form Data Schema
 * Used for creating and updating gates
 */
export const gateSchema = z.object({
  tenant_id: z.string().uuid('Invalid community ID'),
  name: z.string()
    .min(1, 'Gate name is required')
    .max(100, 'Gate name must be less than 100 characters'),
  type: z.enum(gateTypes, {
    errorMap: () => ({ message: 'Please select a valid gate type' })
  }),
  latitude: z.coerce.number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  longitude: z.coerce.number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .nullable()
    .optional(),
  is_active: z.boolean().default(true),
  operating_hours: z.array(operatingHoursSchema).optional(),
})

/**
 * Type exports
 */
export type GateFormData = z.infer<typeof gateSchema>
export type OperatingHours = z.infer<typeof operatingHoursSchema>
export type GateType = typeof gateTypes[number]

/**
 * Coordinate validation helper
 */
export function validateCoordinates(lat: number, lon: number): boolean {
  try {
    coordinatesSchema.parse({ latitude: lat, longitude: lon })
    return true
  } catch {
    return false
  }
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(lat: number, lon: number, precision = 6): string {
  return `${lat.toFixed(precision)}, ${lon.toFixed(precision)}`
}

/**
 * Day of week helper
 */
export const daysOfWeek = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
]
