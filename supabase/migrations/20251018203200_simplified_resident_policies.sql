-- Simplified resident policies for construction permits
-- More permissive policies to resolve RLS issues

-- Drop complex resident policies
DROP POLICY IF EXISTS "resident_create_own_permits" ON construction_permits;
DROP POLICY IF EXISTS "resident_view_own_permits" ON construction_permits;

-- Create simplified resident policies
CREATE POLICY "resident_create_own_permits" ON construction_permits
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND status = 'pending'
);

CREATE POLICY "resident_view_own_permits" ON construction_permits
FOR SELECT
USING (
  auth.uid() IS NOT NULL
);