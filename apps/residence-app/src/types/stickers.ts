export interface VehicleSticker {
  id: string;
  household_id: string;
  vehicle_type: 'car' | 'motorcycle' | 'bicycle' | 'electric_bike' | 'other';
  vehicle_make: string;
  vehicle_model: string;
  vehicle_color: string;
  license_plate: string;
  or_number?: string;
  cr_number?: string;
  status: 'pending' | 'approved' | 'rejected' | 'issued' | 'expired' | 'revoked';
  issued_date?: string;
  expiry_date?: string;
  sticker_number?: string;
  qr_code?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  approved_by?: string;
  approved_at?: string;
  documents?: VehicleDocument[];
}

export interface VehicleDocument {
  id: string;
  sticker_id: string;
  document_type: 'or' | 'cr' | 'deed_of_sale' | 'authorization' | 'government_id' | 'other';
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
}

export interface StickerRequest {
  vehicle_type: 'car' | 'motorcycle' | 'bicycle' | 'electric_bike' | 'other';
  vehicle_make: string;
  vehicle_model: string;
  vehicle_color: string;
  license_plate: string;
  or_number?: string;
  cr_number?: string;
  documents: {
    document_type: 'or' | 'cr' | 'deed_of_sale' | 'authorization' | 'government_id' | 'other';
    file: {
      uri: string;
      name: string;
      type: string;
    };
  }[];
}

export interface StickerRequestValidation {
  isValid: boolean;
  errors: {
    field?: string;
    message: string;
  }[];
}

export interface StickerStatistics {
  total: number;
  pending: number;
  approved: number;
  issued: number;
  expired: number;
  byType: Record<string, number>;
}

export interface StickerFilter {
  status?: VehicleSticker['status'];
  vehicle_type?: VehicleSticker['vehicle_type'];
  date_range?: {
    start: string;
    end: string;
  };
  search?: string;
}