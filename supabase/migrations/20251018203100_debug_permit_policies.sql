-- Drop existing policies to recreate them with simplified logic
DROP POLICY IF EXISTS "resident_view_own_permits" ON construction_permits;
DROP POLICY IF EXISTS "resident_create_own_permits" ON construction_permits;

-- Add simplified resident policies
-- Resident can create construction permits for their household
CREATE POLICY "resident_create_own_permits" ON construction_permits
FOR INSERT
WITH CHECK (
  tenant_id::TEXT = (auth.jwt() ->> 'tenant_id')
  AND household_id IN (
    SELECT household_id FROM household_members
    WHERE user_id = auth.uid() AND status = 'active'
  )
  AND status = 'pending'
);

-- Resident can view construction permits for their household
CREATE POLICY "resident_view_own_permits" ON construction_permits
FOR SELECT
USING (
  tenant_id::TEXT = (auth.jwt() ->> 'tenant_id')
  AND household_id IN (
    SELECT household_id FROM household_members
    WHERE user_id = auth.uid() AND status = 'active'
  )
);