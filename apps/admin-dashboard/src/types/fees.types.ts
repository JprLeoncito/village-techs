export interface AssociationFee {
  id: string
  tenant_id: string
  household_id: string
  fee_type: 'monthly' | 'quarterly' | 'annual' | 'special_assessment'
  amount: number
  due_date: string
  payment_status: 'unpaid' | 'paid' | 'overdue' | 'waived'
  payment_date: string | null
  payment_method: string | null
  payment_reference: string | null
  waiver_reason: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CreateFeeInput {
  household_id: string
  fee_type: 'monthly' | 'quarterly' | 'annual' | 'special_assessment'
  amount: number
  due_date: string
  notes?: string
}

export interface RecordPaymentInput {
  fee_id: string
  payment_date: string
  payment_method: string
  payment_reference?: string
}

export interface WaiveFeeInput {
  fee_id: string
  waiver_reason: string
}
