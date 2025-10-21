-- =========================================
-- TABLE: scheduled_guests
-- =========================================

CREATE TABLE scheduled_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id),
  guest_name TEXT NOT NULL,
  guest_phone TEXT NOT NULL,
  vehicle_plate TEXT,
  purpose TEXT NOT NULL,
  visit_type TEXT NOT NULL CHECK (visit_type IN ('day_trip', 'multi_day')),
  arrival_date TIMESTAMPTZ NOT NULL,
  departure_date TIMESTAMPTZ,
  pass_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'checked_in', 'checked_out', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  checked_in_at TIMESTAMPTZ,
  checked_out_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX unique_pass_per_tenant ON scheduled_guests(tenant_id, pass_id) WHERE status != 'cancelled';
CREATE INDEX idx_scheduled_guests_tenant ON scheduled_guests(tenant_id);
CREATE INDEX idx_scheduled_guests_household ON scheduled_guests(household_id);
CREATE INDEX idx_scheduled_guests_status ON scheduled_guests(tenant_id, status);
CREATE INDEX idx_scheduled_guests_arrival ON scheduled_guests(tenant_id, arrival_date) WHERE status IN ('scheduled', 'checked_in');
CREATE INDEX idx_scheduled_guests_departure ON scheduled_guests(tenant_id, departure_date) WHERE status = 'checked_in';
CREATE INDEX idx_scheduled_guests_phone ON scheduled_guests(tenant_id, guest_phone);
CREATE INDEX idx_scheduled_guests_plate ON scheduled_guests(tenant_id, vehicle_plate) WHERE vehicle_plate IS NOT NULL;

CREATE TRIGGER update_scheduled_guests_updated_at
  BEFORE UPDATE ON scheduled_guests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE scheduled_guests IS 'Scheduled guest visits managed by households';
COMMENT ON COLUMN scheduled_guests.pass_id IS 'Unique pass identifier for guest access';
COMMENT ON COLUMN scheduled_guests.visit_type IS 'day_trip = same day, multi_day = overnight or multiple days';
COMMENT ON COLUMN scheduled_guests.vehicle_plate IS 'Optional: Guest vehicle if they have one';
COMMENT ON COLUMN scheduled_guests.notes IS 'Additional information about the guest visit';

-- Enable RLS (Row Level Security)
ALTER TABLE scheduled_guests ENABLE ROW LEVEL SECURITY;

-- Create policy for household members to manage their own guests
CREATE POLICY "Household members can manage their scheduled guests" ON scheduled_guests
  FOR ALL
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::UUID
    AND household_id = (
      SELECT h.id FROM households h
      JOIN household_members hm ON hm.household_id = h.id
      WHERE hm.user_id = auth.uid()
      AND hm.tenant_id = (auth.jwt() ->> 'tenant_id')::UUID
      AND hm.status = 'active'
    )
  );

-- Create policy for admins to view all scheduled guests
CREATE POLICY "Admins can view all scheduled guests" ON scheduled_guests
  FOR SELECT
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::UUID
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin_head', 'admin_officer', 'superadmin')
    )
  );

-- Create policy for security officers to view active guests
CREATE POLICY "Security can view active guests" ON scheduled_guests
  FOR SELECT
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::UUID
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'security'
    AND status IN ('scheduled', 'checked_in')
  );