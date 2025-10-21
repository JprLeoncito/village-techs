-- Fix association fees RLS policy to use proper household-tenant relationship
-- The current policy directly compares tenant_id between admin_users and association_fees
-- but association fees belong to households, and households belong to tenants

-- Drop the existing incorrect policies
DROP POLICY IF EXISTS "admin_view_fees" ON association_fees;
DROP POLICY IF EXISTS "admin_head_create_fees" ON association_fees;
DROP POLICY IF EXISTS "admin_record_payment" ON association_fees;

-- Create corrected RLS policies using household-tenant relationship
CREATE POLICY "admin_view_fees" ON association_fees
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_users au
    JOIN households h ON h.tenant_id = au.tenant_id
    WHERE au.id = auth.uid()
    AND h.id = association_fees.household_id
    AND au.status = 'active'
  )
);

CREATE POLICY "admin_head_create_fees" ON association_fees
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users au
    JOIN households h ON h.tenant_id = au.tenant_id
    WHERE au.id = auth.uid()
    AND h.id = association_fees.household_id
    AND au.status = 'active'
    AND au.role = 'admin_head'
  )
);

CREATE POLICY "admin_record_payment" ON association_fees
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM admin_users au
    JOIN households h ON h.tenant_id = au.tenant_id
    WHERE au.id = auth.uid()
    AND h.id = association_fees.household_id
    AND au.status = 'active'
    AND au.role IN ('admin_head', 'admin_officer')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users au
    JOIN households h ON h.tenant_id = au.tenant_id
    WHERE au.id = auth.uid()
    AND h.id = association_fees.household_id
    AND au.status = 'active'
    AND au.role IN ('admin_head', 'admin_officer')
  )
);

-- Add comment
COMMENT ON POLICY "admin_view_fees" ON association_fees IS 'Allows admins to view fees for households in their tenant through proper household-tenant relationship';