export interface GatePass {
  id: string;
  household_id: string;
  visitor_name: string;
  visitor_contact: string;
  visit_purpose: string;
  visit_date: string;
  visit_time: string;
  expected_departure: string;
  vehicle_details?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  notes?: string;
  qr_code?: string;
}

export interface GatePassRequest {
  visitor_name: string;
  visitor_contact: string;
  visit_purpose: string;
  visit_date: string;
  visit_time: string;
  expected_departure: string;
  vehicle_details?: string;
  notes?: string;
}

export interface GatePassFilter {
  status?: GatePass['status'];
  date_range?: {
    start: string;
    end: string;
  };
  search?: string;
}

export interface GatePassStatistics {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  completed: number;
  byPurpose: Record<string, number>;
}

export interface GatePassValidation {
  visitor_name: string;
  visitor_contact: string;
  visit_purpose: string;
  visit_date: string;
  visit_time: string;
  expected_departure: string;
  vehicle_details?: string;
  notes?: string;
}