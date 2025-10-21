-- =========================================
-- RESIDENT RLS POLICY FOR HOUSEHOLDS
-- =========================================
-- This migration adds missing resident access policy for households table
-- Residents should be able to view their own household through household_members relationship

-- =========================================
-- RESIDENT VIEW OWN HOUSEHOLD POLICY
-- =========================================
-- Residents can view their own household through household_members relationship

CREATE POLICY "residents_view_own_household" ON households
FOR SELECT
USING (
  id IN (
    SELECT household_id
    FROM household_members
    WHERE contact_email = auth.email()
    OR user_id = auth.uid()
  )
);

-- =========================================
-- ENSURE RLS IS ENABLED
-- =========================================
-- Make sure RLS is enabled on households

ALTER TABLE households ENABLE ROW LEVEL SECURITY;