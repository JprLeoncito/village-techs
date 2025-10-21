import { z } from 'zod'

export const gateEntryFormSchema = z.object({
  entry_type: z.enum(['vehicle', 'pedestrian', 'delivery', 'visitor'], {
    required_error: 'Please select an entry type',
  }),
  gate_id: z.string().uuid().optional(),
  vehicle_plate: z.string().optional(),
  sticker_id: z.string().uuid().optional(),
  household_id: z.string().uuid().optional(),
  notes: z.string().optional(),
})

export const exitGateEntrySchema = z.object({
  exit_timestamp: z.string().min(1, 'Exit time is required'),
  notes: z.string().optional(),
})

export const incidentFormSchema = z.object({
  incident_type: z.enum(['suspicious_activity', 'unauthorized_entry', 'disturbance', 'emergency', 'property_damage', 'other'], {
    required_error: 'Please select an incident type',
  }),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  location: z.string().optional(),
  household_id: z.string().uuid().optional(),
  incident_time: z.string().min(1, 'Incident time is required'),
})

export const updateIncidentSchema = z.object({
  status: z.enum(['reported', 'investigating', 'resolved', 'closed']).optional(),
  assigned_to_id: z.string().uuid().optional(),
  resolution_notes: z.string().optional(),
  resolved_time: z.string().optional(),
})

export type GateEntryFormData = z.infer<typeof gateEntryFormSchema>
export type ExitGateEntryFormData = z.infer<typeof exitGateEntrySchema>
export type IncidentFormData = z.infer<typeof incidentFormSchema>
export type UpdateIncidentFormData = z.infer<typeof updateIncidentSchema>
