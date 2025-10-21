export interface ConstructionPermit {
  id: string
  tenant_id: string
  household_id: string
  project_description: string
  project_type: 'renovation' | 'addition' | 'repair' | 'landscaping' | 'other'
  estimated_duration_days: number
  contractor_name: string | null
  contractor_contact: string | null
  number_of_workers: number
  start_date: string | null
  end_date: string | null
  status: 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed'
  road_fee_amount: number | null
  road_fee_paid: boolean
  road_fee_payment_date: string | null
  approval_date: string | null
  rejection_reason: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ApprovePermitInput {
  permit_id: string
  road_fee_amount: number
  start_date?: string
}

export interface RejectPermitInput {
  permit_id: string
  rejection_reason: string
}

export interface MarkInProgressInput {
  permit_id: string
  start_date: string
}

export interface MarkCompletedInput {
  permit_id: string
  end_date: string
}
