# Data Model: Multi-Tenant Management Platform

**Feature**: 001-multi-tenant-management
**Date**: 2025-10-09
**Phase**: 1 (Design & Contracts)

## Overview

This document defines the database schema, entities, relationships, and Row-Level Security policies for the Platform Dashboard. All tables follow constitution standards: UUID primary keys, timestamps with auto-update triggers, tenant_id for multi-tenancy, and RLS policies for security.

## Entity Relationship Diagram

```
┌─────────────────────┐
│  subscription_plans │
└──────────┬──────────┘
           │
           │ 1:N
           ▼
┌─────────────────────┐         1:N        ┌──────────────┐
│    communities      │◄────────────────────│  residences  │
│  (main tenant table)│                     └──────────────┘
└──────────┬──────────┘
           │ 1:N                            ┌──────────────┐
           ├─────────────────────────────────│    gates     │
           │                                 └──────────────┘
           │ 1:N
           ├─────────────────────────────────│  admin_users │
           │                                 └──────────────┘
           │
           │ N:1
           ▼
┌─────────────────────┐
│    audit_logs       │
└─────────────────────┘
```

## Core Tables

### 1. communities (Main Tenant Table)

Primary table representing residential communities (tenants).

**Schema:**
```sql
CREATE TABLE communities (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Information
  name TEXT NOT NULL CHECK (length(name) >= 3),
  location TEXT NOT NULL,
  contact_email TEXT NOT NULL CHECK (contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}$'),
  contact_phone TEXT NOT NULL,

  -- Subscription
  subscription_plan_id UUID NOT NULL REFERENCES subscription_plans(id),

  -- Regional Settings (JSONB for flexibility)
  regional_settings JSONB NOT NULL DEFAULT '{
    "timezone": "UTC",
    "currency": "USD",
    "language": "en"
  }'::jsonb,

  -- Logo
  logo_url TEXT,

  -- Status & Lifecycle
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  deleted_at TIMESTAMPTZ, -- Soft delete

  -- Timestamps (per constitution)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_communities_status ON communities(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_communities_subscription ON communities(subscription_plan_id);
CREATE INDEX idx_communities_created ON communities(created_at DESC);

-- Auto-update trigger for updated_at
CREATE TRIGGER update_communities_updated_at
  BEFORE UPDATE ON communities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE communities IS 'Residential communities (tenants) managed by superadmin';
COMMENT ON COLUMN communities.regional_settings IS 'JSONB: { timezone: string, currency: string, language: string }';
COMMENT ON COLUMN communities.deleted_at IS 'Soft delete timestamp. Null = active, set = deleted';
```

**Validation Rules:**
- Name: Minimum 3 characters
- Email: Valid email format (regex)
- Status: Enum constraint (active/suspended/deleted)
- Regional settings: Required JSONB with timezone, currency, language

**State Machine:**
- Initial: `active` (on creation)
- Transitions:
  - `active` → `suspended` (manual superadmin action)
  - `suspended` → `active` (reactivate)
  - `active` → `deleted` (soft delete, sets deleted_at)
  - `suspended` → `deleted` (soft delete)
- Final: `deleted` (irreversible without manual DB update)

---

### 2. residences

Housing units within a community.

**Schema:**
```sql
CREATE TABLE residences (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant Reference (per constitution)
  tenant_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,

  -- Residence Information
  unit_number TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('single_family', 'townhouse', 'condo', 'apartment')),
  max_occupancy INTEGER NOT NULL CHECK (max_occupancy > 0 AND max_occupancy <= 20),
  lot_area NUMERIC(10,2) CHECK (lot_area >= 0),     -- Square meters, nullable for condos
  floor_area NUMERIC(10,2) NOT NULL CHECK (floor_area > 0),  -- Square meters

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: one unit_number per community
  CONSTRAINT unique_unit_per_community UNIQUE (tenant_id, unit_number)
);

-- Indexes
CREATE INDEX idx_residences_tenant ON residences(tenant_id);
CREATE INDEX idx_residences_type ON residences(type);
CREATE INDEX idx_residences_unit_number ON residences(tenant_id, unit_number);

-- Trigger
CREATE TRIGGER update_residences_updated_at
  BEFORE UPDATE ON residences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE residences IS 'Housing units within a community';
COMMENT ON COLUMN residences.lot_area IS 'Lot area in square meters. Nullable for condos without individual lots';
COMMENT ON COLUMN residences.unit_number IS 'Unit identifier (e.g., "101", "A-205"). Unique per community';
```

**Validation Rules:**
- Unit number: Unique within tenant (UNIQUE constraint)
- Type: Enum (single_family, townhouse, condo, apartment)
- Max occupancy: Between 1 and 20
- Lot area: Non-negative or null
- Floor area: Must be positive

---

### 3. gates

Community entrance/exit access points.

**Schema:**
```sql
CREATE TABLE gates (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant Reference
  tenant_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,

  -- Gate Information
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('vehicle', 'pedestrian', 'service', 'delivery')),

  -- Operating Hours (JSONB for flexibility)
  operating_hours JSONB NOT NULL DEFAULT '{"24/7": true}'::jsonb,
  -- Format: {"24/7": true} OR {"open": "06:00", "close": "22:00"}

  -- GPS Location
  latitude NUMERIC(10,8) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude NUMERIC(11,8) NOT NULL CHECK (longitude BETWEEN -180 AND 180),

  -- Hardware Integration Settings (JSONB)
  hardware_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Format: {"rfid_reader": {...}, "camera": {...}}

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_gates_tenant ON gates(tenant_id);
CREATE INDEX idx_gates_type ON gates(type);
CREATE INDEX idx_gates_location ON gates USING gist(ll_to_earth(latitude, longitude)); -- Spatial index

-- Trigger
CREATE TRIGGER update_gates_updated_at
  BEFORE UPDATE ON gates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE gates IS 'Community entrance/exit access points';
COMMENT ON COLUMN gates.operating_hours IS 'JSONB: {"24/7": true} OR {"open": "HH:MM", "close": "HH:MM"}';
COMMENT ON COLUMN gates.hardware_settings IS 'JSONB: Hardware integration config for RFID readers, cameras';
```

**Validation Rules:**
- Type: Enum (vehicle, pedestrian, service, delivery)
- Latitude: -90 to 90 (decimal degrees)
- Longitude: -180 to 180 (decimal degrees)
- Operating hours: JSONB format (24/7 flag or open/close times)

**Special Cases:**
- Midnight spanning: Operating hours with close < open (e.g., open: "20:00", close: "06:00") handled in application logic
- GPS validation: Coordinate bounds checked via CHECK constraints + Edge Function for geocoding

---

### 4. admin_users

Community administrators (extends auth.users).

**Schema:**
```sql
CREATE TABLE admin_users (
  -- Primary Key (links to auth.users)
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Tenant Reference
  tenant_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,

  -- User Information
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin_head', 'admin_officer')),

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deactivated')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_admin_users_tenant ON admin_users(tenant_id);
CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_admin_users_status ON admin_users(status);

-- Trigger
CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE admin_users IS 'Community administrators. Extends auth.users table';
COMMENT ON COLUMN admin_users.id IS 'References auth.users.id. User auth handled by Supabase Auth';
COMMENT ON COLUMN admin_users.role IS 'admin_head = primary, admin_officer = supporting';
```

**Validation Rules:**
- Email: Unique across all admin users
- Role: Enum (admin_head, admin_officer)
- Status: Enum (active, deactivated)

**State Machine:**
- Initial: `active` (on creation)
- Transitions:
  - `active` → `deactivated` (manual deactivation)
  - `deactivated` → `active` (reactivate)

**Auth Integration:**
- Password managed in `auth.users` table (Supabase Auth)
- JWT contains: `user_id`, `role` (admin_head/admin_officer), `tenant_id`
- Superadmin JWT contains: `role: 'superadmin'`, no `tenant_id`

---

### 5. subscription_plans

Reference table for billing plans.

**Schema:**
```sql
CREATE TABLE subscription_plans (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Plan Information
  name TEXT NOT NULL UNIQUE,
  description TEXT,

  -- Features (JSONB for flexibility)
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Format: ["max_residences:1000", "max_gates:10", "analytics:true"]

  -- Pricing
  pricing NUMERIC(10,2) NOT NULL CHECK (pricing >= 0),
  renewal_period TEXT NOT NULL CHECK (renewal_period IN ('monthly', 'yearly')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_subscription_plans_name ON subscription_plans(name);

-- Seed Data
INSERT INTO subscription_plans (name, features, pricing, renewal_period) VALUES
('Starter', '["max_residences:100", "max_gates:2"]'::jsonb, 99.00, 'monthly'),
('Professional', '["max_residences:500", "max_gates:5", "analytics:true"]'::jsonb, 299.00, 'monthly'),
('Enterprise', '["max_residences:unlimited", "max_gates:unlimited", "analytics:true", "api_access:true"]'::jsonb, 999.00, 'monthly');
```

**Validation Rules:**
- Name: Unique
- Pricing: Non-negative
- Renewal period: Enum (monthly, yearly)

---

### 6. audit_logs

Audit trail for superadmin actions.

**Schema:**
```sql
CREATE TABLE audit_logs (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Actor
  superadmin_id UUID NOT NULL REFERENCES auth.users(id),

  -- Action Details
  action_type TEXT NOT NULL, -- create, update, delete, suspend, reactivate, etc.
  entity_type TEXT NOT NULL, -- community, residence, gate, admin_user
  entity_id UUID NOT NULL,   -- ID of affected entity

  -- Change Tracking (JSONB)
  changes JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Format: {"before": {...}, "after": {...}}

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_audit_logs_superadmin ON audit_logs(superadmin_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- Comments
COMMENT ON TABLE audit_logs IS 'Audit trail of all superadmin actions';
COMMENT ON COLUMN audit_logs.changes IS 'JSONB: { before: {...}, after: {...} } for update actions';
```

**Audit Trigger Example:**
```sql
CREATE OR REPLACE FUNCTION audit_community_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (superadmin_id, action_type, entity_type, entity_id, changes)
    VALUES (
      (auth.jwt() ->> 'sub')::uuid,
      'update',
      'community',
      NEW.id,
      jsonb_build_object('before', row_to_json(OLD), 'after', row_to_json(NEW))
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (superadmin_id, action_type, entity_type, entity_id, changes)
    VALUES (
      (auth.jwt() ->> 'sub')::uuid,
      'delete',
      'community',
      OLD.id,
      jsonb_build_object('before', row_to_json(OLD))
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_communities
AFTER UPDATE OR DELETE ON communities
FOR EACH ROW EXECUTE FUNCTION audit_community_changes();
```

---

## Row-Level Security (RLS) Policies

### Superadmin Full Access

All tables have superadmin bypass policy:

```sql
-- Communities
CREATE POLICY "superadmin_full_access" ON communities
FOR ALL USING ((auth.jwt() ->> 'role') = 'superadmin');

-- Residences
CREATE POLICY "superadmin_full_access" ON residences
FOR ALL USING ((auth.jwt() ->> 'role') = 'superadmin');

-- Gates
CREATE POLICY "superadmin_full_access" ON gates
FOR ALL USING ((auth.jwt() ->> 'role') = 'superadmin');

-- Admin Users
CREATE POLICY "superadmin_full_access" ON admin_users
FOR ALL USING ((auth.jwt() ->> 'role') = 'superadmin');

-- Subscription Plans (read-only for all authenticated users)
CREATE POLICY "authenticated_read" ON subscription_plans
FOR SELECT USING (auth.role() = 'authenticated');

-- Audit Logs (superadmin read-only)
CREATE POLICY "superadmin_read" ON audit_logs
FOR SELECT USING ((auth.jwt() ->> 'role') = 'superadmin');
```

### Future Admin Tenant-Scoped Policies

For HOA admin app (future implementation):

```sql
-- Admin sees only their tenant
CREATE POLICY "admin_tenant_access" ON communities
FOR SELECT USING (
  id::TEXT = (auth.jwt() ->> 'tenant_id')
  AND (auth.jwt() ->> 'role') IN ('admin_head', 'admin_officer')
);

CREATE POLICY "admin_tenant_residences" ON residences
FOR ALL USING (
  tenant_id::TEXT = (auth.jwt() ->> 'tenant_id')
  AND (auth.jwt() ->> 'role') IN ('admin_head', 'admin_officer')
);
```

---

## Views for Analytics

### community_stats (Platform Analytics)

```sql
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

-- Usage: SELECT * FROM community_stats;
```

### admin_users_with_community

```sql
CREATE VIEW admin_users_with_community AS
SELECT
  au.*,
  c.name as community_name,
  c.status as community_status
FROM admin_users au
JOIN communities c ON au.tenant_id = c.id;

-- Usage: SELECT * FROM admin_users_with_community WHERE tenant_id = 'xxx';
```

---

## Database Functions

### suspend_community (RPC)

```sql
CREATE OR REPLACE FUNCTION suspend_community(community_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Verify caller is superadmin
  IF (auth.jwt() ->> 'role') != 'superadmin' THEN
    RAISE EXCEPTION 'Unauthorized: Only superadmin can suspend communities';
  END IF;

  -- Update community status
  UPDATE communities
  SET status = 'suspended', updated_at = NOW()
  WHERE id = community_id AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Community not found or already suspended';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Usage: SELECT suspend_community('community-uuid-here');
```

### reactivate_community (RPC)

```sql
CREATE OR REPLACE FUNCTION reactivate_community(community_id UUID)
RETURNS VOID AS $$
BEGIN
  IF (auth.jwt() ->> 'role') != 'superadmin' THEN
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
```

---

## Migration File

All schemas above will be in:
```
supabase/migrations/20250109000000_init_platform.sql
```

Includes:
1. Table creation (communities, residences, gates, admin_users, subscription_plans, audit_logs)
2. Indexes for performance
3. Triggers for updated_at and audit logging
4. RLS policies for superadmin access
5. Views for analytics
6. RPC functions for community lifecycle

---

## Type Generation

After migration, generate TypeScript types:

```bash
supabase gen types typescript --local > apps/platform-dashboard/src/types/database.types.ts
```

This creates:
```typescript
export type Database = {
  public: {
    Tables: {
      communities: {
        Row: { id: string, name: string, ... }
        Insert: { name: string, ... }
        Update: { name?: string, ... }
      }
      // ... other tables
    }
  }
}
```

**Next Phase**: Generate API contracts and quickstart guide
