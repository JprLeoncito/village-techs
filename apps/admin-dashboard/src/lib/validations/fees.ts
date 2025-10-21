import { z } from 'zod'

export const feeFormSchema = z.object({
  household_id: z.string().uuid('Please select a household'),
  fee_type: z.enum(['monthly', 'quarterly', 'annual', 'special_assessment']),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  due_date: z.string().min(1, 'Due date is required'),
  notes: z.string().optional(),
})

export const paymentFormSchema = z.object({
  payment_date: z.string().min(1, 'Payment date is required'),
  payment_method: z.string().min(1, 'Payment method is required'),
  payment_reference: z.string().optional(),
})

export const waiverFormSchema = z.object({
  waiver_reason: z.string().min(10, 'Please provide a detailed reason (at least 10 characters)'),
})

export type FeeFormData = z.infer<typeof feeFormSchema>
export type PaymentFormData = z.infer<typeof paymentFormSchema>
export type WaiverFormData = z.infer<typeof waiverFormSchema>
