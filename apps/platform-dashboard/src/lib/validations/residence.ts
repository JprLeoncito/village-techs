import { z } from 'zod'

export const residenceSchema = z.object({
  tenant_id: z.string().uuid('Invalid community ID'),
  unit_number: z.string().min(1, 'Unit number is required').max(100, 'Unit number too long'),
  type: z.enum(['single_family', 'townhouse', 'condo', 'apartment'], {
    errorMap: () => ({ message: 'Please select a residence type' }),
  }),
  max_occupancy: z.coerce
    .number()
    .int()
    .min(1, 'Max occupancy must be at least 1')
    .max(20, 'Max occupancy cannot exceed 20'),
    floor_area: z.coerce
    .number()
    .min(1, 'Floor area must be at least 1 square meter'),
})

export type ResidenceFormData = z.infer<typeof residenceSchema>

// CSV row validation (looser for import)
export const csvResidenceSchema = z.object({
  unit_number: z.string().min(1, 'Unit number is required'),
  type: z.enum(['single_family', 'townhouse', 'condo', 'apartment'], {
    errorMap: () => ({ message: 'Invalid type' }),
  }),
  max_occupancy: z.string().regex(/^\d+$/, 'Must be a number'),
    floor_area: z.string().regex(/^\d*\.?\d+$/, 'Must be a number'),
})

export type CSVResidenceRow = z.infer<typeof csvResidenceSchema>
