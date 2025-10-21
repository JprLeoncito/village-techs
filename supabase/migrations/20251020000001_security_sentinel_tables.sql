-- =========================================
-- SECURITY SENTINEL APP TABLES
-- Additional tables required for the Sentinel Security mobile app
-- =========================================

-- This migration adds security-specific tables and updates existing ones
-- to support the Sentinel Security mobile app functionality

-- =========================================
-- TABLE: security_shifts (Enhanced)
-- =========================================
-- Note: This extends or creates the security shifts table for officer management

CREATE TABLE IF NOT EXISTS security_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  officer_id UUID REFERENCES auth.users(id),
  gate_id UUID NOT NULL REFERENCES gates(id),
  shift_start TIMESTAMPTZ NOT NULL,
  shift_end TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_shifts_tenant ON security_shifts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_security_shifts_officer ON security_shifts(officer_id);
CREATE INDEX IF NOT EXISTS idx_security_shifts_gate ON security_shifts(gate_id);
CREATE INDEX IF NOT EXISTS idx_security_shifts_status ON security_shifts(tenant_id, status);

-- Create trigger for updated_at (using standard syntax)
DO $$
BEGIN
  -- Drop trigger if it exists
  DROP TRIGGER IF EXISTS update_security_shifts_updated_at ON security_shifts;

  -- Create new trigger
  CREATE TRIGGER update_security_shifts_updated_at
    BEFORE UPDATE ON security_shifts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END $$;

-- =========================================
-- TABLE: gate_entries (Enhanced for Sentinel)
-- =========================================
-- Note: This enhances the existing gate_entries table with additional fields

-- Add new columns to existing gate_entries table if they don't exist
DO $$
BEGIN
  -- Check if column exists before adding
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gate_entries' AND column_name = 'exit_timestamp'
  ) THEN
    ALTER TABLE gate_entries ADD COLUMN exit_timestamp TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gate_entries' AND column_name = 'direction'
  ) THEN
    ALTER TABLE gate_entries ADD COLUMN direction TEXT NOT NULL DEFAULT 'in' CHECK (direction IN ('in', 'out'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gate_entries' AND column_name = 'household_name'
  ) THEN
    ALTER TABLE gate_entries ADD COLUMN household_name TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gate_entries' AND column_name = 'visitor_name'
  ) THEN
    ALTER TABLE gate_entries ADD COLUMN visitor_name TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gate_entries' AND column_name = 'contact_number'
  ) THEN
    ALTER TABLE gate_entries ADD COLUMN contact_number TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gate_entries' AND column_name = 'purpose'
  ) THEN
    ALTER TABLE gate_entries ADD COLUMN purpose TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gate_entries' AND column_name = 'photos'
  ) THEN
    ALTER TABLE gate_entries ADD COLUMN photos TEXT[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gate_entries' AND column_name = 'security_officer_name'
  ) THEN
    ALTER TABLE gate_entries ADD COLUMN security_officer_name TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gate_entries' AND column_name = 'linked_entry_id'
  ) THEN
    ALTER TABLE gate_entries ADD COLUMN linked_entry_id UUID REFERENCES gate_entries(id);
  END IF;
END $$;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_gate_entries_direction ON gate_entries(direction);
CREATE INDEX IF NOT EXISTS idx_gate_entries_exit_timestamp ON gate_entries(exit_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_gate_entries_linked ON gate_entries(linked_entry_id);

-- =========================================
-- TABLE: guest_access_logs
-- =========================================

CREATE TABLE IF NOT EXISTS guest_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID REFERENCES scheduled_guests(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id),
  check_in_timestamp TIMESTAMPTZ NOT NULL,
  check_out_timestamp TIMESTAMPTZ,
  security_officer_id UUID REFERENCES auth.users(id),
  verification_method TEXT, -- manual, phone, qr, walk_in
  verification_notes TEXT,
  verification_photos TEXT[] DEFAULT '{}',
  departure_notes TEXT,
  departure_photos TEXT[] DEFAULT '{}',
  checkout_officer_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guest_access_logs_guest_id ON guest_access_logs(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_access_logs_tenant ON guest_access_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_guest_access_logs_household ON guest_access_logs(household_id);
CREATE INDEX IF NOT EXISTS idx_guest_access_logs_check_in ON guest_access_logs(check_in_timestamp DESC);

-- Create trigger for updated_at
DO $$
BEGIN
  -- Drop trigger if it exists
  DROP TRIGGER IF EXISTS update_guest_access_logs_updated_at ON guest_access_logs;

  -- Create new trigger
  CREATE TRIGGER update_guest_access_logs_updated_at
    BEFORE UPDATE ON guest_access_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END $$;

-- =========================================
-- TABLE: deliveries
-- =========================================

CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  tracking_number TEXT,
  delivery_company TEXT NOT NULL,
  delivery_person_name TEXT NOT NULL,
  delivery_person_contact TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  household_id UUID NOT NULL REFERENCES households(id),
  household_name TEXT NOT NULL,
  unit_number TEXT,
  delivery_type TEXT NOT NULL CHECK (delivery_type IN ('package', 'food', 'document', 'furniture', 'other')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'at_gate', 'handed_off', 'picked_up', 'returned')),
  special_instructions TEXT,
  photos TEXT[] DEFAULT '{}',
  notes TEXT,
  gate_entry_id UUID REFERENCES gate_entries(id),
  security_officer_id UUID REFERENCES auth.users(id),
  security_officer_name TEXT,

  -- Handoff information
  recipient_contact TEXT,
  recipient_relationship TEXT,
  handoff_timestamp TIMESTAMPTZ,
  handoff_notes TEXT,
  handoff_photos TEXT[] DEFAULT '{}',

  -- Return information
  return_reason TEXT,
  return_timestamp TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliveries_tenant ON deliveries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_household ON deliveries(household_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_tracking_number ON deliveries(tracking_number);
CREATE INDEX IF NOT EXISTS idx_deliveries_delivery_company ON deliveries(delivery_company);
CREATE INDEX IF NOT EXISTS idx_deliveries_created_at ON deliveries(created_at DESC);

-- Create trigger for updated_at
DO $$
BEGIN
  -- Drop trigger if it exists
  DROP TRIGGER IF EXISTS update_deliveries_updated_at ON deliveries;

  -- Create new trigger
  CREATE TRIGGER update_deliveries_updated_at
    BEFORE UPDATE ON deliveries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END $$;

-- =========================================
-- ENHANCE VEHICLE_STICKERS FOR SENTINEL
-- =========================================

-- Add missing columns to vehicle_stickers if they don't exist
DO $$
BEGIN
  -- Check and add member_names array
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicle_stickers' AND column_name = 'member_names'
  ) THEN
    ALTER TABLE vehicle_stickers ADD COLUMN member_names TEXT[] DEFAULT '{}';
  END IF;

  -- Check and add expiry_date if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicle_stickers' AND column_name = 'expiry_date'
  ) THEN
    ALTER TABLE vehicle_stickers ADD COLUMN expiry_date DATE;
  END IF;
END $$;

-- =========================================
-- RLS POLICIES FOR NEW TABLES
-- =========================================

-- Enable RLS on new tables
ALTER TABLE security_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

-- Security shifts policies
CREATE POLICY "Security officers can view own shifts" ON security_shifts
FOR SELECT USING (
  tenant_id = (auth.jwt() ->> 'tenant_id')::UUID
  AND officer_id = auth.uid()
);

CREATE POLICY "Security can view all shifts in tenant" ON security_shifts
FOR SELECT USING (
  tenant_id = (auth.jwt() ->> 'tenant_id')::UUID
  AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin_head', 'admin_officer', 'security')
);

CREATE POLICY "Security can create shifts" ON security_shifts
FOR INSERT WITH CHECK (
  tenant_id = (auth.jwt() ->> 'tenant_id')::UUID
  AND officer_id = auth.uid()
);

CREATE POLICY "Security can update own shifts" ON security_shifts
FOR UPDATE USING (
  tenant_id = (auth.jwt() ->> 'tenant_id')::UUID
  AND officer_id = auth.uid()
);

-- Guest access logs policies
CREATE POLICY "Security can view guest access logs" ON guest_access_logs
FOR SELECT USING (
  tenant_id = (auth.jwt() ->> 'tenant_id')::UUID
  AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin_head', 'admin_officer', 'security')
);

CREATE POLICY "Security can create guest access logs" ON guest_access_logs
FOR INSERT WITH CHECK (
  tenant_id = (auth.jwt() ->> 'tenant_id')::UUID
  AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin_head', 'admin_officer', 'security')
);

CREATE POLICY "Security can update guest access logs" ON guest_access_logs
FOR UPDATE USING (
  tenant_id = (auth.jwt() ->> 'tenant_id')::UUID
  AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin_head', 'admin_officer', 'security')
);

-- Deliveries policies
CREATE POLICY "Security can view deliveries" ON deliveries
FOR SELECT USING (
  tenant_id = (auth.jwt() ->> 'tenant_id')::UUID
  AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin_head', 'admin_officer', 'security')
);

CREATE POLICY "Security can create deliveries" ON deliveries
FOR INSERT WITH CHECK (
  tenant_id = (auth.jwt() ->> 'tenant_id')::UUID
  AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin_head', 'admin_officer', 'security')
);

CREATE POLICY "Security can update deliveries" ON deliveries
FOR UPDATE USING (
  tenant_id = (auth.jwt() ->> 'tenant_id')::UUID
  AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin_head', 'admin_officer', 'security')
);

-- =========================================
-- SECURITY OFFICER ROLE CREATION
-- =========================================

-- Create a function to register security officers
CREATE OR REPLACE FUNCTION register_security_officer(
  p_email TEXT,
  p_name TEXT,
  p_phone TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id TEXT;
  v_user_id UUID;
BEGIN
  v_tenant_id := auth.jwt() ->> 'tenant_id';

  -- Check if user has admin rights
  IF (auth.jwt() -> 'app_metadata' ->> 'role') NOT IN ('admin_head', 'superadmin') THEN
    RAISE EXCEPTION 'Only admin_head can register security officers';
  END IF;

  -- Insert into auth.users and admin_users
  INSERT INTO admin_users (tenant_id, email, role, first_name, phone)
  VALUES (v_tenant_id::UUID, p_email, 'admin_officer', p_name, p_phone)
  RETURNING id INTO v_user_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'user_id', v_user_id,
    'message', 'Security officer registered successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================
-- VIEWS FOR SECURITY DASHBOARD
-- =========================================

CREATE OR REPLACE VIEW security_dashboard AS
SELECT
  s.tenant_id,
  COUNT(*) FILTER (WHERE s.status = 'active') AS active_shifts,
  COUNT(*) FILTER (WHERE ge.created_at >= CURRENT_DATE) AS today_entries,
  COUNT(*) FILTER (WHERE ga.created_at >= CURRENT_DATE) AS today_guests,
  COUNT(*) FILTER (WHERE d.created_at >= CURRENT_DATE) AS today_deliveries,
  COUNT(*) FILTER (WHERE vs.status = 'active') AS active_stickers
FROM communities c
LEFT JOIN security_shifts s ON s.tenant_id = c.id AND s.status = 'active'
LEFT JOIN gate_entries ge ON ge.tenant_id = c.id AND ge.created_at >= CURRENT_DATE
LEFT JOIN guest_access_logs ga ON ga.tenant_id = c.id AND ga.created_at >= CURRENT_DATE
LEFT JOIN deliveries d ON d.tenant_id = c.id AND d.created_at >= CURRENT_DATE
LEFT JOIN vehicle_stickers vs ON vs.tenant_id = c.id AND vs.status = 'active' AND vs.deleted_at IS NULL
WHERE c.id = (auth.jwt() ->> 'tenant_id')::UUID
GROUP BY s.tenant_id;

-- =========================================
-- RPC FUNCTIONS FOR SECURITY OPERATIONS
-- =========================================

-- Function to log gate entry
CREATE OR REPLACE FUNCTION log_gate_entry(
  p_gate_id UUID,
  p_entry_type TEXT,
  p_vehicle_plate TEXT,
  p_rfid_code TEXT,
  p_household_name TEXT,
  p_visitor_name TEXT,
  p_contact_number TEXT,
  p_purpose TEXT,
  p_direction TEXT DEFAULT 'in',
  p_photos TEXT[] DEFAULT '{}',
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_tenant_id TEXT;
  v_entry_id UUID;
BEGIN
  v_tenant_id := auth.jwt() ->> 'tenant_id';

  INSERT INTO gate_entries (
    tenant_id,
    gate_id,
    entry_timestamp,
    direction,
    entry_type,
    vehicle_plate,
    sticker_id,
    household_name,
    visitor_name,
    contact_number,
    purpose,
    photos,
    notes,
    security_officer_id,
    security_officer_name
  )
  VALUES (
    v_tenant_id::UUID,
    p_gate_id,
    NOW(),
    p_direction,
    p_entry_type,
    p_vehicle_plate,
    (SELECT id FROM vehicle_stickers WHERE rfid_code = p_rfid_code AND tenant_id::TEXT = v_tenant_id LIMIT 1),
    p_household_name,
    p_visitor_name,
    p_contact_number,
    p_purpose,
    p_photos,
    p_notes,
    auth.uid(),
    auth.jwt() ->> 'name'
  )
  RETURNING id INTO v_entry_id;

  RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record guest check-in
CREATE OR REPLACE FUNCTION check_in_guest(
  p_guest_id UUID,
  p_verification_method TEXT,
  p_verification_notes TEXT,
  p_verification_photos TEXT[]
)
RETURNS UUID AS $$
DECLARE
  v_tenant_id TEXT;
  v_log_id UUID;
BEGIN
  v_tenant_id := auth.jwt() ->> 'tenant_id';

  INSERT INTO guest_access_logs (
    guest_id,
    tenant_id,
    household_id,
    check_in_timestamp,
    security_officer_id,
    verification_method,
    verification_notes,
    verification_photos
  )
  SELECT
    p_guest_id,
    v_tenant_id::UUID,
    household_id,
    NOW(),
    auth.uid(),
    p_verification_method,
    p_verification_notes,
    p_verification_photos
  FROM scheduled_guests
  WHERE id = p_guest_id AND tenant_id::TEXT = v_tenant_id
  RETURNING id INTO v_log_id;

  -- Update scheduled guest status
  UPDATE scheduled_guests
  SET
    status = 'checked_in',
    checked_in_at = NOW(),
    updated_at = NOW()
  WHERE id = p_guest_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record delivery handoff
CREATE OR REPLACE FUNCTION handoff_delivery(
  p_delivery_id UUID,
  p_recipient_name TEXT,
  p_recipient_contact TEXT,
  p_recipient_relationship TEXT,
  p_handoff_notes TEXT,
  p_handoff_photos TEXT[]
)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id TEXT;
BEGIN
  v_tenant_id := auth.jwt() ->> 'tenant_id';

  UPDATE deliveries
  SET
    status = 'handed_off',
    recipient_name = p_recipient_name,
    recipient_contact = p_recipient_contact,
    recipient_relationship = p_recipient_relationship,
    handoff_timestamp = NOW(),
    handoff_notes = p_handoff_notes,
    handoff_photos = p_handoff_photos,
    security_officer_id = auth.uid(),
    security_officer_name = auth.jwt() ->> 'name',
    updated_at = NOW()
  WHERE id = p_delivery_id AND tenant_id::TEXT = v_tenant_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Delivery handed off successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migration adds security-specific tables and enhances existing tables for Sentinel Security mobile app