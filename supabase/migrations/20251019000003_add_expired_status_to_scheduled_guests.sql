-- Add 'expired' status to scheduled_guests table
-- This will distinguish between guests who checked out normally vs those who missed their visit

-- First, drop the existing CHECK constraint
ALTER TABLE scheduled_guests DROP CONSTRAINT IF EXISTS scheduled_guests_status_check;

-- Add the new CHECK constraint that includes 'expired'
ALTER TABLE scheduled_guests
ADD CONSTRAINT scheduled_guests_status_check
CHECK (status IN ('scheduled', 'checked_in', 'checked_out', 'cancelled', 'expired'));

-- Add expired_at timestamp field
ALTER TABLE scheduled_guests
ADD COLUMN expired_at TIMESTAMPTZ;

-- Update existing indexes to include expired status
DROP INDEX IF EXISTS idx_scheduled_guests_status;
CREATE INDEX idx_scheduled_guests_status ON scheduled_guests(tenant_id, status);

-- Update security policies to include expired guests
DROP POLICY IF EXISTS "Security can view active guests" ON scheduled_guests;
CREATE POLICY "Security can view active guests" ON scheduled_guests
  FOR SELECT
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::UUID
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'security'
    AND status IN ('scheduled', 'checked_in', 'expired')
  );

-- Add comment
COMMENT ON COLUMN scheduled_guests.expired_at IS 'Timestamp when a scheduled guest expired (missed their visit)';
COMMENT ON COLUMN scheduled_guests.status IS 'Guest status: scheduled, checked_in, checked_out, cancelled, or expired (missed visit)';