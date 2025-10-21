# Database Schema & Data Model

**Feature**: HOA Administration Platform (002)
**Date**: 2025-10-09
**Database**: PostgreSQL 15+ (Supabase)

---

## Overview

This document defines the complete database schema for the Admin Dashboard, including tables, relationships, constraints, RLS policies, views, and RPC functions. All tables follow the constitution's database-driven design principles.

---

## Tables

### 1. households

Represents residential unit occupancy managed by admins.

```sql
CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES communities(id), -- Multi-tenant FK
  residence_id UUID NOT NULL REFERENCES residences(id),
  household_head_id UUID REFERENCES household_members(id), -- Designated head
  move_in_date DATE NOT NULL,
  move_out_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'moved_out')),
  contact_email TEXT,
  contact_phone TEXT,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_residence_active_household UNIQUE (residence_id, status) WHERE (status = 'active' AND deleted_at IS NULL),
  CONSTRAINT valid_move_out CHECK (move_out_date IS NULL OR move_out_date >= move_in_date)
);

CREATE INDEX idx_households_tenant ON households(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_households_status ON households(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_households_residence ON households(residence_id);
```

**State Machine**:
- `active` → `inactive` (when household stops paying fees but hasn't moved)
- `inactive` → `active` (when fees resume)
- `active` → `moved_out` (when move_out_date is set)
- `inactive` → `moved_out` (when move_out_date is set)

**Constraints**:
- FR-006: Only one active household per residence (enforced by partial unique constraint)
- Soft delete via `deleted_at`

---

### 2. household_members

Represents individuals within households, registered by admins.

```sql
CREATE TABLE household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES communities(id),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id), -- Optional link to auth account (FR-012)
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  relationship_to_head TEXT NOT NULL CHECK (relationship_to_head IN (
    'self', 'spouse', 'child', 'parent', 'sibling', 'grandparent', 'grandchild', 'other'
  )),
  date_of_birth DATE,
  contact_email TEXT,
  contact_phone TEXT,
  member_type TEXT NOT NULL DEFAULT 'resident' CHECK (member_type IN ('resident', 'beneficial_user')),
  photo_url TEXT, -- Supabase Storage path
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_user_per_tenant UNIQUE (tenant_id, user_id) WHERE user_id IS NOT NULL
);

CREATE INDEX idx_members_tenant ON household_members(tenant_id);
CREATE INDEX idx_members_household ON household_members(household_id);
CREATE INDEX idx_members_user ON household_members(user_id) WHERE user_id IS NOT NULL;
```

**Notes**:
- FR-011: `member_type` distinguishes residents vs beneficial users (vehicle access only)
- FR-010: `photo_url` stores Supabase Storage path (format: `photos/{tenant_id}/members/{member_id}.jpg`)
- Cascade delete when household is deleted

---

### 3. vehicle_stickers

Represents vehicle access authorization managed by admins.

```sql
CREATE TABLE vehicle_stickers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES communities(id),
  household_id UUID NOT NULL REFERENCES households(id),
  member_id UUID REFERENCES household_members(id), -- Owner of vehicle
  vehicle_plate TEXT NOT NULL,
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_color TEXT,
  rfid_code TEXT, -- Assigned by gate system
  or_cr_document_url TEXT, -- Supabase Storage path for OR/CR upload
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

  CONSTRAINT unique_plate_per_tenant UNIQUE (tenant_id, vehicle_plate) WHERE deleted_at IS NULL,
  CONSTRAINT unique_rfid_per_tenant UNIQUE (tenant_id, rfid_code) WHERE rfid_code IS NOT NULL AND deleted_at IS NULL,
  CONSTRAINT rejection_requires_reason CHECK (status != 'rejected' OR rejection_reason IS NOT NULL),
  CONSTRAINT revocation_requires_reason CHECK (status != 'revoked' OR revocation_reason IS NOT NULL),
  CONSTRAINT approved_requires_expiry CHECK (status NOT IN ('approved', 'active', 'expiring') OR expiry_date IS NOT NULL)
);

CREATE INDEX idx_stickers_tenant ON vehicle_stickers(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_stickers_household ON vehicle_stickers(household_id);
CREATE INDEX idx_stickers_status ON vehicle_stickers(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_stickers_expiry ON vehicle_stickers(tenant_id, expiry_date) WHERE status IN ('active', 'expiring') AND deleted_at IS NULL;
```

**State Machine** (FR-015, FR-021):
- `requested` → `approved` (admin approval with expiry date)
- `approved` → `active` (first gate entry OR immediate if no gate integration)
- `active` → `expiring` (30 days before expiry_date - auto-transition via cron job)
- `expiring` → `expired` (past expiry_date - auto-transition via cron job)
- `expired` → `renewed` (resident submits new request, creates new sticker record)
- `requested` → `rejected` (admin rejection with reason)
- `active` → `revoked` (admin revocation with reason)

**Constraints**:
- FR-023: Unique vehicle plate per tenant
- FR-016: OR/CR document stored in Supabase Storage (`documents/{tenant_id}/or_cr/{sticker_id}.pdf`)

---

### 4. construction_permits

Represents home improvement permit requests managed by admins.

```sql
CREATE TABLE construction_permits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES communities(id),
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
```

**State Machine** (FR-025 to FR-032):
- `pending` → `approved` (admin approval with road_fee_amount - FR-034)
- `approved` → `in_progress` (construction begins)
- `in_progress` → `completed` (admin marks complete)
- `pending` → `rejected` (admin rejection with reason)

**Constraints**:
- FR-034: Cannot approve without road_fee_amount calculated

---

### 5. association_fees

Represents financial obligations tracked by admins.

```sql
CREATE TABLE association_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES communities(id),
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
  receipt_url TEXT, -- Supabase Storage path for PDF receipt
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
```

**State Machine** (FR-045, FR-050):
- `unpaid` → `paid` (full payment recorded - FR-047)
- `unpaid` → `partial` (partial payment recorded - FR-048)
- `partial` → `paid` (remaining payment recorded)
- `unpaid` → `overdue` (auto-transition when `due_date < CURRENT_DATE` via cron job)
- `overdue` → `paid` (payment recorded)
- `unpaid` → `waived` (admin waiver with reason - FR-053)
- `overdue` → `waived` (admin waiver with reason)

**Constraints**:
- FR-049: Receipt generated automatically via Edge Function trigger after payment
- FR-054: Optimistic locking via `updated_at` timestamp to prevent double-payment

---

### 6. announcements

Represents community communications created by admins.

```sql
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES communities(id),
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
  attachment_urls JSONB DEFAULT '[]'::jsonb, -- Array of Supabase Storage paths
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
```

**State Machine** (FR-035 to FR-041):
- `draft` → `scheduled` (admin sets publication_date)
- `scheduled` → `published` (auto-transition when `publication_date <= NOW()` via cron job OR admin publishes immediately)
- `draft` → `published` (admin publishes immediately)
- `published` → `expired` (auto-transition when `expiry_date <= NOW()` via cron job - FR-041)
- `expired` → `archived` (auto or manual archiving)

**Constraints**:
- FR-039: Attachments stored in Supabase Storage (`documents/{tenant_id}/announcements/{announcement_id}/`)
- FR-040: Analytics tracked via `view_count` and `click_count` (incremented by Edge Function)

---

### 7. gate_entries

Represents access logs from gate hardware integration (read-only for admins).

```sql
CREATE TABLE gate_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES communities(id),
  gate_id UUID NOT NULL REFERENCES gates(id),
  entry_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  entry_type TEXT NOT NULL CHECK (entry_type IN ('vehicle', 'pedestrian', 'delivery', 'visitor')),
  vehicle_plate TEXT,
  sticker_id UUID REFERENCES vehicle_stickers(id),
  household_id UUID REFERENCES households(id),
  security_officer_id UUID REFERENCES auth.users(id), -- Officer who processed entry
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gate_entries_tenant ON gate_entries(tenant_id);
CREATE INDEX idx_gate_entries_timestamp ON gate_entries(tenant_id, entry_timestamp DESC);
CREATE INDEX idx_gate_entries_gate ON gate_entries(gate_id, entry_timestamp DESC);
CREATE INDEX idx_gate_entries_household ON gate_entries(household_id) WHERE household_id IS NOT NULL;
CREATE INDEX idx_gate_entries_vehicle ON gate_entries(tenant_id, vehicle_plate) WHERE vehicle_plate IS NOT NULL;
```

**Notes**:
- FR-055 to FR-059: Gate monitoring dashboard queries
- Data inserted by gate hardware system or security mobile app
- No updates or deletes (immutable audit trail)
- Real-time subscriptions for live monitoring (FR-059: <5 seconds latency)

---

### 8. incident_reports

Represents security events filed by officers via mobile app (read-only for admins).

```sql
CREATE TABLE incident_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES communities(id),
  reported_by UUID NOT NULL REFERENCES auth.users(id), -- Security officer
  incident_timestamp TIMESTAMPTZ NOT NULL,
  incident_type TEXT NOT NULL CHECK (incident_type IN (
    'suspicious_activity', 'unauthorized_entry', 'disturbance', 'emergency', 'property_damage', 'other'
  )),
  location TEXT NOT NULL, -- Gate name or community area
  gate_id UUID REFERENCES gates(id),
  household_id UUID REFERENCES households(id), -- If incident involves specific household
  description TEXT NOT NULL,
  resolution_status TEXT NOT NULL DEFAULT 'open' CHECK (resolution_status IN ('open', 'investigating', 'resolved', 'closed')),
  resolution_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  attachment_urls JSONB DEFAULT '[]'::jsonb, -- Photos/videos from mobile app
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incidents_tenant ON incident_reports(tenant_id);
CREATE INDEX idx_incidents_timestamp ON incident_reports(tenant_id, incident_timestamp DESC);
CREATE INDEX idx_incidents_status ON incident_reports(tenant_id, resolution_status);
CREATE INDEX idx_incidents_household ON incident_reports(household_id) WHERE household_id IS NOT NULL;
```

**Notes**:
- FR-057: Admin view for monitoring security incidents
- Created by security officers via mobile app
- Admins can update `resolution_status` and `resolution_notes`

---

### 9. audit_logs

Tracks all admin actions for accountability.

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES communities(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL, -- e.g., 'create_household', 'approve_sticker', 'record_payment'
  entity_type TEXT NOT NULL, -- e.g., 'household', 'sticker', 'fee'
  entity_id UUID,
  changes JSONB, -- Before/after state for updates
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_timestamp ON audit_logs(tenant_id, created_at DESC);
```

**Notes**:
- FR-070: Comprehensive audit trail
- Logged automatically via database triggers or Edge Function middleware
- Immutable (no updates or deletes)
- Only accessible by admin_head and superadmin

---

## Row Level Security (RLS) Policies

All tables enable RLS with policies for multi-tenant isolation and role-based access.

### Standard Admin Access Pattern

```sql
-- Example for households table (apply similar pattern to all tables)

-- SELECT: Both admin_head and admin_officer can view
CREATE POLICY "admin_view_households" ON households
FOR SELECT
USING (
  (auth.jwt() ->> 'role') IN ('admin_head', 'admin_officer', 'superadmin')
  AND (
    tenant_id::TEXT = (auth.jwt() ->> 'tenant_id')
    OR (auth.jwt() ->> 'role') = 'superadmin'
  )
);

-- INSERT: Both roles can create households
CREATE POLICY "admin_create_households" ON households
FOR INSERT
WITH CHECK (
  (auth.jwt() ->> 'role') IN ('admin_head', 'admin_officer')
  AND tenant_id::TEXT = (auth.jwt() ->> 'tenant_id')
);

-- UPDATE: Both roles can edit, but move_out_date requires admin_head (FR-004)
CREATE POLICY "admin_update_households" ON households
FOR UPDATE
USING (
  (auth.jwt() ->> 'role') IN ('admin_head', 'admin_officer')
  AND tenant_id::TEXT = (auth.jwt() ->> 'tenant_id')
)
WITH CHECK (
  (
    (auth.jwt() ->> 'role') = 'admin_head'
    OR (OLD.move_out_date IS NOT DISTINCT FROM NEW.move_out_date) -- Officer cannot change move_out_date
  )
  AND tenant_id::TEXT = (auth.jwt() ->> 'tenant_id')
);

-- DELETE: Only admin_head can soft delete
CREATE POLICY "admin_delete_households" ON households
FOR UPDATE
USING (
  (auth.jwt() ->> 'role') IN ('admin_head', 'superadmin')
  AND tenant_id::TEXT = (auth.jwt() ->> 'tenant_id')
)
WITH CHECK (
  deleted_at IS NOT NULL -- Only allow setting deleted_at
);
```

### Role-Specific Policies (from research.md)

```sql
-- Association fees: Only admin_head can create
CREATE POLICY "admin_head_create_fees" ON association_fees
FOR INSERT
WITH CHECK (
  (auth.jwt() ->> 'role') IN ('admin_head', 'superadmin')
  AND tenant_id::TEXT = (auth.jwt() ->> 'tenant_id')
);

-- Sticker revocation: Only admin_head can revoke
CREATE POLICY "admin_head_revoke_stickers" ON vehicle_stickers
FOR UPDATE
USING (
  (auth.jwt() ->> 'role') IN ('admin_head', 'superadmin')
  AND tenant_id::TEXT = (auth.jwt() ->> 'tenant_id')
)
WITH CHECK (
  (
    (auth.jwt() ->> 'role') = 'admin_head'
    OR OLD.status != 'revoked' -- Officer cannot revoke
  )
);

-- Permit approval: Only admin_head can approve/reject
CREATE POLICY "admin_head_approve_permits" ON construction_permits
FOR UPDATE
USING (
  (auth.jwt() ->> 'role') IN ('admin_head', 'admin_officer', 'superadmin')
  AND tenant_id::TEXT = (auth.jwt() ->> 'tenant_id')
)
WITH CHECK (
  (
    (auth.jwt() ->> 'role') = 'admin_head'
    OR (OLD.status NOT IN ('pending') OR NEW.status NOT IN ('approved', 'rejected'))
  )
);

-- Audit logs: Only admin_head can view
CREATE POLICY "admin_head_view_audit_logs" ON audit_logs
FOR SELECT
USING (
  (auth.jwt() ->> 'role') IN ('admin_head', 'superadmin')
  AND (
    tenant_id::TEXT = (auth.jwt() ->> 'tenant_id')
    OR (auth.jwt() ->> 'role') = 'superadmin'
  )
);
```

---

## Database Views

### household_stats

Occupancy metrics for analytics dashboard (FR-061).

```sql
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
```

### sticker_dashboard

Sticker status distribution for queue management (FR-062).

```sql
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
```

### fee_summary

Payment collection metrics (FR-063).

```sql
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
```

### permit_queue

Active and pending permits (FR-033).

```sql
CREATE VIEW permit_queue AS
SELECT
  p.id,
  p.tenant_id,
  p.household_id,
  h.residence_id,
  r.unit_number,
  p.project_description,
  p.project_start_date,
  p.project_end_date,
  p.contractor_name,
  p.road_fee_amount,
  p.road_fee_paid,
  p.status,
  p.created_at,
  CURRENT_DATE - p.project_end_date AS days_overdue
FROM construction_permits p
JOIN households h ON h.id = p.household_id
JOIN residences r ON r.id = h.residence_id
WHERE p.status IN ('pending', 'approved', 'in_progress')
  AND p.deleted_at IS NULL;
```

### gate_activity

Entry patterns for security monitoring (FR-064).

```sql
CREATE VIEW gate_activity AS
SELECT
  ge.tenant_id,
  ge.gate_id,
  g.gate_name,
  DATE(ge.entry_timestamp) AS entry_date,
  EXTRACT(HOUR FROM ge.entry_timestamp) AS entry_hour,
  COUNT(*) AS entry_count,
  COUNT(*) FILTER (WHERE ge.entry_type = 'vehicle') AS vehicle_count,
  COUNT(*) FILTER (WHERE ge.entry_type = 'pedestrian') AS pedestrian_count,
  COUNT(*) FILTER (WHERE ge.entry_type = 'delivery') AS delivery_count,
  COUNT(*) FILTER (WHERE ge.entry_type = 'visitor') AS visitor_count
FROM gate_entries ge
JOIN gates g ON g.id = ge.gate_id
GROUP BY ge.tenant_id, ge.gate_id, g.gate_name, DATE(ge.entry_timestamp), EXTRACT(HOUR FROM ge.entry_timestamp);
```

---

## RPC Functions

### approve_sticker_bulk

Bulk approve multiple sticker requests (FR-019).

```sql
CREATE OR REPLACE FUNCTION approve_sticker_bulk(
  p_sticker_ids UUID[],
  p_expiry_date DATE DEFAULT CURRENT_DATE + INTERVAL '1 year'
)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id TEXT;
  v_approved_count INTEGER;
BEGIN
  -- Extract tenant_id from JWT
  v_tenant_id := auth.jwt() ->> 'tenant_id';

  -- Validate permissions (admin_head or superadmin)
  IF (auth.jwt() ->> 'role') NOT IN ('admin_head', 'superadmin') THEN
    RAISE EXCEPTION 'Insufficient permissions for bulk approval';
  END IF;

  -- Update stickers
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

  -- Log audit entry
  INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, changes)
  VALUES (
    v_tenant_id::UUID,
    auth.uid(),
    'bulk_approve_stickers',
    'vehicle_sticker',
    jsonb_build_object('sticker_ids', p_sticker_ids, 'count', v_approved_count, 'expiry_date', p_expiry_date)
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'approved_count', v_approved_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### record_fee_payment

Record payment and generate receipt (FR-046, FR-049).

```sql
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
  v_receipt_url TEXT;
BEGIN
  v_tenant_id := auth.jwt() ->> 'tenant_id';

  -- Lock fee record to prevent double-payment (FR-054)
  SELECT * INTO v_fee FROM association_fees
  WHERE id = p_fee_id AND tenant_id::TEXT = v_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fee not found';
  END IF;

  -- Calculate new status
  IF v_fee.paid_amount + p_amount >= v_fee.amount THEN
    v_new_status := 'paid';
  ELSE
    v_new_status := 'partial';
  END IF;

  -- Update fee
  UPDATE association_fees
  SET
    paid_amount = paid_amount + p_amount,
    payment_status = v_new_status,
    payment_date = p_payment_date,
    payment_method = p_payment_method,
    recorded_by = auth.uid(),
    updated_at = NOW()
  WHERE id = p_fee_id;

  -- Generate receipt via Edge Function (async)
  -- Edge Function will update receipt_url after generation

  -- Log audit entry
  INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id, changes)
  VALUES (
    v_tenant_id::UUID,
    auth.uid(),
    'record_fee_payment',
    'association_fee',
    p_fee_id,
    jsonb_build_object('amount', p_amount, 'new_status', v_new_status)
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'new_status', v_new_status,
    'total_paid', v_fee.paid_amount + p_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### revoke_sticker

Revoke active sticker with reason (FR-020).

```sql
CREATE OR REPLACE FUNCTION revoke_sticker(
  p_sticker_id UUID,
  p_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id TEXT;
BEGIN
  v_tenant_id := auth.jwt() ->> 'tenant_id';

  -- Validate permissions (admin_head only)
  IF (auth.jwt() ->> 'role') NOT IN ('admin_head', 'superadmin') THEN
    RAISE EXCEPTION 'Only admin_head can revoke stickers';
  END IF;

  -- Update sticker
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

  -- Log audit entry
  INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id, changes)
  VALUES (
    v_tenant_id::UUID,
    auth.uid(),
    'revoke_sticker',
    'vehicle_sticker',
    p_sticker_id,
    jsonb_build_object('reason', p_reason)
  );

  RETURN jsonb_build_object('success', TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Auto-Update Triggers

Standard `updated_at` trigger for all tables.

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_households_updated_at BEFORE UPDATE ON households
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_household_members_updated_at BEFORE UPDATE ON household_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicle_stickers_updated_at BEFORE UPDATE ON vehicle_stickers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_construction_permits_updated_at BEFORE UPDATE ON construction_permits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_association_fees_updated_at BEFORE UPDATE ON association_fees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incident_reports_updated_at BEFORE UPDATE ON incident_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## Scheduled Jobs (pg_cron)

### Daily: Sticker Expiry Status Update

Transition active stickers to expiring status 30 days before expiry (FR-021).

```sql
SELECT cron.schedule(
  'daily-sticker-expiry-check',
  '0 8 * * *', -- 8 AM daily
  $$
  UPDATE vehicle_stickers
  SET status = 'expiring', updated_at = NOW()
  WHERE status = 'active'
    AND expiry_date <= CURRENT_DATE + INTERVAL '30 days'
    AND expiry_date > CURRENT_DATE;

  UPDATE vehicle_stickers
  SET status = 'expired', updated_at = NOW()
  WHERE status IN ('active', 'expiring')
    AND expiry_date < CURRENT_DATE;
  $$
);
```

### Daily: Fee Overdue Status Update

Transition unpaid fees to overdue status after due date (FR-050).

```sql
SELECT cron.schedule(
  'daily-fee-overdue-check',
  '0 9 * * *', -- 9 AM daily
  $$
  UPDATE association_fees
  SET payment_status = 'overdue', updated_at = NOW()
  WHERE payment_status = 'unpaid'
    AND due_date < CURRENT_DATE;
  $$
);
```

### Hourly: Announcement Publication

Auto-publish scheduled announcements.

```sql
SELECT cron.schedule(
  'hourly-announcement-publish',
  '0 * * * *', -- Every hour
  $$
  UPDATE announcements
  SET status = 'published', published_at = NOW(), updated_at = NOW()
  WHERE status = 'scheduled'
    AND publication_date <= NOW();

  UPDATE announcements
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'published'
    AND expiry_date IS NOT NULL
    AND expiry_date <= NOW();
  $$
);
```

---

## Migration File Structure

```
supabase/migrations/
├── 20250109000001_admin_schema.sql      # Tables, indexes, constraints
├── 20250109000002_admin_rls.sql         # RLS policies
├── 20250109000003_admin_views.sql       # Views
├── 20250109000004_admin_functions.sql   # RPC functions
├── 20250109000005_admin_triggers.sql    # Triggers
└── 20250109000006_admin_cron.sql        # pg_cron jobs
```

---

## Summary

- **9 tables** defined with full schema (households, members, stickers, permits, fees, announcements, gate_entries, incidents, audit_logs)
- **RLS policies** enforce tenant isolation and role-based permissions (admin_head vs admin_officer)
- **5 views** for analytics and reporting
- **3 RPC functions** for complex operations (bulk approve, payment recording, revoke)
- **Auto-update triggers** for `updated_at` timestamps
- **3 pg_cron jobs** for state machine transitions
- **State machines** explicitly defined for 4 entities (stickers, permits, fees, announcements)

**Next Step**: Generate API contracts (contracts/) and quickstart guide.
