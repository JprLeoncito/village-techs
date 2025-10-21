-- Add RLS policies for Realtime subscriptions
-- These policies allow WebSocket connections to listen for real-time changes

-- Enable realtime for household members
ALTER PUBLICATION supabase_realtime ADD TABLE household_members;

-- Enable realtime for vehicle stickers
ALTER PUBLICATION supabase_realtime ADD TABLE vehicle_stickers;

-- Enable realtime for users table (for auth state changes)
ALTER PUBLICATION supabase_realtime ADD TABLE auth.users;

-- Add specific Realtime RLS policy for scheduled_guests
CREATE POLICY "Enable realtime for scheduled_guests" ON scheduled_guests
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::UUID
    AND household_id = (
      SELECT h.id FROM households h
      JOIN household_members hm ON hm.household_id = h.id
      WHERE hm.user_id = auth.uid()
      AND hm.tenant_id = (auth.jwt() ->> 'tenant_id')::UUID
      AND hm.status = 'active'
    )
  );

-- Add specific Realtime RLS policy for household_members
CREATE POLICY "Enable realtime for household_members" ON household_members
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::UUID
    AND user_id = auth.uid()
    AND status = 'active'
  );

-- Add specific Realtime RLS policy for vehicle_stickers
CREATE POLICY "Enable realtime for vehicle_stickers" ON vehicle_stickers
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::UUID
    AND household_id = (
      SELECT h.id FROM households h
      JOIN household_members hm ON hm.household_id = h.id
      WHERE hm.user_id = auth.uid()
      AND hm.tenant_id = (auth.jwt() ->> 'tenant_id')::UUID
      AND hm.status = 'active'
    )
  );