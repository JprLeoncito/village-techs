export interface GateEntry {
  id: string
  tenant_id: string
  entry_type: 'visitor' | 'resident' | 'service' | 'delivery'
  direction: 'in' | 'out'
  visitor_name: string | null
  visitor_contact: string | null
  visiting_household_id: string | null
  vehicle_plate: string | null
  purpose: string | null
  officer_on_duty_id: string
  entry_time: string
  exit_time: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Incident {
  id: string
  tenant_id: string
  incident_type: 'suspicious_activity' | 'unauthorized_entry' | 'disturbance' | 'emergency' | 'property_damage' | 'other'
  description: string
  location: string | null
  reported_by: string
  household_id: string | null
  incident_timestamp: string
  resolution_status: 'open' | 'investigating' | 'resolved' | 'closed'
  resolution_notes: string | null
  resolved_by: string | null
  resolved_at: string | null
  gate_id: string | null
  attachment_urls: any | null
  created_at: string
  updated_at: string
}

export interface SecurityOfficer {
  id: string
  tenant_id: string
  user_id: string
  badge_number: string
  shift: 'day' | 'night' | 'flexible'
  status: 'active' | 'on_leave' | 'inactive'
  hire_date: string
  contact_number: string
  emergency_contact: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CreateGateEntryInput {
  entry_type: 'visitor' | 'resident' | 'service' | 'delivery'
  direction: 'in' | 'out'
  visitor_name?: string
  visitor_contact?: string
  visiting_household_id?: string
  vehicle_plate?: string
  purpose?: string
  notes?: string
}

export interface UpdateGateEntryInput {
  entry_id: string
  exit_time?: string
  notes?: string
}

export interface CreateIncidentInput {
  incident_type: 'suspicious_activity' | 'unauthorized_entry' | 'disturbance' | 'emergency' | 'property_damage' | 'other'
  description: string
  location?: string
  household_id?: string
  incident_time: string
}

export interface UpdateIncidentInput {
  incident_id: string
  status?: 'reported' | 'investigating' | 'resolved' | 'closed'
  assigned_to_id?: string
  resolution_notes?: string
  resolved_time?: string
}

export interface GateStats {
  total_entries_today: number
  total_visitors_today: number
  total_residents_today: number
  active_officers: number
  open_incidents: number
}
