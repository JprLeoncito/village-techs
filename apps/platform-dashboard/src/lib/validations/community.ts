import { z } from 'zod'

export const communitySchema = z.object({
  name: z.string().min(3, 'Community name must be at least 3 characters'),

  // Location fields
  location: z.string().min(1, 'Address is required'),

  // Contact fields
  contact_email: z.string().email('Invalid email address'),
  contact_phone: z.string().min(10, 'Phone number must be at least 10 digits'),

  // Subscription (optional)
  subscription_plan_id: z.string().uuid().optional(),

  
  // Logo (optional)
  logo: z
    .instanceof(File)
    .refine((file) => file.size <= 2 * 1024 * 1024, 'Logo must be under 2MB')
    .refine(
      (file) => ['image/png', 'image/jpeg', 'image/jpg'].includes(file.type),
      'Logo must be PNG or JPG'
    )
    .optional()
    .nullable(),
})

export type CommunityFormData = z.infer<typeof communitySchema>

export const adminUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  first_name: z.string().min(2, 'First name must be at least 2 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters'),
  role: z.enum(['admin_head', 'admin_officer'], {
    errorMap: () => ({ message: 'Please select a role' }),
  }),
  phone: z.string().optional(),
})

export type AdminUserFormData = z.infer<typeof adminUserSchema>
