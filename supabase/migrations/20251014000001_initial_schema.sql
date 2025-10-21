-- =========================================
-- PLATFORM DASHBOARD SCHEMA
-- Multi-Tenant Management Platform
-- =========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Helper function for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =========================================
-- TABLE: communities (tenants)
-- =========================================

CREATE TABLE communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(name) >= 3),
  location TEXT NOT NULL,
  contact_email TEXT NOT NULL CHECK (contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  contact_phone TEXT NOT NULL,
  regional_settings JSONB NOT NULL DEFAULT '{"timezone": "UTC", "currency": "USD", "language": "en"}'::jsonb,
  logo_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_communities_status ON communities(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_communities_created ON communities(created_at DESC);

CREATE TRIGGER update_communities_updated_at
  BEFORE UPDATE ON communities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE communities IS 'Residential communities (tenants) managed by superadmin';
COMMENT ON COLUMN communities.regional_settings IS 'JSONB: { timezone: string, currency: string, language: string }';
COMMENT ON COLUMN communities.deleted_at IS 'Soft delete timestamp. Null = active, set = deleted';

-- =========================================
-- TABLE: residences
-- =========================================

CREATE TABLE residences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  unit_number TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('single_family', 'townhouse', 'condo', 'apartment')),
  max_occupancy INTEGER NOT NULL CHECK (max_occupancy > 0 AND max_occupancy <= 20),
  lot_area NUMERIC(10,2) CHECK (lot_area >= 0),
  floor_area NUMERIC(10,2) NOT NULL CHECK (floor_area > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_unit_per_community UNIQUE (tenant_id, unit_number)
);

CREATE INDEX idx_residences_tenant ON residences(tenant_id);
CREATE INDEX idx_residences_type ON residences(type);
CREATE INDEX idx_residences_unit_number ON residences(tenant_id, unit_number);

CREATE TRIGGER update_residences_updated_at
  BEFORE UPDATE ON residences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE residences IS 'Housing units within a community';
COMMENT ON COLUMN residences.lot_area IS 'Lot area in square meters. Nullable for condos without individual lots';
COMMENT ON COLUMN residences.unit_number IS 'Unit identifier (e.g., "101", "A-205"). Unique per community';

-- =========================================
-- TABLE: gates
-- =========================================

CREATE TABLE gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('vehicle', 'pedestrian', 'service', 'delivery')),
  description TEXT,
  operating_hours JSONB NOT NULL DEFAULT '[]'::jsonb,
  latitude NUMERIC(10,8) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude NUMERIC(11,8) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  is_active BOOLEAN NOT NULL DEFAULT true,
  hardware_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gates_tenant ON gates(tenant_id);
CREATE INDEX idx_gates_type ON gates(type);
CREATE INDEX idx_gates_active ON gates(is_active);

CREATE TRIGGER update_gates_updated_at
  BEFORE UPDATE ON gates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE gates IS 'Community entrance/exit access points';
COMMENT ON COLUMN gates.operating_hours IS 'JSONB array of operating hours per day';
COMMENT ON COLUMN gates.hardware_settings IS 'JSONB: Hardware integration config for RFID readers, cameras';

-- =========================================
-- TABLE: admin_users
-- =========================================

CREATE TABLE admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('superadmin', 'admin_head', 'admin_officer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deactivated')),
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_users_tenant ON admin_users(tenant_id);
CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_admin_users_status ON admin_users(status);

CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE admin_users IS 'Community administrators. Extends auth.users table';
COMMENT ON COLUMN admin_users.id IS 'References auth.users.id. User auth handled by Supabase Auth';
COMMENT ON COLUMN admin_users.role IS 'admin_head = primary, admin_officer = supporting';

-- =========================================
-- TABLE: audit_logs
-- =========================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  superadmin_id UUID REFERENCES auth.users(id),
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  changes JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_superadmin ON audit_logs(superadmin_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

COMMENT ON TABLE audit_logs IS 'Audit trail of all superadmin actions';
COMMENT ON COLUMN audit_logs.changes IS 'JSONB: { before: {...}, after: {...} } for update actions';

-- =========================================
-- =========================================



-- Audit logs readable by superadmin only

-- =========================================
-- DATABASE FUNCTIONS (RPC)
-- =========================================

-- Suspend community
CREATE OR REPLACE FUNCTION suspend_community(community_id UUID)
RETURNS VOID AS $$
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') != 'superadmin' THEN
    RAISE EXCEPTION 'Unauthorized: Only superadmin can suspend communities';
  END IF;

  UPDATE communities
  SET status = 'suspended', updated_at = NOW()
  WHERE id = community_id AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Community not found or already suspended';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reactivate community
CREATE OR REPLACE FUNCTION reactivate_community(community_id UUID)
RETURNS VOID AS $$
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') != 'superadmin' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE communities
  SET status = 'active', updated_at = NOW()
  WHERE id = community_id AND status = 'suspended';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Community not found or not suspended';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Soft delete community
CREATE OR REPLACE FUNCTION soft_delete_community(community_id UUID)
RETURNS VOID AS $$
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') != 'superadmin' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE communities
  SET status = 'deleted', deleted_at = NOW(), updated_at = NOW()
  WHERE id = community_id AND status IN ('active', 'suspended');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Community not found or already deleted';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================
-- VIEWS FOR ANALYTICS
-- =========================================

CREATE VIEW community_stats AS
SELECT
  status,
  COUNT(*) as count,
  jsonb_build_object(
    'total', COUNT(*),
    'active', COUNT(*) FILTER (WHERE status = 'active'),
    'suspended', COUNT(*) FILTER (WHERE status = 'suspended'),
    'deleted', COUNT(*) FILTER (WHERE status = 'deleted')
  ) as breakdown
FROM communities
WHERE deleted_at IS NULL OR status = 'deleted'
GROUP BY status;

CREATE VIEW admin_users_with_community AS
SELECT
  au.*,
  c.name as community_name,
  c.status as community_status
FROM admin_users au
JOIN communities c ON au.tenant_id = c.id;
-- =========================================
-- HOA ADMINISTRATION PLATFORM SCHEMA
-- Feature 002: Admin Dashboard for HOA Management
-- =========================================
-- This migration adds tables for households, members, stickers, permits,
-- fees, announcements, gate monitoring, and security incidents.
-- References existing tables: communities (tenant_id), residences, gates, admin_users

-- =========================================
-- TABLE: households
-- =========================================

CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  residence_id UUID NOT NULL REFERENCES residences(id),
  household_head_id UUID, -- FK constraint added later after household_members table exists
  move_in_date DATE NOT NULL,
  move_out_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'moved_out')),
  contact_email TEXT,
  contact_phone TEXT,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_move_out CHECK (move_out_date IS NULL OR move_out_date >= move_in_date)
);

CREATE UNIQUE INDEX unique_residence_active_household ON households(residence_id, status) WHERE (status = 'active' AND deleted_at IS NULL);

CREATE INDEX idx_households_tenant ON households(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_households_status ON households(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_households_residence ON households(residence_id);

CREATE TRIGGER update_households_updated_at
  BEFORE UPDATE ON households
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE households IS 'Residential unit occupancy managed by HOA admins';
COMMENT ON COLUMN households.status IS 'active = occupied, inactive = not paying fees, moved_out = vacated';

-- =========================================
-- TABLE: household_members
-- =========================================

CREATE TABLE household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  relationship_to_head TEXT NOT NULL CHECK (relationship_to_head IN (
    'self', 'spouse', 'child', 'parent', 'sibling', 'grandparent', 'grandchild', 'other'
  )),
  date_of_birth DATE,
  contact_email TEXT,
  contact_phone TEXT,
  member_type TEXT NOT NULL DEFAULT 'resident' CHECK (member_type IN ('resident', 'beneficial_user')),
  photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX unique_user_per_tenant ON household_members(tenant_id, user_id) WHERE user_id IS NOT NULL;

CREATE INDEX idx_members_tenant ON household_members(tenant_id);
CREATE INDEX idx_members_household ON household_members(household_id);
CREATE INDEX idx_members_user ON household_members(user_id) WHERE user_id IS NOT NULL;

CREATE TRIGGER update_household_members_updated_at
  BEFORE UPDATE ON household_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE household_members IS 'Individuals within households';
COMMENT ON COLUMN household_members.member_type IS 'resident = lives there, beneficial_user = vehicle access only';
COMMENT ON COLUMN household_members.photo_url IS 'Supabase Storage path: photos/{tenant_id}/members/{member_id}.jpg';

-- Add foreign key constraint from households to household_members
-- (deferred until after both tables exist to avoid circular dependency)
ALTER TABLE households
  ADD CONSTRAINT fk_household_head
  FOREIGN KEY (household_head_id)
  REFERENCES household_members(id);

-- =========================================
-- TABLE: vehicle_stickers
-- =========================================

CREATE TABLE vehicle_stickers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id),
  member_id UUID REFERENCES household_members(id),
  vehicle_plate TEXT NOT NULL,
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_color TEXT,
  rfid_code TEXT,
  or_cr_document_url TEXT,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN (
    'requested', 'approved', 'active', 'expiring', 'expired', 'rejected', 'revoked'
  )),
  expiry_date DATE,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  revocation_reason TEXT,
  revoked_by UUID REFERENCES auth.users(id),
  revoked_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT rejection_requires_reason CHECK (status != 'rejected' OR rejection_reason IS NOT NULL),
  CONSTRAINT revocation_requires_reason CHECK (status != 'revoked' OR revocation_reason IS NOT NULL),
  CONSTRAINT approved_requires_expiry CHECK (status NOT IN ('approved', 'active', 'expiring') OR expiry_date IS NOT NULL)
);

CREATE UNIQUE INDEX unique_plate_per_tenant ON vehicle_stickers(tenant_id, vehicle_plate) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX unique_rfid_per_tenant ON vehicle_stickers(tenant_id, rfid_code) WHERE rfid_code IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX idx_stickers_tenant ON vehicle_stickers(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_stickers_household ON vehicle_stickers(household_id);
CREATE INDEX idx_stickers_status ON vehicle_stickers(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_stickers_expiry ON vehicle_stickers(tenant_id, expiry_date) WHERE status IN ('active', 'expiring') AND deleted_at IS NULL;

CREATE TRIGGER update_vehicle_stickers_updated_at
  BEFORE UPDATE ON vehicle_stickers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE vehicle_stickers IS 'Vehicle access authorization';
COMMENT ON COLUMN vehicle_stickers.or_cr_document_url IS 'Supabase Storage: documents/{tenant_id}/or_cr/{sticker_id}.pdf';

-- =========================================
-- TABLE: construction_permits
-- =========================================

CREATE TABLE construction_permits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id),
  project_description TEXT NOT NULL,
  project_start_date DATE NOT NULL,
  project_end_date DATE NOT NULL,
  contractor_name TEXT NOT NULL,
  contractor_contact TEXT,
  contractor_license TEXT,
  estimated_worker_count INTEGER CHECK (estimated_worker_count > 0),
  road_fee_amount DECIMAL(10,2),
  road_fee_paid BOOLEAN NOT NULL DEFAULT FALSE,
  road_fee_paid_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'rejected', 'in_progress', 'completed'
  )),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_project_dates CHECK (project_end_date >= project_start_date),
  CONSTRAINT rejection_requires_reason CHECK (status != 'rejected' OR rejection_reason IS NOT NULL),
  CONSTRAINT approval_requires_fee CHECK (status NOT IN ('approved', 'in_progress', 'completed') OR road_fee_amount IS NOT NULL)
);

CREATE INDEX idx_permits_tenant ON construction_permits(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_permits_household ON construction_permits(household_id);
CREATE INDEX idx_permits_status ON construction_permits(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_permits_dates ON construction_permits(tenant_id, project_start_date, project_end_date) WHERE status IN ('approved', 'in_progress');

CREATE TRIGGER update_construction_permits_updated_at
  BEFORE UPDATE ON construction_permits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE construction_permits IS 'Home improvement permits';

-- =========================================
-- TABLE: association_fees
-- =========================================

CREATE TABLE association_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id),
  fee_type TEXT NOT NULL CHECK (fee_type IN ('monthly', 'quarterly', 'annual', 'special_assessment')),
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  due_date DATE NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN (
    'unpaid', 'paid', 'overdue', 'waived', 'partial'
  )),
  paid_amount DECIMAL(10,2) DEFAULT 0 CHECK (paid_amount >= 0 AND paid_amount <= amount),
  payment_date TIMESTAMPTZ,
  payment_method TEXT CHECK (payment_method IN ('cash', 'check', 'bank_transfer', 'credit_card', 'online')),
  receipt_url TEXT,
  waived_by UUID REFERENCES auth.users(id),
  waived_at TIMESTAMPTZ,
  waiver_reason TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT waive_requires_reason CHECK (payment_status != 'waived' OR waiver_reason IS NOT NULL),
  CONSTRAINT paid_requires_payment_date CHECK (payment_status NOT IN ('paid', 'partial') OR payment_date IS NOT NULL),
  CONSTRAINT paid_requires_method CHECK (payment_status NOT IN ('paid', 'partial') OR payment_method IS NOT NULL)
);

CREATE INDEX idx_fees_tenant ON association_fees(tenant_id);
CREATE INDEX idx_fees_household ON association_fees(household_id);
CREATE INDEX idx_fees_status ON association_fees(tenant_id, payment_status);
CREATE INDEX idx_fees_due_date ON association_fees(tenant_id, due_date) WHERE payment_status IN ('unpaid', 'partial');
CREATE INDEX idx_fees_overdue ON association_fees(tenant_id, payment_status, due_date) WHERE payment_status = 'overdue';

CREATE TRIGGER update_association_fees_updated_at
  BEFORE UPDATE ON association_fees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE association_fees IS 'HOA dues and fees';

-- =========================================
-- TABLE: announcements
-- =========================================

CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  announcement_type TEXT NOT NULL CHECK (announcement_type IN (
    'general', 'urgent', 'event', 'maintenance', 'fee_reminder', 'election'
  )),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  target_audience TEXT NOT NULL DEFAULT 'all' CHECK (target_audience IN (
    'all', 'households', 'security', 'admins'
  )),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'scheduled', 'published', 'expired', 'archived'
  )),
  publication_date TIMESTAMPTZ,
  expiry_date TIMESTAMPTZ,
  view_count INTEGER NOT NULL DEFAULT 0,
  click_count INTEGER NOT NULL DEFAULT 0,
  attachment_urls JSONB DEFAULT '[]'::jsonb,
  published_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT scheduled_requires_publication_date CHECK (status != 'scheduled' OR publication_date IS NOT NULL),
  CONSTRAINT published_requires_publication_date CHECK (status NOT IN ('published', 'expired') OR published_at IS NOT NULL)
);

CREATE INDEX idx_announcements_tenant ON announcements(tenant_id);
CREATE INDEX idx_announcements_status ON announcements(tenant_id, status);
CREATE INDEX idx_announcements_publication ON announcements(tenant_id, publication_date) WHERE status IN ('scheduled', 'published');
CREATE INDEX idx_announcements_expiry ON announcements(tenant_id, expiry_date) WHERE status = 'published' AND expiry_date IS NOT NULL;

CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE announcements IS 'Community communications';
COMMENT ON COLUMN announcements.attachment_urls IS 'JSONB array: Supabase Storage paths';

-- =========================================
-- TABLE: gate_entries
-- =========================================

CREATE TABLE gate_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  gate_id UUID NOT NULL REFERENCES gates(id),
  entry_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  entry_type TEXT NOT NULL CHECK (entry_type IN ('vehicle', 'pedestrian', 'delivery', 'visitor')),
  vehicle_plate TEXT,
  sticker_id UUID REFERENCES vehicle_stickers(id),
  household_id UUID REFERENCES households(id),
  security_officer_id UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gate_entries_tenant ON gate_entries(tenant_id);
CREATE INDEX idx_gate_entries_timestamp ON gate_entries(tenant_id, entry_timestamp DESC);
CREATE INDEX idx_gate_entries_gate ON gate_entries(gate_id, entry_timestamp DESC);
CREATE INDEX idx_gate_entries_household ON gate_entries(household_id) WHERE household_id IS NOT NULL;
CREATE INDEX idx_gate_entries_vehicle ON gate_entries(tenant_id, vehicle_plate) WHERE vehicle_plate IS NOT NULL;

COMMENT ON TABLE gate_entries IS 'Access logs from gate hardware (read-only for admins)';

-- =========================================
-- TABLE: incident_reports
-- =========================================

CREATE TABLE incident_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES auth.users(id),
  incident_timestamp TIMESTAMPTZ NOT NULL,
  incident_type TEXT NOT NULL CHECK (incident_type IN (
    'suspicious_activity', 'unauthorized_entry', 'disturbance', 'emergency', 'property_damage', 'other'
  )),
  location TEXT NOT NULL,
  gate_id UUID REFERENCES gates(id),
  household_id UUID REFERENCES households(id),
  description TEXT NOT NULL,
  resolution_status TEXT NOT NULL DEFAULT 'open' CHECK (resolution_status IN ('open', 'investigating', 'resolved', 'closed')),
  resolution_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  attachment_urls JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incidents_tenant ON incident_reports(tenant_id);
CREATE INDEX idx_incidents_timestamp ON incident_reports(tenant_id, incident_timestamp DESC);
CREATE INDEX idx_incidents_status ON incident_reports(tenant_id, resolution_status);
CREATE INDEX idx_incidents_household ON incident_reports(household_id) WHERE household_id IS NOT NULL;

CREATE TRIGGER update_incident_reports_updated_at
  BEFORE UPDATE ON incident_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE incident_reports IS 'Security incidents from security officers';

-- =========================================
-- =========================================


-- =========================================
-- =========================================




-- Note: admin_officer restrictions on move_out_date changes enforced via application logic or triggers

-- =========================================
-- =========================================



-- =========================================
-- =========================================




-- Note: admin_officer restrictions on revoked stickers enforced via application logic or triggers

-- =========================================
-- =========================================




-- Note: admin_officer restrictions on permit status transitions enforced via application logic or triggers

-- =========================================
-- =========================================




-- Note: Immutability of amount and fee_type enforced via application logic or triggers

-- =========================================
-- =========================================



-- =========================================
-- GATE ENTRIES POLICIES (Read-Only)
-- =========================================


-- =========================================
-- =========================================



-- Note: Immutability of incident_type and incident_timestamp enforced via application logic or triggers


-- =========================================
-- DATABASE VIEWS FOR ANALYTICS
-- =========================================

CREATE VIEW household_stats AS
SELECT
  h.tenant_id,
  COUNT(*) FILTER (WHERE h.status = 'active' AND h.deleted_at IS NULL) AS active_households,
  COUNT(*) FILTER (WHERE h.status = 'inactive' AND h.deleted_at IS NULL) AS inactive_households,
  COUNT(*) FILTER (WHERE h.status = 'moved_out' AND h.deleted_at IS NULL) AS moved_out_households,
  COUNT(DISTINCT r.id) AS total_residences,
  COUNT(DISTINCT r.id) - COUNT(*) FILTER (WHERE h.status = 'active' AND h.deleted_at IS NULL) AS vacant_residences,
  ROUND(
    (COUNT(*) FILTER (WHERE h.status = 'active' AND h.deleted_at IS NULL)::NUMERIC / NULLIF(COUNT(DISTINCT r.id), 0)) * 100,
    2
  ) AS occupancy_rate
FROM residences r
LEFT JOIN households h ON h.residence_id = r.id AND h.deleted_at IS NULL
GROUP BY h.tenant_id;

CREATE VIEW sticker_dashboard AS
SELECT
  s.tenant_id,
  COUNT(*) FILTER (WHERE s.status = 'requested') AS requested_count,
  COUNT(*) FILTER (WHERE s.status = 'approved') AS approved_count,
  COUNT(*) FILTER (WHERE s.status = 'active') AS active_count,
  COUNT(*) FILTER (WHERE s.status = 'expiring') AS expiring_count,
  COUNT(*) FILTER (WHERE s.status = 'expired') AS expired_count,
  COUNT(*) FILTER (WHERE s.status = 'rejected') AS rejected_count,
  COUNT(*) FILTER (WHERE s.status = 'revoked') AS revoked_count,
  ROUND(
    (COUNT(*) FILTER (WHERE s.status IN ('approved', 'active'))::NUMERIC /
     NULLIF(COUNT(*) FILTER (WHERE s.status IN ('requested', 'approved', 'active')), 0)) * 100,
    2
  ) AS approval_rate
FROM vehicle_stickers s
WHERE s.deleted_at IS NULL
GROUP BY s.tenant_id;

CREATE VIEW fee_summary AS
SELECT
  f.tenant_id,
  COUNT(*) AS total_fees,
  COUNT(*) FILTER (WHERE f.payment_status = 'paid') AS paid_count,
  COUNT(*) FILTER (WHERE f.payment_status = 'unpaid') AS unpaid_count,
  COUNT(*) FILTER (WHERE f.payment_status = 'overdue') AS overdue_count,
  COUNT(*) FILTER (WHERE f.payment_status = 'partial') AS partial_count,
  SUM(f.amount) AS total_billed,
  SUM(f.paid_amount) AS total_collected,
  SUM(f.amount - f.paid_amount) FILTER (WHERE f.payment_status IN ('unpaid', 'overdue', 'partial')) AS outstanding_balance,
  ROUND(
    (SUM(f.paid_amount)::NUMERIC / NULLIF(SUM(f.amount), 0)) * 100,
    2
  ) AS collection_rate
FROM association_fees f
GROUP BY f.tenant_id;

-- =========================================
-- RPC FUNCTIONS
-- =========================================

-- Bulk approve vehicle stickers
CREATE OR REPLACE FUNCTION approve_sticker_bulk(
  p_sticker_ids UUID[],
  p_expiry_date DATE DEFAULT CURRENT_DATE + INTERVAL '1 year'
)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id TEXT;
  v_approved_count INTEGER;
BEGIN
  v_tenant_id := auth.jwt() ->> 'tenant_id';

  IF (auth.jwt() -> 'app_metadata' ->> 'role') NOT IN ('admin_head', 'superadmin') THEN
    RAISE EXCEPTION 'Insufficient permissions for bulk approval';
  END IF;

  UPDATE vehicle_stickers
  SET
    status = 'approved',
    expiry_date = p_expiry_date,
    approved_by = auth.uid(),
    approved_at = NOW(),
    updated_at = NOW()
  WHERE
    id = ANY(p_sticker_ids)
    AND tenant_id::TEXT = v_tenant_id
    AND status = 'requested';

  GET DIAGNOSTICS v_approved_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', TRUE,
    'approved_count', v_approved_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Record fee payment
CREATE OR REPLACE FUNCTION record_fee_payment(
  p_fee_id UUID,
  p_amount DECIMAL(10,2),
  p_payment_date DATE,
  p_payment_method TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id TEXT;
  v_fee RECORD;
  v_new_status TEXT;
BEGIN
  v_tenant_id := auth.jwt() ->> 'tenant_id';

  SELECT * INTO v_fee FROM association_fees
  WHERE id = p_fee_id AND tenant_id::TEXT = v_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fee not found';
  END IF;

  IF v_fee.paid_amount + p_amount >= v_fee.amount THEN
    v_new_status := 'paid';
  ELSE
    v_new_status := 'partial';
  END IF;

  UPDATE association_fees
  SET
    paid_amount = paid_amount + p_amount,
    payment_status = v_new_status,
    payment_date = p_payment_date,
    payment_method = p_payment_method,
    recorded_by = auth.uid(),
    updated_at = NOW()
  WHERE id = p_fee_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'new_status', v_new_status,
    'total_paid', v_fee.paid_amount + p_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revoke sticker
CREATE OR REPLACE FUNCTION revoke_sticker(
  p_sticker_id UUID,
  p_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id TEXT;
BEGIN
  v_tenant_id := auth.jwt() ->> 'tenant_id';

  IF (auth.jwt() -> 'app_metadata' ->> 'role') NOT IN ('admin_head', 'superadmin') THEN
    RAISE EXCEPTION 'Only admin_head can revoke stickers';
  END IF;

  UPDATE vehicle_stickers
  SET
    status = 'revoked',
    revocation_reason = p_reason,
    revoked_by = auth.uid(),
    revoked_at = NOW(),
    updated_at = NOW()
  WHERE
    id = p_sticker_id
    AND tenant_id::TEXT = v_tenant_id
    AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sticker not found or not active';
  END IF;

  RETURN jsonb_build_object('success', TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

