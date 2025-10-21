import { z } from 'zod'

export const announcementFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title is too long'),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  target_audience: z.enum(['all', 'households', 'security', 'admins'], {
    required_error: 'Please select a target audience',
  }),
  announcement_type: z.enum(['general', 'urgent', 'event', 'maintenance', 'fee_reminder', 'election'], {
    required_error: 'Please select an announcement type',
  }),
  publication_date: z.string().optional(),
  expiry_date: z.string().optional(),
}).refine(
  (data) => {
    if (data.publication_date && data.expiry_date) {
      return new Date(data.publication_date) < new Date(data.expiry_date)
    }
    return true
  },
  {
    message: 'Expiry date must be after publication date',
    path: ['expiry_date'],
  }
)

export const publishAnnouncementSchema = z.object({
  publication_date: z.string().optional(),
})

export type AnnouncementFormData = z.infer<typeof announcementFormSchema>
export type PublishAnnouncementFormData = z.infer<typeof publishAnnouncementSchema>
