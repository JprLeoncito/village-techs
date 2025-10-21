export interface Household {
  id: string
  tenant_id: string
  residence_id: string
  household_head_id: string | null
  move_in_date: string
  move_out_date: string | null
  status: 'active' | 'inactive' | 'moved_out'
  contact_email: string | null
  contact_phone: string | null
  notes: string | null
  created_at: string
  updated_at: string
  residence?: Residence
  household_head?: {
    id: string
    first_name: string
    last_name: string
    relationship_to_head: string
    status: string
  }
}

export interface HouseholdMember {
  id: string
  tenant_id: string
  household_id: string
  user_id: string | null
  first_name: string
  last_name: string
  relationship_to_head: 'self' | 'spouse' | 'child' | 'parent' | 'sibling' | 'grandparent' | 'grandchild' | 'other'
  date_of_birth: string | null
  contact_email: string | null
  contact_phone: string | null
  member_type: 'resident' | 'beneficial_user'
  photo_url: string | null
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface Residence {
  id: string
  tenant_id: string
  unit_number: string
  type: 'single_family' | 'townhouse' | 'condo' | 'apartment'
  max_occupancy: number
  lot_area: number | null
  floor_area: number
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface CreateHouseholdInput {
  residence_id: string
  move_in_date: string
  contact_email?: string
  contact_phone?: string
}

export interface CreateMemberInput {
  household_id: string
  first_name: string
  last_name: string
  relationship_to_head: HouseholdMember['relationship_to_head']
  date_of_birth?: string
  contact_email?: string
  contact_phone?: string
  member_type: 'resident' | 'beneficial_user'
  photo_url?: string
}

export interface CreateResidenceInput {
  unit_number: string
  type: Residence['type']
  max_occupancy: number
  floor_area: number
  lot_area?: number
}

export interface ActivateHouseholdInput {
  householdId: string
  activationData: {
    move_in_date: string
    contact_email?: string
    contact_phone?: string
  }
  members: CreateMemberInput[]
}
