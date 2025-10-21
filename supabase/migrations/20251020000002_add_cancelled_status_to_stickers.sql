-- Add 'cancelled' status to vehicle_stickers status check constraint
-- This allows residents to cancel their own sticker requests

ALTER TABLE vehicle_stickers
DROP CONSTRAINT vehicle_stickers_status_check;

ALTER TABLE vehicle_stickers
ADD CONSTRAINT vehicle_stickers_status_check
CHECK (status IN (
  'requested', 'approved', 'active', 'expiring', 'expired', 'rejected', 'revoked', 'cancelled'
));