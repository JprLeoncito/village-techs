import { z } from 'zod'

export const approveSchema = z.object({
  expiry_date: z.string().min(1, 'Expiry date is required'),
})

export const rejectSchema = z.object({
  rejection_reason: z.string().min(10, 'Please provide a detailed reason (at least 10 characters)'),
})

export const revokeSchema = z.object({
  revocation_reason: z.string().min(10, 'Please provide a detailed reason (at least 10 characters)'),
})

export const bulkApproveSchema = z.object({
  expiry_date: z.string().min(1, 'Expiry date is required'),
})

export type ApproveFormData = z.infer<typeof approveSchema>
export type RejectFormData = z.infer<typeof rejectSchema>
export type RevokeFormData = z.infer<typeof revokeSchema>
export type BulkApproveFormData = z.infer<typeof bulkApproveSchema>
