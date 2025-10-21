import { z } from 'zod'

export const householdFormSchema = z.object({
  residence_id: z.string().uuid('Please select a residence'),
  move_in_date: z.string().min(1, 'Move-in date is required'),
  contact_email: z.string().email('Invalid email').optional().or(z.literal('')),
  contact_phone: z.string().optional(),
})

export const householdActivationSchema = z.object({
  move_in_date: z.string().min(1, 'Move-in date is required'),
  contact_email: z.string().email('Invalid email').optional().or(z.literal('')),
  contact_phone: z.string().optional(),
})

export const memberFormSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  relationship_to_head: z.enum(['self', 'spouse', 'child', 'parent', 'sibling', 'grandparent', 'grandchild', 'other']),
  date_of_birth: z.string().optional(),
  contact_email: z.string().email('Invalid email').optional().or(z.literal('')),
  contact_phone: z.string().optional(),
  member_type: z.enum(['resident', 'beneficial_user']),
})

export type HouseholdFormData = z.infer<typeof householdFormSchema>
export type HouseholdActivationData = z.infer<typeof householdActivationSchema>
export type MemberFormData = z.infer<typeof memberFormSchema>
