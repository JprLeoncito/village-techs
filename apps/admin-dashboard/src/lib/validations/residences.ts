import { z } from 'zod'

export const residenceFormSchema = z.object({
  unit_number: z.string().min(1, 'Unit number is required'),
  type: z.enum(['single_family', 'townhouse', 'condo', 'apartment'], {
    required_error: 'Please select a residence type',
  }),
  max_occupancy: z.preprocess((val) => {
    const num = Number(val)
    return isNaN(num) ? undefined : num
  }, z.number({
    required_error: 'Max occupancy is required',
    invalid_type_error: 'Max occupancy must be a number',
  }).min(1, 'Max occupancy must be at least 1').max(20, 'Max occupancy cannot exceed 20')),
  floor_area: z.preprocess((val) => {
    const num = Number(val)
    return isNaN(num) ? undefined : num
  }, z.number({
    required_error: 'Floor area is required',
    invalid_type_error: 'Floor area must be a number',
  }).min(1, 'Floor area must be greater than 0')),
  })

export type ResidenceFormData = z.infer<typeof residenceFormSchema>