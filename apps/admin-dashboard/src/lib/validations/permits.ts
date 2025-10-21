import { z } from 'zod'

export const approvePermitSchema = z.object({
  road_fee_amount: z.number().min(0, 'Road fee must be 0 or greater'),
  start_date: z.string().optional(),
})

export const rejectPermitSchema = z.object({
  rejection_reason: z.string().min(10, 'Please provide a detailed reason (at least 10 characters)'),
})

export const markInProgressSchema = z.object({
  start_date: z.string().min(1, 'Start date is required'),
})

export const markCompletedSchema = z.object({
  end_date: z.string().min(1, 'End date is required'),
})

export const createPermitSchema = z.object({
  household_id: z.string().uuid('Please select a household'),
  project_description: z.string().min(10, 'Project description must be at least 10 characters'),
  project_start_date: z.string().min(1, 'Project start date is required'),
  project_end_date: z.string().min(1, 'Project end date is required'),
  contractor_name: z.string().min(2, 'Contractor name must be at least 2 characters'),
  contractor_contact: z.string().optional(),
  contractor_license: z.string().optional(),
  estimated_worker_count: z.number().min(1, 'Estimated worker count must be at least 1'),
  road_fee_amount: z.number().min(0, 'Road fee must be 0 or greater').optional(),
  notes: z.string().optional(),
})

export type ApprovePermitFormData = z.infer<typeof approvePermitSchema>
export type RejectPermitFormData = z.infer<typeof rejectPermitSchema>
export type MarkInProgressFormData = z.infer<typeof markInProgressSchema>
export type MarkCompletedFormData = z.infer<typeof markCompletedSchema>
export type CreatePermitFormData = z.infer<typeof createPermitSchema>
