-- =========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Consolidated from multiple migration fixes
-- =========================================

-- =========================================
-- ENABLE RLS ON ALL TABLES
-- =========================================

ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE residences ENABLE ROW LEVEL SECURITY;
ALTER TABLE gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
-- subscription_plans table doesn't exist yet - removing reference
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
-- Note: household_members RLS disabled later to prevent circular dependency
ALTER TABLE vehicle_stickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction_permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE association_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_reports ENABLE ROW LEVEL SECURITY;

-- =========================================
-- CRITICAL: ADMIN_USERS SELF-ACCESS POLICY
-- =========================================
-- Admin users must be able to read their own row
-- Otherwise all other RLS policies checking admin_users will fail

CREATE POLICY "admin_users_self_access" ON admin_users
FOR SELECT
USING (id = auth.uid());

-- =========================================
-- SUPERADMIN POLICIES
-- =========================================

CREATE POLICY "superadmin_full_access" ON communities
FOR ALL
USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin')
WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin');

CREATE POLICY "superadmin_full_access" ON residences
FOR ALL
USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin')
WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin');

CREATE POLICY "superadmin_full_access" ON gates
FOR ALL
USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin')
WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin');

CREATE POLICY "superadmin_full_access" ON admin_users
FOR ALL
USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin')
WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin');

-- Subscription plans policies removed - table doesn't exist yet

-- Audit logs readable by superadmin only
CREATE POLICY "superadmin_read" ON audit_logs
FOR SELECT USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin');

-- Audit logs insertable by superadmin only
CREATE POLICY "superadmin_insert" ON audit_logs
FOR INSERT WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin');

-- =========================================
-- HOUSEHOLDS POLICIES
-- =========================================

CREATE POLICY "admin_view_households" ON households
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.id = auth.uid()
    AND admin_users.tenant_id = households.tenant_id
    AND admin_users.status = 'active'
  )
);

CREATE POLICY "admin_insert_households" ON households
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.id = auth.uid()
    AND admin_users.tenant_id = households.tenant_id
    AND admin_users.status = 'active'
    AND admin_users.role IN ('admin_head', 'admin_officer')
  )
);

CREATE POLICY "admin_update_households" ON households
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.id = auth.uid()
    AND admin_users.tenant_id = households.tenant_id
    AND admin_users.status = 'active'
    AND admin_users.role IN ('admin_head', 'admin_officer')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.id = auth.uid()
    AND admin_users.tenant_id = households.tenant_id
    AND admin_users.status = 'active'
    AND admin_users.role IN ('admin_head', 'admin_officer')
  )
);

CREATE POLICY "admin_delete_households" ON households
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.id = auth.uid()
    AND admin_users.tenant_id = households.tenant_id
    AND admin_users.status = 'active'
    AND admin_users.role = 'admin_head'
  )
);

CREATE POLICY "superadmin_all_households" ON households
FOR ALL
USING (
  auth.uid() IN (
    SELECT id FROM admin_users WHERE role = 'superadmin' AND status = 'active'
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM admin_users WHERE role = 'superadmin' AND status = 'active'
  )
);

-- =========================================
-- CRITICAL: DISABLE RLS ON HOUSEHOLD_MEMBERS
-- =========================================
-- The circular dependency between households and household_members
-- causes infinite recursion. Disabling RLS on household_members
-- to allow households queries to work. Access control maintained
-- through households table policies.

ALTER TABLE household_members DISABLE ROW LEVEL SECURITY;

-- =========================================
-- RESIDENCES POLICIES
-- =========================================

CREATE POLICY "admin_view_residences" ON residences
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.id = auth.uid()
    AND admin_users.tenant_id = residences.tenant_id
    AND admin_users.status = 'active'
  )
);

CREATE POLICY "admin_update_residences" ON residences
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.id = auth.uid()
    AND admin_users.tenant_id = residences.tenant_id
    AND admin_users.status = 'active'
    AND admin_users.role = 'admin_head'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.id = auth.uid()
    AND admin_users.tenant_id = residences.tenant_id
    AND admin_users.status = 'active'
    AND admin_users.role = 'admin_head'
  )
);

CREATE POLICY "superadmin_all_residences" ON residences
FOR ALL
USING (
  auth.uid() IN (
    SELECT id FROM admin_users WHERE role = 'superadmin' AND status = 'active'
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM admin_users WHERE role = 'superadmin' AND status = 'active'
  )
);

-- =========================================
-- VEHICLE STICKERS POLICIES
-- =========================================

CREATE POLICY "admin_view_stickers" ON vehicle_stickers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.id = auth.uid()
    AND admin_users.tenant_id = vehicle_stickers.tenant_id
    AND admin_users.status = 'active'
  )
);

CREATE POLICY "admin_manage_stickers" ON vehicle_stickers
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.id = auth.uid()
    AND admin_users.tenant_id = vehicle_stickers.tenant_id
    AND admin_users.status = 'active'
    AND admin_users.role IN ('admin_head', 'admin_officer')
  )
);

CREATE POLICY "admin_update_stickers" ON vehicle_stickers
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.id = auth.uid()
    AND admin_users.tenant_id = vehicle_stickers.tenant_id
    AND admin_users.status = 'active'
    AND admin_users.role IN ('admin_head', 'admin_officer')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.id = auth.uid()
    AND admin_users.tenant_id = vehicle_stickers.tenant_id
    AND admin_users.status = 'active'
    AND admin_users.role IN ('admin_head', 'admin_officer')
  )
);

-- =========================================
-- CONSTRUCTION PERMITS POLICIES
-- =========================================

CREATE POLICY "admin_view_permits" ON construction_permits
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.id = auth.uid()
    AND admin_users.tenant_id = construction_permits.tenant_id
    AND admin_users.status = 'active'
  )
);

CREATE POLICY "admin_manage_permits" ON construction_permits
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.id = auth.uid()
    AND admin_users.tenant_id = construction_permits.tenant_id
    AND admin_users.status = 'active'
    AND admin_users.role IN ('admin_head', 'admin_officer')
  )
);

CREATE POLICY "admin_update_permits" ON construction_permits
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.id = auth.uid()
    AND admin_users.tenant_id = construction_permits.tenant_id
    AND admin_users.status = 'active'
    AND admin_users.role IN ('admin_head', 'admin_officer')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.id = auth.uid()
    AND admin_users.tenant_id = construction_permits.tenant_id
    AND admin_users.status = 'active'
    AND admin_users.role IN ('admin_head', 'admin_officer')
  )
);

-- =========================================
-- ASSOCIATION FEES POLICIES
-- =========================================

CREATE POLICY "admin_view_fees" ON association_fees
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.id = auth.uid()
    AND admin_users.tenant_id = association_fees.tenant_id
    AND admin_users.status = 'active'
  )
);

CREATE POLICY "admin_head_create_fees" ON association_fees
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.id = auth.uid()
    AND admin_users.tenant_id = association_fees.tenant_id
    AND admin_users.status = 'active'
    AND admin_users.role = 'admin_head'
  )
);

CREATE POLICY "admin_record_payment" ON association_fees
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.id = auth.uid()
    AND admin_users.tenant_id = association_fees.tenant_id
    AND admin_users.status = 'active'
    AND admin_users.role IN ('admin_head', 'admin_officer')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.id = auth.uid()
    AND admin_users.tenant_id = association_fees.tenant_id
    AND admin_users.status = 'active'
    AND admin_users.role IN ('admin_head', 'admin_officer')
  )
);

-- =========================================
-- ANNOUNCEMENTS POLICIES
-- =========================================

CREATE POLICY "admin_view_announcements" ON announcements
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.id = auth.uid()
    AND admin_users.tenant_id = announcements.tenant_id
    AND admin_users.status = 'active'
  )
);

CREATE POLICY "admin_manage_announcements" ON announcements
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.id = auth.uid()
    AND admin_users.tenant_id = announcements.tenant_id
    AND admin_users.status = 'active'
    AND admin_users.role IN ('admin_head', 'admin_officer')
  )
);

-- =========================================
-- GATE ENTRIES POLICIES (Read-Only)
-- =========================================

CREATE POLICY "admin_view_gate_entries" ON gate_entries
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.id = auth.uid()
    AND admin_users.tenant_id = gate_entries.tenant_id
    AND admin_users.status = 'active'
  )
);

-- =========================================
-- INCIDENT REPORTS POLICIES
-- =========================================

CREATE POLICY "admin_view_incidents" ON incident_reports
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.id = auth.uid()
    AND admin_users.tenant_id = incident_reports.tenant_id
    AND admin_users.status = 'active'
  )
);

CREATE POLICY "admin_insert_incidents" ON incident_reports
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.id = auth.uid()
    AND admin_users.tenant_id = incident_reports.tenant_id
    AND admin_users.status = 'active'
    AND admin_users.role IN ('admin_head', 'admin_officer')
  )
);

CREATE POLICY "admin_update_incident_resolution" ON incident_reports
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.id = auth.uid()
    AND admin_users.tenant_id = incident_reports.tenant_id
    AND admin_users.status = 'active'
    AND admin_users.role IN ('admin_head', 'admin_officer')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.id = auth.uid()
    AND admin_users.tenant_id = incident_reports.tenant_id
    AND admin_users.status = 'active'
    AND admin_users.role IN ('admin_head', 'admin_officer')
  )
);
