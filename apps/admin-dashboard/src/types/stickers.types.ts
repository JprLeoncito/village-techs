export interface VehicleSticker {
  id: string
  tenant_id: string
  household_id: string
  vehicle_plate_number: string
  vehicle_make: string
  vehicle_model: string
  vehicle_color: string
  vehicle_type: 'car' | 'motorcycle' | 'suv' | 'van' | 'truck'
  or_cr_photo_url: string | null
  rfid_code: string | null
  request_date: string
  approval_date: string | null
  expiry_date: string | null
  status: 'requested' | 'approved' | 'active' | 'expiring' | 'expired' | 'rejected' | 'revoked'
  rejection_reason: string | null
  revocation_reason: string | null
  approved_by: string | null
  created_at: string
  updated_at: string
}

export interface ApproveSticker {
  sticker_id: string
  expiry_date: string
}

export interface RejectSticker {
  sticker_id: string
  rejection_reason: string
}

export interface RevokeSticker {
  sticker_id: string
  revocation_reason: string
}

export interface BulkApproveStickers {
  sticker_ids: string[]
  expiry_date: string
}
