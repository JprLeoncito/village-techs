-- =========================================
-- RESIDENT RLS POLICIES FOR VEHICLE STICKERS
-- =========================================
-- This migration adds missing resident access policies for vehicle_stickers table
-- Residents should be able to view, create, and update their own stickers

-- =========================================
-- RESIDENT VIEW OWN STICKERS POLICY
-- =========================================
-- Residents can view stickers from their own household through household_members relationship

CREATE POLICY "residents_view_own_stickers" ON vehicle_stickers
FOR SELECT
USING (
  household_id IN (
    SELECT household_id
    FROM household_members
    WHERE contact_email = auth.email()
    OR user_id = auth.uid()
  )
);

-- =========================================
-- RESIDENT CREATE STICKERS POLICY
-- =========================================
-- Residents can create stickers for their own household

CREATE POLICY "residents_create_stickers" ON vehicle_stickers
FOR INSERT
WITH CHECK (
  household_id IN (
    SELECT household_id
    FROM household_members
    WHERE contact_email = auth.email()
    OR user_id = auth.uid()
  )
  AND tenant_id IN (
    SELECT tenant_id
    FROM households
    WHERE id = household_id
  )
);

-- =========================================
-- RESIDENT UPDATE OWN STICKERS POLICY
-- =========================================
-- Residents can update their own stickers (limited to certain operations)

CREATE POLICY "residents_update_own_stickers" ON vehicle_stickers
FOR UPDATE
USING (
  household_id IN (
    SELECT household_id
    FROM household_members
    WHERE contact_email = auth.email()
    OR user_id = auth.uid()
  )
)
WITH CHECK (
  household_id IN (
    SELECT household_id
    FROM household_members
    WHERE contact_email = auth.email()
    OR user_id = auth.uid()
  )
  AND -- Only allow limited field updates (status changes for cancellation, etc.)
  (
    -- Allow updating specific fields for residents
    (status = 'cancelled' AND rejection_reason IS NOT NULL) OR
    -- Allow basic info updates before approval
    (status IN ('requested', 'pending') AND
     vehicle_make IS NOT NULL AND
     vehicle_model IS NOT NULL AND
     vehicle_color IS NOT NULL AND
     vehicle_plate IS NOT NULL)
  )
);

-- =========================================
-- ENSURE RLS IS ENABLED
-- =========================================
-- Make sure RLS is enabled on vehicle_stickers

ALTER TABLE vehicle_stickers ENABLE ROW LEVEL SECURITY;