-- =========================================
-- ADD MISSING INSERT POLICY FOR RESIDENCES
-- Fix for issue where admin_head cannot create residences
-- =========================================

-- Add INSERT policy for admin_head users to create residences
CREATE POLICY "admin_insert_residences" ON residences
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.id = auth.uid()
    AND admin_users.tenant_id = residences.tenant_id
    AND admin_users.status = 'active'
    AND admin_users.role = 'admin_head'
  )
);