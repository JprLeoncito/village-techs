-- Fix: Add missing RLS policy for household members to read announcements
-- This migration addresses the issue where residents cannot see announcements
-- because only admin users had permission to read the announcements table

-- Policy to allow household members to read announcements
CREATE POLICY "household_members_read_announcements" ON announcements
FOR SELECT
USING (
  -- Allow household members to read announcements from their tenant/community
  EXISTS (
    SELECT 1 FROM household_members hm
    JOIN households h ON hm.household_id = h.id
    WHERE hm.user_id = auth.uid()
    AND h.tenant_id = announcements.tenant_id
    AND h.status = 'active'
    AND hm.status = 'active'
    AND h.deleted_at IS NULL
  )
  -- Only show announcements that are:
  AND (
    announcements.target_audience = 'all' -- Targeted to everyone
    OR announcements.target_audience = 'households' -- Targeted to households
  )
  AND announcements.status = 'published' -- Only published announcements
  AND (
    announcements.expiry_date IS NULL -- Not expired
    OR announcements.expiry_date > NOW() -- Or expiry date is in the future
  )
  AND (
    announcements.publication_date IS NULL -- Immediate publication
    OR announcements.publication_date <= NOW() -- Or publication date has passed
  )
);

-- Comment explaining the policy
COMMENT ON POLICY "household_members_read_announcements" ON announcements IS 'Allows active household members to read published announcements from their community';